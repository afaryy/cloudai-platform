import type {
  EvaluationTelemetrySpan,
  NormalizedEvaluationSession,
  NormalizedEvaluationTurn,
  NormalizedToolCall,
  TelemetryFixture
} from "./agentEvaluationTelemetryTypes.js";

export type AgentEvaluationTelemetryErrorCode =
  | "invalid_instrumentation_scope"
  | "missing_session_id"
  | "conflicting_session_id"
  | "missing_invoke_agent_span"
  | "missing_message_content"
  | "malformed_tool_arguments"
  | "duplicate_tool_call_id";

export class AgentEvaluationTelemetryError extends Error {
  constructor(public readonly code: AgentEvaluationTelemetryErrorCode) {
    super(code);
    this.name = "AgentEvaluationTelemetryError";
  }
}

type SpanRole = "invoke-agent" | "inference" | "execute-tool" | "context";

export function normalizeEvaluationTelemetry(fixture: TelemetryFixture): NormalizedEvaluationSession {
  validateScopes(fixture);
  const sessionId = extractSessionId(fixture.spans);
  const spansByTrace = groupByTrace(fixture.spans);
  let ignoredContextSpanCount = 0;

  const turns = [...spansByTrace.entries()]
    .sort(([, left], [, right]) => compareSpanTime(left[0]!, right[0]!))
    .map(([traceId, spans]) => {
      const classified = spans.map((span) => ({ span, role: classifySpan(fixture, span) }));
      ignoredContextSpanCount += classified.filter(({ role }) => role === "context").length;
      return normalizeTurn(
        fixture,
        traceId,
        classified.filter(({ role }) => role === "invoke-agent").map(({ span }) => span),
        classified.filter(({ role }) => role === "inference").map(({ span }) => span),
        classified.filter(({ role }) => role === "execute-tool").map(({ span }) => span)
      );
    });

  return {
    scenarioId: fixture.scenarioId,
    convention: fixture.convention,
    sessionId,
    turns,
    ignoredContextSpanCount
  };
}

function validateScopes(fixture: TelemetryFixture): void {
  const expectedPrefix = fixture.convention === "otel-genai"
    ? "opentelemetry.instrumentation."
    : "openinference.instrumentation.";

  if (fixture.spans.length === 0 || fixture.spans.some((span) => !span.scopeName.startsWith(expectedPrefix))) {
    throw new AgentEvaluationTelemetryError("invalid_instrumentation_scope");
  }
}

function extractSessionId(spans: EvaluationTelemetrySpan[]): string {
  const sessionIds = spans.map((span) => span.attributes["session.id"]);
  if (sessionIds.some((sessionId) => typeof sessionId !== "string" || sessionId.length === 0)) {
    throw new AgentEvaluationTelemetryError("missing_session_id");
  }

  const distinctSessionIds = new Set(sessionIds as string[]);
  if (distinctSessionIds.size !== 1) {
    throw new AgentEvaluationTelemetryError("conflicting_session_id");
  }

  return [...distinctSessionIds][0]!;
}

function groupByTrace(spans: EvaluationTelemetrySpan[]): Map<string, EvaluationTelemetrySpan[]> {
  const grouped = new Map<string, EvaluationTelemetrySpan[]>();
  for (const span of spans) {
    const current = grouped.get(span.traceId) ?? [];
    current.push(span);
    grouped.set(span.traceId, current);
  }
  return grouped;
}

function classifySpan(fixture: TelemetryFixture, span: EvaluationTelemetrySpan): SpanRole {
  if (fixture.convention === "otel-genai") {
    const operation = span.attributes["gen_ai.operation.name"];
    if (operation === "invoke_agent") return "invoke-agent";
    if (operation === "chat") return "inference";
    if (operation === "execute_tool") return "execute-tool";
    return "context";
  }

  const kind = span.attributes["openinference.span.kind"];
  if (kind === "AGENT" || kind === "CHAIN") return "invoke-agent";
  if (kind === "LLM") return "inference";
  if (kind === "TOOL") return "execute-tool";
  return "context";
}

function normalizeTurn(
  fixture: TelemetryFixture,
  traceId: string,
  invokeAgentSpans: EvaluationTelemetrySpan[],
  inferenceSpans: EvaluationTelemetrySpan[],
  toolSpans: EvaluationTelemetrySpan[]
): NormalizedEvaluationTurn {
  if (invokeAgentSpans.length !== 1) {
    throw new AgentEvaluationTelemetryError("missing_invoke_agent_span");
  }

  const invokeAgentSpan = invokeAgentSpans[0]!;
  const { prompt, response } = fixture.convention === "otel-genai"
    ? extractOtelAgentMessages(invokeAgentSpan)
    : extractOpenInferenceAgentMessages(invokeAgentSpan);
  const inferredToolCalls = fixture.convention === "openinference"
    ? extractOpenInferenceRequestedTools(inferenceSpans)
    : [];
  const toolCalls = toolSpans
    .sort(compareSpanTime)
    .map((span) => fixture.convention === "otel-genai"
      ? normalizeOtelTool(span)
      : normalizeOpenInferenceTool(span, inferredToolCalls));

  rejectDuplicateToolCallIds(toolCalls);
  return { traceId, prompt, response, toolCalls };
}

