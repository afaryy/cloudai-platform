import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildProviderEvaluationRequests,
  deriveProviderIds
} from "../src/evals/agentCoreEvaluationRequestBuilder.js";
import { ProviderParityError } from "../src/evals/agentCoreEvaluationProviderTypes.js";
import type {
  ProviderEvaluationRequest,
  ProviderParityPolicy
} from "../src/evals/agentCoreEvaluationProviderTypes.js";
import type {
  EvaluationScenario,
  TelemetryFixture
} from "../src/evals/agentEvaluationTelemetryTypes.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agent-evaluation-telemetry");

test("builds equivalent deterministic direct-span requests for both cited-answer conventions", async () => {
  const { otel, openInference, scenario, policy } = await loadInputs();
  const otelRequests = buildProviderEvaluationRequests(otel, scenario, policy);
  const openInferenceRequests = buildProviderEvaluationRequests(openInference, scenario, policy);

  assert.equal(otelRequests.length, 3);
  assert.equal(openInferenceRequests.length, 3);
  assert.deepEqual(otelRequests.map((request) => request.evaluatorId), [
    "Builtin.Correctness",
    "Builtin.ToolSelectionAccuracy",
    "Builtin.GoalSuccessRate"
  ]);
  assert.deepEqual(summarizeSemantics(otelRequests), summarizeSemantics(openInferenceRequests));

  for (const [fixture, requests] of [[otel, otelRequests], [openInference, openInferenceRequests]] as const) {
    const spans = requests[0]!.evaluationInput.sessionSpans as ProviderSpan[];
    const ids = deriveProviderIds(fixture.scenarioId, fixture.convention, fixture.spans.map((span) => span.spanId));
    assert.match(ids.traceId, /^[0-9a-f]{32}$/);
    assert.deepEqual(Object.values(ids.spanIds).sort(), [...new Set(Object.values(ids.spanIds))].sort());

    const spanIds = new Set(spans.map((span) => span.spanId));
    for (const [index, span] of spans.entries()) {
      const source = fixture.spans[index]!;
      assert.match(span.traceId, /^[0-9a-f]{32}$/);
      assert.match(span.spanId, /^[0-9a-f]{16}$/);
      if (span.parentSpanId) assert.ok(spanIds.has(span.parentSpanId));
      assert.equal(span.attributes["session.id"], fixture.spans[0]!.attributes["session.id"]);
      assert.ok(span.scope.name.startsWith(fixture.convention === "otel-genai"
        ? "opentelemetry.instrumentation."
        : "openinference.instrumentation."));
      assert.equal(span.scope.version, "1.0.0");
      assert.deepEqual(span.resource, {
        attributes: {
          "service.name": "cloudai-provider-parity-synthetic",
          "cloudai.data.scope": "synthetic-only"
        }
      });
      assert.deepEqual(span.status, { code: 1 });
      assert.equal(span.endTimeUnixNano, (BigInt(source.startTimeUnixNano) + 1n).toString());
    }
  }
});

test("uses evaluator-specific direct-span targets and reference contexts", async () => {
  const { otel, scenario, policy } = await loadInputs();
  const [correctness, toolSelection, goalSuccess] = buildProviderEvaluationRequests(otel, scenario, policy);
  const spans = correctness!.evaluationInput.sessionSpans as ProviderSpan[];
  const generatedTraceId = spans[0]!.traceId;
  const generatedToolSpanId = spans.find((span) => span.name === "execute-tool")!.spanId;
  const sessionId = otel.spans[0]!.attributes["session.id"] as string;

  assert.deepEqual(correctness!.evaluationTarget, { traceIds: [generatedTraceId] });
  assert.deepEqual(toolSelection!.evaluationTarget, { spanIds: [generatedToolSpanId] });
  assert.equal(goalSuccess!.evaluationTarget, undefined);

  const correctnessReference = correctness!.evaluationReferenceInputs[0]!;
  const toolReference = toolSelection!.evaluationReferenceInputs[0]!;
  const goalReference = goalSuccess!.evaluationReferenceInputs[0]!;
  assert.deepEqual(correctnessReference.expectedResponse, { text: scenario.expectedResponse });
  assert.deepEqual(toolReference.expectedTrajectory, { toolNames: ["knowledge_search"] });
  assert.deepEqual(goalReference.assertions, [
    { text: "The final answer cites the approved synthetic source." }
  ]);
  assert.deepEqual(correctnessReference.context, { spanContext: { sessionId, traceId: generatedTraceId } });
  assert.deepEqual(toolReference.context, {
    spanContext: { sessionId, traceId: generatedTraceId, spanId: generatedToolSpanId }
  });
  assert.deepEqual(goalReference.context, { spanContext: { sessionId } });
  assert.deepEqual(Object.keys(correctnessReference).sort(), ["context", "expectedResponse"]);
  assert.deepEqual(Object.keys(toolReference).sort(), ["context", "expectedTrajectory"]);
  assert.deepEqual(Object.keys(goalReference).sort(), ["assertions", "context"]);
});

