import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProviderParityGate,
  buildProviderParityReport,
  sanitizeProviderResult,
  type ProviderEvaluationPair
} from "../src/evals/agentCoreEvaluationProviderGate.js";
import { ProviderParityError } from "../src/evals/agentCoreEvaluationProviderTypes.js";
import type {
  ProviderEvaluationRequest,
  ProviderEvaluationResponse,
  ProviderEvaluatorId,
  ProviderParityPolicy
} from "../src/evals/agentCoreEvaluationProviderTypes.js";
import type { EvaluationConvention } from "../src/evals/agentEvaluationTelemetryTypes.js";

const POLICY: ProviderParityPolicy = {
  contractVersion: "1.0",
  profileId: "provider-parity-v1",
  scenarioId: "synthetic-cited-answer",
  evaluatorThresholds: {
    "Builtin.Correctness": 0.70,
    "Builtin.ToolSelectionAccuracy": 0.70,
    "Builtin.GoalSuccessRate": 0.70
  },
  maximumParityDelta: 0.20,
  maximumProviderCalls: 6
};

const EVALUATORS: ProviderEvaluatorId[] = [
  "Builtin.Correctness",
  "Builtin.ToolSelectionAccuracy",
  "Builtin.GoalSuccessRate"
];

test("builds metadata-only provider-direct evidence from six validated provider results", () => {
  const report = buildProviderParityReport({
    pairs: [
      ...makeConventionPairs("otel-genai", [0.90, 0.85, 0.80]),
      ...makeConventionPairs("openinference", [0.88, 0.82, 0.78])
    ],
    policy: POLICY,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "a".repeat(40),
    githubRunId: "123456",
    durationBucket: "under-1m"
  });

  assert.equal(report.evidenceLevel, "provider-direct");
  assert.equal(report.providerCallCount, 6);
  assert.equal(report.results.length, 6);
  assert.equal(report.parity.length, 3);
  assert.equal(report.status, "passed");
  assert.doesNotThrow(() => assertProviderParityGate(report));
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("provider explanation"), false);
  assert.equal(serialized.includes("arn:aws"), false);
  assert.equal(serialized.includes("Which controls"), false);
});

test("rejects malformed provider results with bounded codes and no diagnostic leakage", () => {
  const cases: Array<{
    name: string;
    mutate: (response: ProviderEvaluationResponse) => void;
    code: ProviderParityError["code"];
  }> = [
    {
      name: "missing results",
      mutate: (response) => { delete response.evaluationResults; },
      code: "provider_result_missing"
    },
    {
      name: "empty results",
      mutate: (response) => { response.evaluationResults = []; },
      code: "provider_result_missing"
    },
    {
      name: "duplicate results",
      mutate: (response) => { response.evaluationResults!.push(structuredClone(response.evaluationResults![0]!)); },
      code: "provider_result_duplicate"
    },
    {
      name: "unexpected evaluator",
      mutate: (response) => { response.evaluationResults![0]!.evaluatorId = "Builtin.Other"; },
      code: "provider_evaluator_unexpected"
    },
    {
      name: "provider error code",
      mutate: (response) => { response.evaluationResults![0]!.errorCode = "provider diagnostic"; },
      code: "provider_result_failed"
    },
    {
      name: "ignored reference input",
      mutate: (response) => { response.evaluationResults![0]!.ignoredReferenceInputFields = ["expectedResponse"]; },
      code: "provider_reference_input_ignored"
    },
    {
      name: "missing score",
      mutate: (response) => { delete response.evaluationResults![0]!.value; },
      code: "provider_score_invalid"
    },
    {
      name: "NaN score",
      mutate: (response) => { response.evaluationResults![0]!.value = Number.NaN; },
      code: "provider_score_invalid"
    },
    {
      name: "infinite score",
      mutate: (response) => { response.evaluationResults![0]!.value = Number.POSITIVE_INFINITY; },
      code: "provider_score_invalid"
    },
    {
      name: "out of range score",
      mutate: (response) => { response.evaluationResults![0]!.value = 1.01; },
      code: "provider_score_invalid"
    },
    {
      name: "missing context",
      mutate: (response) => { delete response.evaluationResults![0]!.context; },
      code: "provider_context_mismatch"
    },
    {
      name: "wrong context",
      mutate: (response) => { response.evaluationResults![0]!.context!.spanContext!.sessionId = "wrong"; },
      code: "provider_context_mismatch"
    },
    {
      name: "negative token count",
      mutate: (response) => { response.evaluationResults![0]!.tokenUsage!.inputTokens = -1; },
      code: "provider_token_usage_invalid"
    },
    {
      name: "fractional token count",
      mutate: (response) => { response.evaluationResults![0]!.tokenUsage!.outputTokens = 0.5; },
      code: "provider_token_usage_invalid"
    },
    {
      name: "empty label",
      mutate: (response) => { response.evaluationResults![0]!.label = ""; },
      code: "provider_label_invalid"
    },
    {
      name: "overlong label",
      mutate: (response) => { response.evaluationResults![0]!.label = "a".repeat(81); },
      code: "provider_label_invalid"
    },
    {
      name: "non-printable label",
      mutate: (response) => { response.evaluationResults![0]!.label = "not\nprintable"; },
      code: "provider_label_invalid"
    }
  ];

  for (const { name, mutate, code } of cases) {
    const pair = makePair("otel-genai", "Builtin.Correctness", 0.90);
    mutate(pair.response);
    assertProviderError(() => sanitizeProviderResult(pair, POLICY), code, name);
  }
});

