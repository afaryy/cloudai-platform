import {
  ProviderParityError,
  type ProviderEvaluationLevel,
  type ProviderEvaluationRequest,
  type ProviderEvaluationResponse,
  type ProviderEvaluatorId,
  type ProviderParityPolicy,
  type ProviderParityReport,
  type ProviderParityResult
} from "./agentCoreEvaluationProviderTypes.js";
import type { EvaluationConvention } from "./agentEvaluationTelemetryTypes.js";

const EVALUATORS: readonly ProviderEvaluatorId[] = [
  "Builtin.Correctness",
  "Builtin.ToolSelectionAccuracy",
  "Builtin.GoalSuccessRate"
];

const CONVENTIONS: readonly EvaluationConvention[] = ["otel-genai", "openinference"];

const EXPECTED_KEYS = new Set(
  CONVENTIONS.flatMap((convention) => EVALUATORS.map((evaluatorId) => `${convention}:${evaluatorId}`))
);

const RESULT_KEYS = [
  "convention", "evaluatorId", "level", "score", "label", "threshold", "passed", "reasonCode", "tokenUsage"
];

const PARITY_KEYS = [
  "evaluatorId", "otelGenaiScore", "openInferenceScore", "absoluteDelta", "maximumDelta", "passed"
];

type ProviderResultContext = {
  spanContext?: { sessionId?: string; traceId?: string; spanId?: string };
};

export type ProviderEvaluationPair = {
  convention: EvaluationConvention;
  request: ProviderEvaluationRequest;
  response: ProviderEvaluationResponse;
};

export type ProviderParityReportInput = {
  pairs: ProviderEvaluationPair[];
  policy: ProviderParityPolicy;
  generatedAt: string;
  sourceCommit: string;
  githubRunId: string;
  durationBucket: ProviderParityReport["durationBucket"];
};

export function sanitizeProviderResult(
  pair: ProviderEvaluationPair,
  policy: ProviderParityPolicy
): ProviderParityResult {
  validatePolicy(policy);
  if (!isRecord(pair)) throw new ProviderParityError("provider_result_coverage_invalid");
  if (!isConvention(pair.convention)) throw new ProviderParityError("provider_result_coverage_invalid");

  const evaluatorId = pair.request?.evaluatorId;
  if (!isEvaluatorId(evaluatorId)) throw new ProviderParityError("provider_evaluator_unexpected");
  const level = levelFor(evaluatorId);
  const expectedContext = expectedContextFor(pair.request);
  const evaluationResults = pair.response?.evaluationResults;
  if (!Array.isArray(evaluationResults) || evaluationResults.length === 0) {
    throw new ProviderParityError("provider_result_missing");
  }
  if (evaluationResults.length !== 1) throw new ProviderParityError("provider_result_duplicate");

  const raw = evaluationResults[0];
  if (!raw || raw.evaluatorId !== evaluatorId) throw new ProviderParityError("provider_evaluator_unexpected");
  if (raw.errorCode !== undefined) throw new ProviderParityError("provider_result_failed");
  if (raw.ignoredReferenceInputFields !== undefined &&
    (!Array.isArray(raw.ignoredReferenceInputFields) || raw.ignoredReferenceInputFields.length !== 0)) {
    throw new ProviderParityError("provider_reference_input_ignored");
  }
  if (!isScore(raw.value)) throw new ProviderParityError("provider_score_invalid");
  if (!sameContext(raw.context, expectedContext)) throw new ProviderParityError("provider_context_mismatch");
  if (!isLabel(raw.label)) throw new ProviderParityError("provider_label_invalid");
  if (!isTokenUsage(raw.tokenUsage)) throw new ProviderParityError("provider_token_usage_invalid");

  const threshold = policy.evaluatorThresholds[evaluatorId];
  if (raw.value < threshold) throw new ProviderParityError("provider_score_below_threshold");

  return {
    convention: pair.convention,
    evaluatorId,
    level,
    score: raw.value,
    label: raw.label,
    threshold,
    passed: true,
    reasonCode: "passed",
    tokenUsage: {
      inputTokens: raw.tokenUsage.inputTokens,
      outputTokens: raw.tokenUsage.outputTokens,
      totalTokens: raw.tokenUsage.totalTokens
    }
  };
}