test("rejects inputs that are outside the reviewed provider request boundary", async () => {
  const { otel, scenario, policy } = await loadInputs();

  const nonSyntheticFixture = structuredClone(otel);
  nonSyntheticFixture.scenarioId = "synthetic-citation-missing";
  assertBuilderError(() => buildProviderEvaluationRequests(nonSyntheticFixture, scenario, policy), "provider_fixture_not_synthetic");

  const wrongScenario = structuredClone(scenario);
  wrongScenario.scenarioId = "synthetic-citation-missing";
  assertBuilderError(() => buildProviderEvaluationRequests(otel, wrongScenario, policy), "provider_scenario_not_allowed");

  const unknownScopeFixture = structuredClone(otel);
  unknownScopeFixture.spans[0]!.scopeName = "custom.agent.tracing";
  assertBuilderError(() => buildProviderEvaluationRequests(unknownScopeFixture, scenario, policy), "provider_scope_not_allowed");

  const missingAgentSpan = structuredClone(otel);
  missingAgentSpan.spans = missingAgentSpan.spans.filter((span) => span.attributes["gen_ai.operation.name"] !== "invoke_agent");
  assertBuilderError(() => buildProviderEvaluationRequests(missingAgentSpan, scenario, policy), "provider_required_span_missing");

  const secondSessionFixture = structuredClone(otel);
  secondSessionFixture.spans[1]!.attributes["session.id"] = "second-reviewed-session";
  assertBuilderError(() => buildProviderEvaluationRequests(secondSessionFixture, scenario, policy), "provider_session_count_invalid");

  const unknownAttributeFixture = structuredClone(otel);
  unknownAttributeFixture.spans[0]!.attributes["customer.account.id"] = "not-allowed";
  assertBuilderError(() => buildProviderEvaluationRequests(unknownAttributeFixture, scenario, policy), "provider_attribute_not_allowed");
});

test("rejects missing reviewed GenAI and OpenInference message and tool attributes", async () => {
  const { otel, openInference, scenario, policy } = await loadInputs();
  const missingOtelMessage = structuredClone(otel);
  delete missingOtelMessage.spans[0]!.attributes["gen_ai.input.messages"];
  assertBuilderError(() => buildProviderEvaluationRequests(
    missingOtelMessage, scenario, policy), "provider_attribute_not_allowed");

  const missingOtelTool = structuredClone(otel);
  delete missingOtelTool.spans[2]!.attributes["gen_ai.tool.call.result"];
  assertBuilderError(() => buildProviderEvaluationRequests(
    missingOtelTool, scenario, policy), "provider_attribute_not_allowed");

  const missingOpenInferenceMessage = structuredClone(openInference);
  delete missingOpenInferenceMessage.spans[0]!.attributes["output.value"];
  assertBuilderError(() => buildProviderEvaluationRequests(
    missingOpenInferenceMessage, scenario, policy), "provider_attribute_not_allowed");

  const missingOpenInferenceTool = structuredClone(openInference);
  delete missingOpenInferenceTool.spans[2]!.attributes["tool.name"];
  assertBuilderError(() => buildProviderEvaluationRequests(
    missingOpenInferenceTool, scenario, policy), "provider_attribute_not_allowed");
});