test("fails closed for below-threshold scores, parity deltas, and incomplete result coverage", () => {
  assertProviderError(
    () => sanitizeProviderResult(makePair("otel-genai", "Builtin.Correctness", 0.69), POLICY),
    "provider_score_below_threshold"
  );

  assertProviderError(() => buildProviderParityReport({
    pairs: [
      ...makeConventionPairs("otel-genai", [0.90, 0.85, 0.80]),
      ...makeConventionPairs("openinference", [0.60, 0.82, 0.78])
    ],
    policy: POLICY,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "a".repeat(40),
    githubRunId: "123456",
    durationBucket: "under-1m"
  }), "provider_score_below_threshold");

  const parityMismatch = buildProviderParityReport({
    pairs: [
      ...makeConventionPairs("otel-genai", [0.99, 0.85, 0.80]),
      ...makeConventionPairs("openinference", [0.78, 0.82, 0.78])
    ],
    policy: POLICY,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "a".repeat(40),
    githubRunId: "123456",
    durationBucket: "under-1m"
  });
  assert.equal(parityMismatch.status, "failed");
  assertProviderError(() => assertProviderParityGate(parityMismatch), "provider_parity_delta_exceeded");

  assertProviderError(() => buildProviderParityReport({
    pairs: [
      ...makeConventionPairs("otel-genai", [0.90, 0.85, 0.80]),
      makePair("openinference", "Builtin.Correctness", 0.88),
      makePair("openinference", "Builtin.ToolSelectionAccuracy", 0.82),
      makePair("otel-genai", "Builtin.Correctness", 0.90)
    ],
    policy: POLICY,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "a".repeat(40),
    githubRunId: "123456",
    durationBucket: "under-1m"
  }), "provider_result_coverage_invalid");

  assertProviderError(() => buildProviderParityReport({
    pairs: [
      ...makeConventionPairs("otel-genai", [0.90, 0.85, 0.80]),
      ...makeConventionPairs("openinference", [0.88, 0.82, 0.78]),
      makePair("otel-genai", "Builtin.Correctness", 0.90)
    ],
    policy: POLICY,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "a".repeat(40),
    githubRunId: "123456",
    durationBucket: "under-1m"
  }), "provider_call_count_invalid");
});

test("revalidates report rows instead of trusting passed fields or status", () => {
  const report = buildPassingReport();
  report.results[0]!.passed = false;
  assertProviderError(() => assertProviderParityGate(report), "provider_score_below_threshold");

  const malformed = buildPassingReport();
  malformed.parity[0]!.absoluteDelta = 0;
  assertProviderError(() => assertProviderParityGate(malformed), "provider_parity_delta_exceeded");

  const wrongCount = buildPassingReport();
  (wrongCount as { providerCallCount: number }).providerCallCount = 5;
  assertProviderError(() => assertProviderParityGate(wrongCount), "provider_call_count_invalid");
});

function buildPassingReport() {
  return buildProviderParityReport({
    pairs: [
      ...makeConventionPairs("otel-genai", [0.90, 0.85, 0.80]),
      ...makeConventionPairs("openinference", [0.88, 0.82, 0.78])
    ],
    policy: POLICY,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "a".repeat(40),
    githubRunId: "123456",
    durationBucket: "under-1m"
  });
}

function makeConventionPairs(convention: EvaluationConvention, scores: number[]): ProviderEvaluationPair[] {
  return EVALUATORS.map((evaluatorId, index) => makePair(convention, evaluatorId, scores[index]!));
}

function makePair(
  convention: EvaluationConvention,
  evaluatorId: ProviderEvaluatorId,
  score: number
): ProviderEvaluationPair {
  const request: ProviderEvaluationRequest = {
    evaluatorId,
    evaluationInput: { sessionSpans: [] },
    ...(evaluatorId === "Builtin.Correctness"
      ? { evaluationTarget: { traceIds: ["trace-id"] } }
      : evaluatorId === "Builtin.ToolSelectionAccuracy"
        ? { evaluationTarget: { spanIds: ["tool-span-id"] } }
        : {}),
    evaluationReferenceInputs: [{
      context: {
        spanContext: {
          sessionId: "synthetic-session",
          ...(evaluatorId === "Builtin.GoalSuccessRate" ? {} : { traceId: "trace-id" }),
          ...(evaluatorId === "Builtin.ToolSelectionAccuracy" ? { spanId: "tool-span-id" } : {})
        }
      }
    }]
  };
  const rawProviderResult = {
    evaluatorId,
    value: score,
    label: "pass",
    explanation: "provider explanation: Which controls were selected",
    errorMessage: "provider diagnostic: do not expose",
    ignoredReferenceInputFields: [],
    context: structuredClone(request.evaluationReferenceInputs[0]!.context),
    tokenUsage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
    evaluatorArn: "arn:aws:bedrock-agentcore:ap-southeast-2:123:evaluator/example"
  };
  return {
    convention,
    request,
    response: {
      evaluationResults: [rawProviderResult] as unknown as NonNullable<ProviderEvaluationResponse["evaluationResults"]>
    }
  };
}

function assertProviderError(
  operation: () => unknown,
  code: ProviderParityError["code"],
  label?: string
): void {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof ProviderParityError, label);
    assert.equal(error.code, code, label);
    assert.equal(error.message, code, label);
    assert.equal(error.message.includes("provider diagnostic"), false, label);
    return true;
  });
}