export function buildProviderParityReport(input: ProviderParityReportInput): ProviderParityReport {
  validatePolicy(input.policy);
  if (!Array.isArray(input.pairs) || input.pairs.length !== 6) {
    throw new ProviderParityError("provider_call_count_invalid");
  }

  const results = input.pairs.map((pair) => sanitizeProviderResult(pair, input.policy));
  assertResultCoverage(results);
  const aggregateTokenUsage = aggregateTokens(results);
  const parity = EVALUATORS.map((evaluatorId) => {
    const otel = resultFor(results, "otel-genai", evaluatorId);
    const openInference = resultFor(results, "openinference", evaluatorId);
    const absoluteDelta = Math.abs(otel.score - openInference.score);
    const maximumDelta = input.policy.maximumParityDelta;
    return {
      evaluatorId,
      otelGenaiScore: otel.score,
      openInferenceScore: openInference.score,
      absoluteDelta,
      maximumDelta,
      passed: absoluteDelta <= maximumDelta
    };
  });

  return {
    contractVersion: "1.0",
    thresholdVersion: "1.0",
    evidenceLevel: "provider-direct",
    generatedAt: input.generatedAt,
    sourceCommit: input.sourceCommit,
    githubRunId: input.githubRunId,
    regionLabel: "ap-southeast-2",
    scenarioId: "synthetic-cited-answer",
    status: parity.every((row) => row.passed) ? "passed" : "failed",
    providerCallCount: 6,
    durationBucket: input.durationBucket,
    aggregateTokenUsage,
    results,
    parity
  };
}

export function assertProviderParityGate(report: ProviderParityReport): void {
  if (!report || report.providerCallCount !== 6 || !Array.isArray(report.results) || report.results.length !== 6) {
    throw new ProviderParityError("provider_call_count_invalid");
  }

  assertResultCoverage(report.results);
  for (const result of report.results) assertReportResult(result);
  const aggregate = aggregateTokens(report.results);
  if (!sameTokenUsage(report.aggregateTokenUsage, aggregate)) {
    throw new ProviderParityError("provider_token_usage_invalid");
  }

  if (!Array.isArray(report.parity) || report.parity.length !== 3) {
    throw new ProviderParityError("provider_result_coverage_invalid");
  }
  const parityIds = new Set<ProviderEvaluatorId>();
  for (const row of report.parity) {
    if (!hasOnlyKeys(row, PARITY_KEYS) || !isEvaluatorId(row.evaluatorId) || parityIds.has(row.evaluatorId)) {
      throw new ProviderParityError("provider_result_coverage_invalid");
    }
    parityIds.add(row.evaluatorId);
    const otel = resultFor(report.results, "otel-genai", row.evaluatorId);
    const openInference = resultFor(report.results, "openinference", row.evaluatorId);
    const expectedDelta = Math.abs(otel.score - openInference.score);
    if (!isScore(row.otelGenaiScore) || !isScore(row.openInferenceScore) ||
      !isScore(row.absoluteDelta) || row.otelGenaiScore !== otel.score ||
      row.openInferenceScore !== openInference.score || row.absoluteDelta !== expectedDelta ||
      row.maximumDelta !== 0.20 || row.passed !== (expectedDelta <= row.maximumDelta)) {
      throw new ProviderParityError("provider_parity_delta_exceeded");
    }
    if (expectedDelta > 0.20) throw new ProviderParityError("provider_parity_delta_exceeded");
  }
  if (parityIds.size !== EVALUATORS.length || report.status !== "passed") {
    throw new ProviderParityError("provider_parity_delta_exceeded");
  }
}

function validatePolicy(policy: ProviderParityPolicy): void {
  const thresholds = policy?.evaluatorThresholds as unknown;
  if (!policy || policy.contractVersion !== "1.0" || policy.profileId !== "provider-parity-v1" ||
    policy.scenarioId !== "synthetic-cited-answer" || policy.maximumProviderCalls !== 6) {
    throw new ProviderParityError("provider_policy_invalid");
  }
  if (policy.maximumParityDelta !== 0.20 || !isRecord(thresholds) ||
    !sameStrings(Object.keys(thresholds), EVALUATORS) ||
    EVALUATORS.some((evaluatorId) => thresholds[evaluatorId] !== 0.70)) {
    throw new ProviderParityError("provider_policy_invalid");
  }
}

function expectedContextFor(request: ProviderEvaluationRequest): { sessionId: string; traceId?: string; spanId?: string } {
  const references = request.evaluationReferenceInputs;
  if (!Array.isArray(references) || references.length !== 1) {
    throw new ProviderParityError("provider_context_mismatch");
  }
  const spanContext = references[0]?.context?.spanContext;
  if (!spanContext || typeof spanContext.sessionId !== "string" || spanContext.sessionId.length === 0 ||
    (spanContext.traceId !== undefined && typeof spanContext.traceId !== "string") ||
    (spanContext.spanId !== undefined && typeof spanContext.spanId !== "string")) {
    throw new ProviderParityError("provider_context_mismatch");
  }
  return {
    sessionId: spanContext.sessionId,
    ...(spanContext.traceId === undefined ? {} : { traceId: spanContext.traceId }),
    ...(spanContext.spanId === undefined ? {} : { spanId: spanContext.spanId })
  };
}