test("rejects mutable policy and scenario values that would change the fixed request matrix", async () => {
  const { otel, scenario, policy } = await loadInputs();
  const fourthEvaluatorPolicy = structuredClone(policy) as ProviderParityPolicy & {
    evaluatorThresholds: Record<string, number>;
  };
  fourthEvaluatorPolicy.evaluatorThresholds["Builtin.NewEvaluator"] = 0.7;
  assertBuilderError(() => buildProviderEvaluationRequests(otel, scenario, fourthEvaluatorPolicy), "provider_policy_invalid");

  const changedThresholdPolicy = structuredClone(policy);
  changedThresholdPolicy.evaluatorThresholds["Builtin.Correctness"] = 0.8;
  assertBuilderError(() => buildProviderEvaluationRequests(otel, scenario, changedThresholdPolicy), "provider_policy_invalid");

  const wrongCallCapPolicy = structuredClone(policy) as unknown as { maximumProviderCalls: number };
  wrongCallCapPolicy.maximumProviderCalls = 3;
  assertBuilderError(() => buildProviderEvaluationRequests(
    otel, scenario, wrongCallCapPolicy as ProviderParityPolicy), "provider_call_count_invalid");

  const emptyExpectedResponse = structuredClone(scenario);
  emptyExpectedResponse.expectedResponse = "";
  assertBuilderError(() => buildProviderEvaluationRequests(otel, emptyExpectedResponse, policy), "provider_scenario_not_allowed");

  const multipleTools = structuredClone(scenario);
  multipleTools.expectedToolTrajectory.push({ name: "another_tool", argumentsSubset: {} });
  assertBuilderError(() => buildProviderEvaluationRequests(otel, multipleTools, policy), "provider_scenario_not_allowed");
});

type ProviderSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  attributes: Record<string, unknown>;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  scope: { name: string; version: string };
  resource: { attributes: Record<string, string> };
  status: { code: number };
};

function summarizeSemantics(requests: ProviderEvaluationRequest[]) {
  return requests.map((request) => ({
    evaluatorId: request.evaluatorId,
    targetType: request.evaluationTarget && "traceIds" in request.evaluationTarget
      ? "trace"
      : request.evaluationTarget && "spanIds" in request.evaluationTarget
        ? "tool"
        : "session",
    spanNames: (request.evaluationInput.sessionSpans as ProviderSpan[]).map((span) => span.name),
    referenceFields: Object.keys(request.evaluationReferenceInputs[0]!).filter((key) => key !== "context").sort()
  }));
}

async function loadInputs(): Promise<{
  otel: TelemetryFixture;
  openInference: TelemetryFixture;
  scenario: EvaluationScenario;
  policy: ProviderParityPolicy;
}> {
  const [otel, openInference, scenarios, policy] = await Promise.all([
    loadFixture("otel-genai.traces.v1.json"),
    loadFixture("openinference.traces.v1.json"),
    readJson<EvaluationScenario[]>("scenarios.v1.json"),
    readJson<ProviderParityPolicy>("provider-parity-thresholds.v1.json")
  ]);
  const scenario = scenarios.find((candidate) => candidate.scenarioId === "synthetic-cited-answer");
  assert.ok(scenario);
  return { otel, openInference, scenario, policy };
}

async function loadFixture(fileName: string): Promise<TelemetryFixture> {
  const fixtures = await readJson<TelemetryFixture[]>(fileName);
  const fixture = fixtures.find((candidate) => candidate.scenarioId === "synthetic-cited-answer");
  assert.ok(fixture);
  return structuredClone(fixture);
}

async function readJson<T>(fileName: string): Promise<T> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8")) as T;
}

function assertBuilderError(operation: () => unknown, code: ProviderParityError["code"]): void {
  assert.throws(operation, (error: unknown) => error instanceof ProviderParityError && error.code === code);
}
