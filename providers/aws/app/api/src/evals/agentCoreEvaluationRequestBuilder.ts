import { createHash } from "node:crypto";

import {
  ProviderParityError,
  type ProviderEvaluationRequest,
  type ProviderParityPolicy
} from "./agentCoreEvaluationProviderTypes.js";
import type {
  EvaluationConvention,
  EvaluationScenario,
  EvaluationTelemetrySpan,
  TelemetryFixture
} from "./agentEvaluationTelemetryTypes.js";

const PROVIDER_ASSERTION_TEXT = {
  "citation-present": "The final answer cites the approved synthetic source."
} as const;

const EXPECTED_EVALUATORS = [
  "Builtin.Correctness",
  "Builtin.ToolSelectionAccuracy",
  "Builtin.GoalSuccessRate"
] as const;

const ATTRIBUTE_ALLOWLISTS = {
  "otel-genai": {
    "invoke-agent": new Set([
      "session.id",
      "gen_ai.operation.name",
      "gen_ai.input.messages",
      "gen_ai.output.messages"
    ]),
    inference: new Set([
      "session.id",
      "gen_ai.operation.name",
      "gen_ai.input.messages",
      "gen_ai.output.messages"
    ]),
    "execute-tool": new Set([
      "session.id",
      "gen_ai.operation.name",
      "gen_ai.tool.name",
      "gen_ai.tool.call.id",
      "gen_ai.tool.call.arguments",
      "gen_ai.tool.call.result"
    ])
  },
  openinference: {
    "invoke-agent": new Set([
      "session.id",
      "openinference.span.kind",
      "input.value",
      "output.value"
    ]),
    inference: new Set([
      "session.id",
      "openinference.span.kind",
      "llm.input_messages.0.message.role",
      "llm.input_messages.0.message.content",
      "llm.output_messages.0.message.role",
      "llm.output_messages.0.message.tool_calls.0.tool_call.function.name",
      "llm.output_messages.0.message.tool_calls.0.tool_call.function.arguments",
      "llm.output_messages.0.message.tool_calls.0.tool_call.id"
    ]),
    "execute-tool": new Set([
      "session.id",
      "openinference.span.kind",
      "tool.name",
      "input.value",
      "output.value"
    ])
  }
} as const;

type SpanRole = "invoke-agent" | "inference" | "execute-tool";

type DerivedProviderIds = {
  traceId: string;
  spanIds: Record<string, string>;
};

export function buildProviderEvaluationRequests(
  fixture: TelemetryFixture,
  scenario: EvaluationScenario,
  policy: ProviderParityPolicy
): ProviderEvaluationRequest[] {
  validatePolicy(policy);
  validateScenario(scenario);
  const reviewed = validateFixture(fixture);
  const ids = deriveProviderIds(fixture.scenarioId, fixture.convention, fixture.spans.map((span) => span.spanId));
  const sessionSpans = fixture.spans.map((span) => mapSpan(span, reviewed.sessionId, ids));
  const toolSpanId = ids.spanIds[reviewed.toolSpan.spanId]!;

  return [
    {
      evaluatorId: "Builtin.Correctness",
      evaluationInput: { sessionSpans },
      evaluationTarget: { traceIds: [ids.traceId] },
      evaluationReferenceInputs: [{
        context: { spanContext: { sessionId: reviewed.sessionId, traceId: ids.traceId } },
        expectedResponse: { text: scenario.expectedResponse }
      }]
    },
    {
      evaluatorId: "Builtin.ToolSelectionAccuracy",
      evaluationInput: { sessionSpans },
      evaluationTarget: { spanIds: [toolSpanId] },
      evaluationReferenceInputs: [{
        context: { spanContext: { sessionId: reviewed.sessionId, traceId: ids.traceId, spanId: toolSpanId } },
        expectedTrajectory: { toolNames: [scenario.expectedToolTrajectory[0]!.name] }
      }]
    },
    {
      evaluatorId: "Builtin.GoalSuccessRate",
      evaluationInput: { sessionSpans },
      evaluationReferenceInputs: [{
        context: { spanContext: { sessionId: reviewed.sessionId } },
        assertions: [{ text: PROVIDER_ASSERTION_TEXT["citation-present"] }]
      }]
    }
  ];
}

export function deriveProviderIds(
  scenarioId: string,
  convention: EvaluationConvention,
  originalSpanIds: string[]
): DerivedProviderIds {
  return {
    traceId: hexId(32, "cloudai-provider-parity-trace-v1", scenarioId, convention),
    spanIds: Object.fromEntries(originalSpanIds.map((spanId) => [
      spanId,
      hexId(16, "cloudai-provider-parity-span-v1", scenarioId, convention, spanId)
    ]))
  };
}

function validatePolicy(policy: ProviderParityPolicy): void {
  if (policy.maximumProviderCalls !== 6) {
    throw new ProviderParityError("provider_call_count_invalid");
  }

  const thresholds = policy.evaluatorThresholds as unknown;
  if (!isRecord(thresholds) ||
    policy.contractVersion !== "1.0" ||
    policy.profileId !== "provider-parity-v1" ||
    policy.scenarioId !== "synthetic-cited-answer" ||
    policy.maximumParityDelta !== 0.2 ||
    !sameStrings(Object.keys(thresholds), EXPECTED_EVALUATORS) ||
    thresholds["Builtin.Correctness"] !== 0.7 ||
    thresholds["Builtin.ToolSelectionAccuracy"] !== 0.7 ||
    thresholds["Builtin.GoalSuccessRate"] !== 0.7) {
    throw new ProviderParityError("provider_policy_invalid");
  }
}