function extractOtelAgentMessages(span: EvaluationTelemetrySpan): { prompt: string; response: string } {
  const prompt = extractOtelText(span.attributes["gen_ai.input.messages"], "user");
  const response = extractOtelText(span.attributes["gen_ai.output.messages"], "assistant");
  if (!prompt || !response) {
    throw new AgentEvaluationTelemetryError("missing_message_content");
  }
  return { prompt, response };
}

function extractOtelText(value: unknown, role: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const messages = JSON.parse(value) as Array<{ role?: string; parts?: Array<{ type?: string; content?: string }> }>;
    const text = messages
      .filter((message) => message.role === role)
      .flatMap((message) => message.parts ?? [])
      .find((part) => part.type === "text" && typeof part.content === "string")?.content;
    return text ?? null;
  } catch {
    return null;
  }
}

function extractOpenInferenceAgentMessages(span: EvaluationTelemetrySpan): { prompt: string; response: string } {
  const prompt = span.attributes["input.value"];
  const response = span.attributes["output.value"];
  if (typeof prompt !== "string" || prompt.length === 0 || typeof response !== "string" || response.length === 0) {
    throw new AgentEvaluationTelemetryError("missing_message_content");
  }
  return { prompt, response };
}

function normalizeOtelTool(span: EvaluationTelemetrySpan): NormalizedToolCall {
  const name = span.attributes["gen_ai.tool.name"];
  const callId = span.attributes["gen_ai.tool.call.id"];
  const result = parseJsonRecord(span.attributes["gen_ai.tool.call.result"], "malformed_tool_arguments");
  if (typeof name !== "string" || name.length === 0) {
    throw new AgentEvaluationTelemetryError("malformed_tool_arguments");
  }
  return {
    name,
    callId: typeof callId === "string" && callId.length > 0 ? callId : null,
    arguments: parseJsonRecord(span.attributes["gen_ai.tool.call.arguments"], "malformed_tool_arguments"),
    status: normalizeToolStatus(result.status)
  };
}

type InferredToolCall = { name: string; callId: string | null; arguments: Record<string, unknown> };

function extractOpenInferenceRequestedTools(spans: EvaluationTelemetrySpan[]): InferredToolCall[] {
  const calls: InferredToolCall[] = [];
  for (const span of spans) {
    const nameKeys = Object.keys(span.attributes)
      .filter((key) => /^llm\.output_messages\.\d+\.message\.tool_calls\.\d+\.tool_call\.function\.name$/.test(key))
      .sort();
    for (const nameKey of nameKeys) {
      const name = span.attributes[nameKey];
      if (typeof name !== "string") continue;
      const base = nameKey.slice(0, -"function.name".length);
      const argumentsValue = span.attributes[`${base}function.arguments`];
      const callIdValue = span.attributes[`${base}id`];
      calls.push({
        name,
        callId: typeof callIdValue === "string" ? callIdValue : null,
        arguments: parseJsonRecord(argumentsValue, "malformed_tool_arguments")
      });
    }
  }
  return calls;
}

function normalizeOpenInferenceTool(
  span: EvaluationTelemetrySpan,
  inferredToolCalls: InferredToolCall[]
): NormalizedToolCall {
  const name = span.attributes["tool.name"];
  if (typeof name !== "string" || name.length === 0) {
    throw new AgentEvaluationTelemetryError("malformed_tool_arguments");
  }
  const argumentsValue = parseJsonRecord(span.attributes["input.value"], "malformed_tool_arguments");
  const result = parseJsonRecord(span.attributes["output.value"], "malformed_tool_arguments");
  const inferred = inferredToolCalls.find((call) =>
    call.name === name && recordsEqual(call.arguments, argumentsValue));
  return {
    name,
    callId: inferred?.callId ?? null,
    arguments: argumentsValue,
    status: normalizeToolStatus(result.status)
  };
}

function parseJsonRecord(value: unknown, errorCode: AgentEvaluationTelemetryErrorCode): Record<string, unknown> {
  if (typeof value !== "string") {
    throw new AgentEvaluationTelemetryError(errorCode);
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new AgentEvaluationTelemetryError(errorCode);
  }
}

function normalizeToolStatus(value: unknown): NormalizedToolCall["status"] {
  if (value === "denied" || value === "failed") return value;
  return "succeeded";
}

function rejectDuplicateToolCallIds(toolCalls: NormalizedToolCall[]): void {
  const ids = toolCalls.map((toolCall) => toolCall.callId).filter((callId): callId is string => callId !== null);
  if (new Set(ids).size !== ids.length) {
    throw new AgentEvaluationTelemetryError("duplicate_tool_call_id");
  }
}

function compareSpanTime(left: EvaluationTelemetrySpan, right: EvaluationTelemetrySpan): number {
  const leftTime = BigInt(left.startTimeUnixNano);
  const rightTime = BigInt(right.startTimeUnixNano);
  return leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
}

function recordsEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