function assertResultCoverage(results: ProviderParityResult[]): void {
  const keys = new Set<string>();
  for (const result of results) {
    if (!isRecord(result)) throw new ProviderParityError("provider_result_coverage_invalid");
    if (!isConvention(result.convention) || !isEvaluatorId(result.evaluatorId)) {
      throw new ProviderParityError("provider_result_coverage_invalid");
    }
    const key = `${result.convention}:${result.evaluatorId}`;
    if (!EXPECTED_KEYS.has(key) || keys.has(key)) throw new ProviderParityError("provider_result_coverage_invalid");
    keys.add(key);
  }
  if (keys.size !== EXPECTED_KEYS.size) throw new ProviderParityError("provider_result_coverage_invalid");
}

function assertReportResult(result: ProviderParityResult): void {
  if (!hasOnlyKeys(result, RESULT_KEYS) || result.level !== levelFor(result.evaluatorId)) {
    throw new ProviderParityError("provider_result_coverage_invalid");
  }
  if (!isScore(result.score)) throw new ProviderParityError("provider_score_invalid");
  if (result.threshold !== 0.70 || !isLabel(result.label) || result.reasonCode !== "passed") {
    throw new ProviderParityError("provider_score_below_threshold");
  }
  if (!isTokenUsage(result.tokenUsage)) throw new ProviderParityError("provider_token_usage_invalid");
  if (result.score < result.threshold || result.passed !== true) {
    throw new ProviderParityError("provider_score_below_threshold");
  }
}

function aggregateTokens(results: ProviderParityResult[]): ProviderParityReport["aggregateTokenUsage"] {
  const totals = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  for (const result of results) {
    if (!isTokenUsage(result.tokenUsage)) throw new ProviderParityError("provider_token_usage_invalid");
    totals.inputTokens = checkedSum(totals.inputTokens, result.tokenUsage.inputTokens);
    totals.outputTokens = checkedSum(totals.outputTokens, result.tokenUsage.outputTokens);
    totals.totalTokens = checkedSum(totals.totalTokens, result.tokenUsage.totalTokens);
  }
  return totals;
}

function resultFor(
  results: ProviderParityResult[],
  convention: EvaluationConvention,
  evaluatorId: ProviderEvaluatorId
): ProviderParityResult {
  const result = results.find((candidate) => candidate.convention === convention && candidate.evaluatorId === evaluatorId);
  if (!result) throw new ProviderParityError("provider_result_coverage_invalid");
  return result;
}

function levelFor(evaluatorId: ProviderEvaluatorId): ProviderEvaluationLevel {
  switch (evaluatorId) {
    case "Builtin.Correctness": return "trace";
    case "Builtin.ToolSelectionAccuracy": return "tool-call";
    case "Builtin.GoalSuccessRate": return "session";
  }
}

function sameContext(
  actual: ProviderResultContext | undefined,
  expected: { sessionId: string; traceId?: string; spanId?: string }
): boolean {
  const spanContext = actual?.spanContext;
  if (!spanContext || typeof spanContext.sessionId !== "string") return false;
  const actualKeys = Object.keys(spanContext).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index]) &&
    spanContext.sessionId === expected.sessionId && spanContext.traceId === expected.traceId && spanContext.spanId === expected.spanId;
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isTokenUsage(value: unknown): value is { inputTokens: number; outputTokens: number; totalTokens: number } {
  return isRecord(value) && isSafeTokenCount(value.inputTokens) &&
    isSafeTokenCount(value.outputTokens) && isSafeTokenCount(value.totalTokens) &&
    hasOnlyKeys(value, ["inputTokens", "outputTokens", "totalTokens"]);
}

function isSafeTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isLabel(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 80 && /^[a-z0-9_]+$/.test(value);
}

function checkedSum(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) throw new ProviderParityError("provider_token_usage_invalid");
  return total;
}

function sameTokenUsage(left: unknown, right: unknown): boolean {
  return isTokenUsage(left) && isTokenUsage(right) &&
    left.inputTokens === right.inputTokens && left.outputTokens === right.outputTokens && left.totalTokens === right.totalTokens;
}

function isEvaluatorId(value: unknown): value is ProviderEvaluatorId {
  return typeof value === "string" && EVALUATORS.includes(value as ProviderEvaluatorId);
}

function isConvention(value: unknown): value is EvaluationConvention {
  return typeof value === "string" && CONVENTIONS.includes(value as EvaluationConvention);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: unknown, keys: string[]): boolean {
  return isRecord(value) && sameStrings(Object.keys(value), keys);
}

function sameStrings(actual: string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value) => expected.includes(value));
}