function validateScenario(scenario: EvaluationScenario): void {
  if (scenario.contractVersion !== "1.0" ||
    scenario.scenarioId !== "synthetic-cited-answer" ||
    scenario.syntheticOnly !== true ||
    typeof scenario.expectedResponse !== "string" ||
    scenario.expectedResponse.length === 0 ||
    scenario.expectedToolTrajectory.length !== 1 ||
    scenario.expectedToolTrajectory[0]!.name !== "knowledge_search" ||
    scenario.assertions.length !== 1 ||
    scenario.assertions[0] !== "citation-present") {
    throw new ProviderParityError("provider_scenario_not_allowed");
  }
}

function validateFixture(fixture: TelemetryFixture): {
  sessionId: string;
  toolSpan: EvaluationTelemetrySpan;
} {
  if (fixture.contractVersion !== "1.0" ||
    fixture.scenarioId !== "synthetic-cited-answer" ||
    (fixture.convention !== "otel-genai" && fixture.convention !== "openinference")) {
    throw new ProviderParityError("provider_fixture_not_synthetic");
  }

  const scopePrefix = fixture.convention === "otel-genai"
    ? "opentelemetry.instrumentation."
    : "openinference.instrumentation.";
  if (fixture.spans.length === 0 || fixture.spans.some((span) => !span.scopeName.startsWith(scopePrefix))) {
    throw new ProviderParityError("provider_scope_not_allowed");
  }

  const sessionIds = fixture.spans.map((span) => span.attributes["session.id"]);
  if (sessionIds.some((sessionId) => typeof sessionId !== "string" || sessionId.length === 0) ||
    new Set(sessionIds).size !== 1) {
    throw new ProviderParityError("provider_session_count_invalid");
  }

  const classified = fixture.spans.map((span) => ({ span, role: classifySpan(fixture.convention, span) }));
  for (const { span, role } of classified) {
    if (role) validateAttributes(fixture.convention, role, span);
  }

  const agentSpans = classified.filter(({ role }) => role === "invoke-agent").map(({ span }) => span);
  const inferenceSpans = classified.filter(({ role }) => role === "inference").map(({ span }) => span);
  const toolSpans = classified.filter(({ role }) => role === "execute-tool").map(({ span }) => span);
  if (agentSpans.length !== 1 || inferenceSpans.length !== 1 || toolSpans.length !== 1 ||
    fixture.spans.length !== 3 || new Set(fixture.spans.map((span) => span.spanId)).size !== fixture.spans.length ||
    !hasReviewedParents(agentSpans[0]!, inferenceSpans[0]!, toolSpans[0]!)) {
    throw new ProviderParityError("provider_required_span_missing");
  }

  return { sessionId: sessionIds[0] as string, toolSpan: toolSpans[0]! };
}

function validateAttributes(
  convention: EvaluationConvention,
  role: SpanRole,
  span: EvaluationTelemetrySpan
): void {
  const allowed = ATTRIBUTE_ALLOWLISTS[convention][role];
  if (Object.keys(span.attributes).some((key) => !allowed.has(key))) {
    throw new ProviderParityError("provider_attribute_not_allowed");
  }
}

function classifySpan(convention: EvaluationConvention, span: EvaluationTelemetrySpan): SpanRole | null {
  if (convention === "otel-genai") {
    switch (span.attributes["gen_ai.operation.name"]) {
      case "invoke_agent": return "invoke-agent";
      case "chat": return "inference";
      case "execute_tool": return "execute-tool";
      default: return null;
    }
  }

  switch (span.attributes["openinference.span.kind"]) {
    case "AGENT": return "invoke-agent";
    case "LLM": return "inference";
    case "TOOL": return "execute-tool";
    default: return null;
  }
}

function hasReviewedParents(
  agent: EvaluationTelemetrySpan,
  inference: EvaluationTelemetrySpan,
  tool: EvaluationTelemetrySpan
): boolean {
  return agent.parentSpanId === null &&
    inference.parentSpanId === agent.spanId &&
    tool.parentSpanId === agent.spanId;
}

function mapSpan(
  source: EvaluationTelemetrySpan,
  sessionId: string,
  ids: DerivedProviderIds
): Record<string, unknown> {
  const role = classifySpanFromKnownSource(source);
  const parentSpanId = source.parentSpanId === null ? undefined : ids.spanIds[source.parentSpanId];
  return {
    traceId: ids.traceId,
    spanId: ids.spanIds[source.spanId],
    ...(parentSpanId ? { parentSpanId } : {}),
    name: role,
    kind: 1,
    startTimeUnixNano: source.startTimeUnixNano,
    endTimeUnixNano: (BigInt(source.startTimeUnixNano) + 1n).toString(),
    attributes: { ...source.attributes, "session.id": sessionId },
    scope: { name: source.scopeName, version: "1.0.0" },
    resource: {
      attributes: {
        "service.name": "cloudai-provider-parity-synthetic",
        "cloudai.data.scope": "synthetic-only"
      }
    },
    status: { code: 1 }
  };
}

function classifySpanFromKnownSource(source: EvaluationTelemetrySpan): SpanRole {
  if (source.attributes["gen_ai.operation.name"] === "invoke_agent" || source.attributes["openinference.span.kind"] === "AGENT") {
    return "invoke-agent";
  }
  if (source.attributes["gen_ai.operation.name"] === "chat" || source.attributes["openinference.span.kind"] === "LLM") {
    return "inference";
  }
  return "execute-tool";
}

function hexId(width: 16 | 32, ...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, width);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameStrings(actual: string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.sort().every((value, index) => value === [...expected].sort()[index]);
}
