export type EvaluationConvention = "otel-genai" | "openinference";

export type SpanAttributeValue = string | number | boolean;

export type EvaluationTelemetrySpan = {
  scopeName: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  startTimeUnixNano: string;
  attributes: Record<string, SpanAttributeValue>;
};

export type TelemetryFixture = {
  contractVersion: "1.0";
  convention: EvaluationConvention;
  scenarioId: string;
  spans: EvaluationTelemetrySpan[];
};

export type NormalizedToolCall = {
  name: string;
  callId: string | null;
  arguments: Record<string, unknown>;
  status: "succeeded" | "denied" | "failed";
};

export type NormalizedEvaluationTurn = {
  traceId: string;
  prompt: string;
  response: string;
  toolCalls: NormalizedToolCall[];
};

export type NormalizedEvaluationSession = {
  scenarioId: string;
  convention: EvaluationConvention;
  sessionId: string;
  turns: NormalizedEvaluationTurn[];
  ignoredContextSpanCount: number;
};

export type ExpectedToolCall = {
  name: string;
  argumentsSubset: Record<string, unknown>;
};

export type BehaviouralAssertion =
  | "citation-present"
  | "abstained"
  | "source-retired-denied"
  | "provider-timeout"
  | "tool-denied"
  | "human-approval-required";

export type EvaluationScenario = {
  contractVersion: "1.0";
  scenarioId: string;
  syntheticOnly: true;
  fixedPrompt: string;
  expectedResponse: string;
  expectedToolTrajectory: ExpectedToolCall[];
  assertions: BehaviouralAssertion[];
  thresholdProfile: "strict-v1";
};

export type EvaluationDimension =
  | "telemetry_compatibility"
  | "trace_completeness"
  | "tool_trajectory_accuracy"
  | "behavioural_outcome"
  | "goal_success";

export type ThresholdPolicy = {
  contractVersion: "1.0";
  profileId: "strict-v1";
  minimumScores: Record<EvaluationDimension, number>;
};

export type EvaluationScore = {
  evaluatorId: `local.${EvaluationDimension}`;
  level: "session" | "trace" | "tool-call";
  score: number;
  threshold: number;
  passed: boolean;
  reasonCode: string;
};

export type AgentEvaluationReport = {
  contractVersion: "1.0";
  thresholdVersion: "1.0";
  evidenceLevel: "local-contract";
  scenarioId: string;
  convention: EvaluationConvention;
  sessionId: string;
  traceIds: string[];
  status: "passed" | "failed";
  scores: EvaluationScore[];
};
