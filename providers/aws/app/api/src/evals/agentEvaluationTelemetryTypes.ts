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
