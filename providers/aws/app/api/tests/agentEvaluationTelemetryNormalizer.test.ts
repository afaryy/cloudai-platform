import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  AgentEvaluationTelemetryError,
  normalizeEvaluationTelemetry
} from "../src/evals/agentEvaluationTelemetryNormalizer.js";
import type {
  NormalizedEvaluationSession,
  TelemetryFixture
} from "../src/evals/agentEvaluationTelemetryTypes.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agent-evaluation-telemetry");

test("OpenTelemetry GenAI and OpenInference normalize to the same cited-answer trajectory", async () => {
  const [otel, openInference] = await Promise.all([
    loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer"),
    loadFixture("openinference.traces.v1.json", "synthetic-cited-answer")
  ]);

  const normalizedOtel = normalizeEvaluationTelemetry(otel);
  const normalizedOpenInference = normalizeEvaluationTelemetry(openInference);

  assert.deepEqual(summarize(normalizedOtel), summarize(normalizedOpenInference));
  assert.deepEqual(summarize(normalizedOtel), {
    scenarioId: "synthetic-cited-answer",
    turnCount: 1,
    prompt: "Which controls protect the synthetic platform?",
    response: "Governed access protects the synthetic platform [source:platform-handbook].",
    toolTrajectory: [
      {
        name: "knowledge_search",
        arguments: { source: "platform-handbook" },
        status: "succeeded"
      }
    ],
    responseAvailable: true
  });
});

test("normalizer rejects a custom scope outside the two generic compatibility prefixes", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  fixture.spans[0]!.scopeName = "custom.agent.tracing";

  assertTelemetryError(() => normalizeEvaluationTelemetry(fixture), "invalid_instrumentation_scope");
});

test("normalizer rejects a fixture without session identity", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  for (const span of fixture.spans) {
    delete span.attributes["session.id"];
  }

  assertTelemetryError(() => normalizeEvaluationTelemetry(fixture), "missing_session_id");
});

test("normalizer rejects conflicting session identities", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  fixture.spans[1]!.attributes["session.id"] = "session_conflict";

  assertTelemetryError(() => normalizeEvaluationTelemetry(fixture), "conflicting_session_id");
});

test("normalizer rejects a trace without an invoke-agent span", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  fixture.spans = fixture.spans.filter((span) => span.attributes["gen_ai.operation.name"] !== "invoke_agent");

  assertTelemetryError(() => normalizeEvaluationTelemetry(fixture), "missing_invoke_agent_span");
});

test("normalizer rejects malformed tool arguments", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  const toolSpan = fixture.spans.find((span) => span.attributes["gen_ai.operation.name"] === "execute_tool");
  assert.ok(toolSpan);
  toolSpan.attributes["gen_ai.tool.call.arguments"] = "{not-json";

  assertTelemetryError(() => normalizeEvaluationTelemetry(fixture), "malformed_tool_arguments");
});

test("normalizer rejects duplicate tool-call correlation IDs", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  const toolSpan = fixture.spans.find((span) => span.attributes["gen_ai.operation.name"] === "execute_tool");
  assert.ok(toolSpan);
  fixture.spans.push({
    ...structuredClone(toolSpan),
    spanId: "span_synthetic_cited_answer_duplicate_tool",
    startTimeUnixNano: "1787918400000000300"
  });

  assertTelemetryError(() => normalizeEvaluationTelemetry(fixture), "duplicate_tool_call_id");
});

test("normalizer ignores unfamiliar contextual spans under a recognized scope", async () => {
  const fixture = await loadFixture("otel-genai.traces.v1.json", "synthetic-cited-answer");
  fixture.spans.push({
    scopeName: "opentelemetry.instrumentation.cloudai.synthetic",
    traceId: fixture.spans[0]!.traceId,
    spanId: "span_synthetic_cited_answer_retriever",
    parentSpanId: fixture.spans[0]!.spanId,
    startTimeUnixNano: "1787918400000000150",
    attributes: {
      "session.id": "session_synthetic_cited_answer_otel",
      "gen_ai.operation.name": "retrieval"
    }
  });

  const normalized = normalizeEvaluationTelemetry(fixture);

  assert.equal(normalized.ignoredContextSpanCount, 1);
  assert.equal(normalized.turns[0]!.toolCalls.length, 1);
});

async function loadFixture(fileName: string, scenarioId: string): Promise<TelemetryFixture> {
  const fixtures = JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8")) as TelemetryFixture[];
  const fixture = fixtures.find((candidate) => candidate.scenarioId === scenarioId);
  assert.ok(fixture);
  return structuredClone(fixture);
}

function summarize(session: NormalizedEvaluationSession) {
  const turn = session.turns[0]!;
  return {
    scenarioId: session.scenarioId,
    turnCount: session.turns.length,
    prompt: turn.prompt,
    response: turn.response,
    toolTrajectory: turn.toolCalls.map((toolCall) => ({
      name: toolCall.name,
      arguments: toolCall.arguments,
      status: toolCall.status
    })),
    responseAvailable: turn.response.length > 0
  };
}

function assertTelemetryError(operation: () => unknown, code: AgentEvaluationTelemetryError["code"]): void {
  assert.throws(operation, (error: unknown) =>
    error instanceof AgentEvaluationTelemetryError && error.code === code);
}
