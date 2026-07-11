import { MockBedrockClient } from "../clients/mockBedrockClient.js";
import { HttpError } from "../lib/errors.js";
import { buildRequestLogEvent } from "../lib/requestLogger.js";
import { enforceInputTokenBudget } from "../lib/tokenBudget.js";
import { normalizeChatRequest } from "../lib/validation.js";
import { postChat } from "../routes/chat.js";
import { postRagQuery } from "../routes/ragQuery.js";

export type MockGatewayEvalCategory =
  | "contract"
  | "guardrail"
  | "metadata"
  | "observability";

export type MockGatewayEvalResult = {
  id: string;
  category: MockGatewayEvalCategory;
  description: string;
  passed: boolean;
  evidence: string;
};

export type MockGatewayEvalReport = {
  mode: "mock";
  evaluatedAt: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  results: MockGatewayEvalResult[];
};

export async function runMockGatewayEvals(evaluatedAt = "2026-07-10T00:00:00.000Z"): Promise<MockGatewayEvalReport> {
  const results: MockGatewayEvalResult[] = [
    await evaluateAllowedChatRequest(),
    evaluateTokenBudgetBlockedRequest(),
    evaluateUnsupportedModelRequest(),
    await evaluateResponseMetadataPresent(),
    evaluateRequestLogOmitsPrompt(),
    evaluateGovernedRagQueryContract()
  ];
  const passedCases = results.filter((result) => result.passed).length;

  return {
    mode: "mock",
    evaluatedAt,
    totalCases: results.length,
    passedCases,
    failedCases: results.length - passedCases,
    results
  };
}

async function evaluateAllowedChatRequest(): Promise<MockGatewayEvalResult> {
  const response = await postChat(new MockBedrockClient(), {
    prompt: "Summarize the CloudAI control plane for a platform demo.",
    modelName: "mock-bedrock-claude"
  });
  const passed = response.response.includes("Mock CloudAI response")
    && response.metadata.modelName === "mock-bedrock-claude";

  return {
    id: "allowed-chat-request",
    category: "contract",
    description: "Allowed chat request returns a mock response through the gateway contract.",
    passed,
    evidence: passed
      ? "Mock response and selected model metadata were returned."
      : "Mock response contract or selected model metadata was missing."
  };
}

function evaluateTokenBudgetBlockedRequest(): MockGatewayEvalResult {
  const prompt = Array.from({ length: 70 }, (_, index) => `word${index}`).join(" ");
  const passed = catchesHttpError(() => enforceInputTokenBudget(prompt), "token_budget_exceeded");

  return {
    id: "token-budget-blocked-request",
    category: "guardrail",
    description: "Oversized prompt is blocked by the synthetic token budget guardrail.",
    passed,
    evidence: passed
      ? "Token budget guardrail returned token_budget_exceeded."
      : "Token budget guardrail did not return the expected decision."
  };
}

function evaluateUnsupportedModelRequest(): MockGatewayEvalResult {
  const passed = catchesHttpError(
    () => normalizeChatRequest({
      prompt: "Summarize the CloudAI control plane.",
      modelName: "mock-unsupported-model"
    }),
    "unsupported_model"
  );

  return {
    id: "unsupported-model-request",
    category: "guardrail",
    description: "Unsupported model request is rejected by the local policy profile.",
    passed,
    evidence: passed
      ? "Policy validation returned unsupported_model."
      : "Policy validation did not return the expected decision."
  };
}

async function evaluateResponseMetadataPresent(): Promise<MockGatewayEvalResult> {
  const response = await postChat(new MockBedrockClient(), {
    prompt: "Summarize the CloudAI control plane.",
    modelName: "mock-bedrock-claude"
  });
  const metadata = response.metadata;
  const passed = Boolean(
    metadata.requestId
    && metadata.modelName
    && metadata.estimatedInputTokens > 0
    && metadata.estimatedOutputTokens > 0
    && metadata.estimatedCostUsd >= 0
    && !Number.isNaN(Date.parse(metadata.timestamp))
  );

  return {
    id: "response-metadata-present",
    category: "metadata",
    description: "Mock response includes metadata for traceability, token estimates, and cost signals.",
    passed,
    evidence: passed
      ? "Response metadata included request, model, token, cost, and timestamp fields."
      : "Response metadata was incomplete."
  };
}

function evaluateRequestLogOmitsPrompt(): MockGatewayEvalResult {
  const event = buildRequestLogEvent({
    requestId: "req_eval_0001",
    method: "POST",
    route: "/chat",
    statusCode: 200,
    durationMs: 12.4,
    timestamp: "2026-07-10T00:00:00.000Z",
    modelName: "mock-bedrock-claude",
    estimatedInputTokens: 12,
    estimatedOutputTokens: 17,
    estimatedCostUsd: 0.000046
  });
  const serialized = JSON.stringify(event);
  const passed = !("prompt" in event)
    && !("requestBody" in event)
    && !serialized.includes("Summarize the CloudAI control plane");

  return {
    id: "request-log-omits-prompt",
    category: "observability",
    description: "Structured request log event keeps prompt text and request bodies out of observability examples.",
    passed,
    evidence: passed
      ? "Request log event contains metadata only."
      : "Request log event included prompt-like payload content."
  };
}

function evaluateGovernedRagQueryContract(): MockGatewayEvalResult {
  const query = "Summarize the CloudAI gateway guardrails from the demo handbook.";
  const response = postRagQuery({
    requestId: "rag_req_eval_0001",
    query,
    dataClassification: "synthetic-public",
    retrieval: {
      allowedKnowledgeBases: ["demo-platform-handbook"],
      maxDocuments: 3,
      requiredMetadata: [
        "sourceId",
        "sourceTitle",
        "classification",
        "citationUrl",
        "retrievedAt"
      ]
    },
    governance: {
      requireCitations: true,
      allowExternalEgress: false,
      policyProfile: "rag-demo-governed"
    }
  });
  const serializedResponse = JSON.stringify(response);
  const citation = response.response.citations[0];
  const egressDecision = response.governance.egressDecision;
  const audit = response.audit;
  const passed = response.response.citations.length === 1
    && citation?.sourceId === "demo-platform-handbook-001"
    && citation.sourceTitle === "CloudAI Demo Platform Handbook"
    && citation.citationUrl === "https://example.com/cloudai-platform/demo-platform-handbook"
    && response.governance.citationRequirementMet
    && egressDecision.allowed
    && egressDecision.scope === "controlled_response"
    && egressDecision.reason === "controlled_response_allowed_with_synthetic_sources"
    && audit.requestId === "rag_req_eval_0001"
    && audit.policyProfile === "rag-demo-governed"
    && audit.evaluatedAt === "2026-07-10T00:00:00.000Z"
    && !serializedResponse.includes(query);

  return {
    id: "governed-rag-query-contract",
    category: "contract",
    description: "Mock governed RAG query returns citation, egress decision, and audit evidence without echoing query text.",
    passed,
    evidence: passed
      ? "RAG response included citation, egress decision, and audit evidence without query text echo."
      : "RAG response contract evidence was missing or query text was echoed."
  };
}

function catchesHttpError(fn: () => unknown, code: string): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof HttpError && error.code === code;
  }
}
