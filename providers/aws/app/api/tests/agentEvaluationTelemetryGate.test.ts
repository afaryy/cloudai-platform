import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  AgentEvaluationGateError,
  assertEvaluationGate,
  evaluateAgentSession
} from "../src/evals/agentEvaluationTelemetryGate.js";
import { normalizeEvaluationTelemetry } from "../src/evals/agentEvaluationTelemetryNormalizer.js";
import type {
  AgentEvaluationReport,
  EvaluationScenario,
  NormalizedEvaluationSession,
  NormalizedToolCall,
  TelemetryFixture,
  ThresholdPolicy
} from "../src/evals/agentEvaluationTelemetryTypes.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agent-evaluation-telemetry");

test("valid cited-answer session passes all strict local dimensions", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");

  const report = evaluateAgentSession(session, scenario, policy);

  assert.equal(report.status, "passed");
  assert.deepEqual(report.scores.map(({ evaluatorId, score }) => ({ evaluatorId, score })), [
    { evaluatorId: "local.telemetry_compatibility", score: 1 },
    { evaluatorId: "local.trace_completeness", score: 1 },
    { evaluatorId: "local.tool_trajectory_accuracy", score: 1 },
    { evaluatorId: "local.behavioural_outcome", score: 1 },
    { evaluatorId: "local.goal_success", score: 1 }
  ]);
  assert.doesNotThrow(() => assertEvaluationGate(report));
});

test("all six scenarios pass under both telemetry conventions", async () => {
  const scenarios = await loadScenarios();
  const policy = await loadThresholdPolicy();

  for (const fileName of ["otel-genai.traces.v1.json", "openinference.traces.v1.json"]) {
    const fixtures = await loadFixtures(fileName);
    for (const scenario of scenarios) {
      const fixture = fixtures.find((candidate) => candidate.scenarioId === scenario.scenarioId);
      assert.ok(fixture);
      const report = evaluateAgentSession(normalizeEvaluationTelemetry(fixture), scenario, policy);
      assert.doesNotThrow(() => assertEvaluationGate(report), `${fileName}:${scenario.scenarioId}`);
    }
  }
});

test("wrong tool produces zero trajectory score and fails the gate", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");
  session.turns[0]!.toolCalls[0]!.name = "unapproved_export";

  const report = evaluateAgentSession(session, scenario, policy);
  const trajectory = score(report, "local.tool_trajectory_accuracy");

  assert.equal(trajectory.score, 0);
  assert.equal(trajectory.reasonCode, "tool_trajectory_mismatch");
  assertGateError(() => assertEvaluationGate(report), "score_below_threshold");
});

test("a tool execution after a denied response is an unsafe observed trajectory", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-denied-tool");
  session.turns[0]!.toolCalls.push(syntheticToolCall("unapproved_export"));

  const report = evaluateAgentSession(session, scenario, policy);

  assert.equal(score(report, "local.tool_trajectory_accuracy").score, 0);
  assert.equal(score(report, "local.goal_success").score, 0);
  assert.equal(score(report, "local.goal_success").reasonCode, "unsafe_observed_trajectory");
  assertGateError(() => assertEvaluationGate(report), "unsafe_observed_trajectory");
});

test("a tool execution after an approval-required response is unsafe", async () => {
  const { session, scenario, policy } = await loadCase("openinference.traces.v1.json", "synthetic-human-approval-boundary");
  session.turns[0]!.toolCalls.push(syntheticToolCall("high_impact_change"));

  const report = evaluateAgentSession(session, scenario, policy);

  assert.equal(score(report, "local.goal_success").reasonCode, "unsafe_observed_trajectory");
  assertGateError(() => assertEvaluationGate(report), "unsafe_observed_trajectory");
});

test("missing required citation fails behavioural outcome", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");
  session.turns[0]!.response = "Governed access protects the synthetic platform.";

  const report = evaluateAgentSession(session, scenario, policy);

  assert.equal(score(report, "local.behavioural_outcome").score, 0);
  assert.equal(score(report, "local.behavioural_outcome").reasonCode, "citation_missing");
  assertGateError(() => assertEvaluationGate(report), "score_below_threshold");
});

