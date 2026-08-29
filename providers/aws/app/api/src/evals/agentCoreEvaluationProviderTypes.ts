import type { EvaluationConvention } from "./agentEvaluationTelemetryTypes.js";

export type ProviderEvaluatorId =
  | "Builtin.Correctness"
  | "Builtin.ToolSelectionAccuracy"
  | "Builtin.GoalSuccessRate";

export type ProviderEvaluationLevel = "trace" | "tool-call" | "session";

export type ProviderParityErrorCode =
  | "provider_fixture_not_synthetic"
  | "provider_scenario_not_allowed"
  | "provider_scope_not_allowed"
  | "provider_required_span_missing"
  | "provider_session_count_invalid"
  | "provider_attribute_not_allowed"
  | "provider_policy_invalid"
  | "provider_call_count_invalid"
  | "provider_result_missing"
  | "provider_result_duplicate"
  | "provider_evaluator_unexpected"
  | "provider_result_failed"
  | "provider_reference_input_ignored"
  | "provider_score_invalid"
  | "provider_context_mismatch"
  | "provider_token_usage_invalid"
  | "provider_label_invalid"
  | "provider_score_below_threshold"
  | "provider_parity_delta_exceeded"
  | "provider_result_coverage_invalid"
  | "provider_confirmation_required"
  | "provider_readiness_required"
  | "provider_call_budget_invalid"
  | "provider_region_invalid"
  | "provider_source_ref_invalid"
  | "provider_source_commit_invalid"
  | "provider_output_path_required"
  | "provider_input_file_invalid"
  | "provider_request_failed"
  | "provider_artifact_write_failed";

export class ProviderParityError extends Error {
  constructor(public readonly code: ProviderParityErrorCode) {
    super(code);
    this.name = "ProviderParityError";
  }
}

export type ProviderParityPolicy = {
  contractVersion: "1.0";
  profileId: "provider-parity-v1";
  scenarioId: "synthetic-cited-answer";
  evaluatorThresholds: Record<ProviderEvaluatorId, number>;
  maximumParityDelta: number;
  maximumProviderCalls: 6;
};

export type ProviderEvaluationRequest = {
  evaluatorId: ProviderEvaluatorId;
  evaluationInput: { sessionSpans: Record<string, unknown>[] };
  evaluationTarget?: { traceIds: string[] } | { spanIds: string[] };
  evaluationReferenceInputs: Array<{
    context: { spanContext: { sessionId: string; traceId?: string; spanId?: string } };
    expectedResponse?: { text: string };
    assertions?: Array<{ text: string }>;
    expectedTrajectory?: { toolNames: string[] };
  }>;
};

export type ProviderEvaluationResponse = {
  evaluationResults?: Array<{
    evaluatorId?: string;
    value?: number;
    label?: string;
    errorCode?: string;
    errorMessage?: string;
    explanation?: string;
    ignoredReferenceInputFields?: string[];
    context?: { spanContext?: { sessionId?: string; traceId?: string; spanId?: string } };
    tokenUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  }>;
};

export interface AgentCoreEvaluateClient {
  evaluate(request: ProviderEvaluationRequest): Promise<ProviderEvaluationResponse>;
}

export type ProviderParityResult = {
  convention: EvaluationConvention;
  evaluatorId: ProviderEvaluatorId;
  level: ProviderEvaluationLevel;
  score: number;
  label: string;
  threshold: number;
  passed: boolean;
  reasonCode: string;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
};

export type ProviderParityReport = {
  contractVersion: "1.0";
  thresholdVersion: "1.0";
  evidenceLevel: "provider-direct";
  generatedAt: string;
  sourceCommit: string;
  githubRunId: string;
  regionLabel: "ap-southeast-2";
  scenarioId: "synthetic-cited-answer";
  status: "passed" | "failed";
  providerCallCount: 6;
  durationBucket: "under-1m" | "under-5m" | "under-15m" | "15m-or-more";
  aggregateTokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  results: ProviderParityResult[];
  parity: Array<{
    evaluatorId: ProviderEvaluatorId;
    otelGenaiScore: number;
    openInferenceScore: number;
    absoluteDelta: number;
    maximumDelta: number;
    passed: boolean;
  }>;
};