test("gate fails closed on missing, empty, non-numeric, or unknown evaluator data", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");
  const valid = evaluateAgentSession(session, scenario, policy);

  const missing = structuredClone(valid);
  missing.scores.pop();
  assertGateError(() => assertEvaluationGate(missing), "evaluator_failed");

  const empty = { ...structuredClone(valid), scores: [] };
  assertGateError(() => assertEvaluationGate(empty), "evaluator_failed");

  const notNumeric = structuredClone(valid) as any;
  notNumeric.scores[0].score = Number.NaN;
  assertGateError(() => assertEvaluationGate(notNumeric), "evaluator_failed");

  const unknown = structuredClone(valid) as any;
  unknown.scores.push({
    evaluatorId: "local.unknown_dimension",
    level: "session",
    score: 1,
    threshold: 1,
    passed: true,
    reasonCode: "passed"
  });
  assertGateError(() => assertEvaluationGate(unknown), "evaluator_failed");
});

test("gate fails a finite score below its threshold", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");
  const report = evaluateAgentSession(session, scenario, policy);
  report.scores[0]!.score = 0.99;
  report.scores[0]!.passed = false;
  report.status = "failed";

  assertGateError(() => assertEvaluationGate(report), "score_below_threshold");
});

test("threshold policy rejects missing and unknown dimensions", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");
  const missing = structuredClone(policy) as any;
  delete missing.minimumScores.goal_success;
  assertGateError(() => evaluateAgentSession(session, scenario, missing), "incomplete_evaluation_input");

  const unknown = structuredClone(policy) as any;
  unknown.minimumScores.unknown_dimension = 1;
  assertGateError(() => evaluateAgentSession(session, scenario, unknown), "incomplete_evaluation_input");
});

test("evaluation report omits prompts, responses, tool arguments, and tool outputs", async () => {
  const { session, scenario, policy } = await loadCase("otel-genai.traces.v1.json", "synthetic-cited-answer");
  const report = evaluateAgentSession(session, scenario, policy);
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes(scenario.fixedPrompt), false);
  assert.equal(serialized.includes(scenario.expectedResponse), false);
  assert.equal(serialized.includes("platform-handbook"), false);
  assert.equal(serialized.includes("source:platform-handbook"), false);
});

async function loadCase(fileName: string, scenarioId: string): Promise<{
  session: NormalizedEvaluationSession;
  scenario: EvaluationScenario;
  policy: ThresholdPolicy;
}> {
  const fixtures = await loadFixtures(fileName);
  const scenarios = await loadScenarios();
  const fixture = fixtures.find((candidate) => candidate.scenarioId === scenarioId);
  const scenario = scenarios.find((candidate) => candidate.scenarioId === scenarioId);
  assert.ok(fixture);
  assert.ok(scenario);
  return {
    session: normalizeEvaluationTelemetry(fixture),
    scenario,
    policy: await loadThresholdPolicy()
  };
}

async function loadFixtures(fileName: string): Promise<TelemetryFixture[]> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8"));
}

async function loadScenarios(): Promise<EvaluationScenario[]> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, "scenarios.v1.json"), "utf8"));
}

async function loadThresholdPolicy(): Promise<ThresholdPolicy> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, "thresholds.v1.json"), "utf8"));
}

function score(report: AgentEvaluationReport, evaluatorId: AgentEvaluationReport["scores"][number]["evaluatorId"]) {
  const result = report.scores.find((candidate) => candidate.evaluatorId === evaluatorId);
  assert.ok(result);
  return result;
}

function syntheticToolCall(name: string): NormalizedToolCall {
  return {
    name,
    callId: "call_unsafe_synthetic",
    arguments: { target: "synthetic" },
    status: "succeeded"
  };
}

function assertGateError(operation: () => unknown, code: AgentEvaluationGateError["code"]): void {
  assert.throws(operation, (error: unknown) =>
    error instanceof AgentEvaluationGateError && error.code === code);
}
