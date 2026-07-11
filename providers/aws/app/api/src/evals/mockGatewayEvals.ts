import { MockBedrockClient } from "../clients/mockBedrockClient.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { HttpError } from "../lib/errors.js";
import { buildRequestLogEvent } from "../lib/requestLogger.js";
import { enforceInputTokenBudget } from "../lib/tokenBudget.js";
import { authoriseAgentAction } from "../lib/agentOpsPolicy.js";
import { normalizeChatRequest } from "../lib/validation.js";
import { postChat } from "../routes/chat.js";
import { postGuardrailAssessment } from "../routes/guardrailAssessment.js";
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
    evaluateGovernedRagQueryContract(),
    evaluateAgentOpsRuntimeDecisionContract(),
    await evaluateCapabilityAdmissionGovernance(),
    evaluateRagKnowledgeLifecycleGovernance(),
    evaluateGuardrailsAsAServiceContract()
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

function evaluateAgentOpsRuntimeDecisionContract(): MockGatewayEvalResult {
  const decision = authoriseAgentAction({
    requestId: "agent_req_eval_0001",
    session: {
      sessionId: "agent_session_eval_0001",
      agentId: "demo-knowledge-agent",
      owner: "platform-demo-owner",
      delegatedUser: "synthetic-user",
      riskTier: "standard",
      status: "active"
    },
    action: {
      toolId: "knowledge-search",
      actionClass: "read",
      leastPrivilegeScope: "synthetic-public-knowledge"
    },
    governance: {
      policyProfile: "agentops-demo-governed",
      approvalId: null,
      budgetLimit: 10,
      budgetConsumed: 2
    }
  });
  const serializedDecision = JSON.stringify(decision);
  const passed = decision.decision.verdict === "allow"
    && decision.decision.reasonCode === "read_only_action_allowed"
    && decision.audit.traceId === "trace_agent_req_eval_0001"
    && decision.runtimeControl.budgetRemaining === 8
    && !serializedDecision.includes("toolInput")
    && !serializedDecision.includes("executionResult");

  return {
    id: "agentops-runtime-decision-contract",
    category: "contract",
    description: "Mock AgentOps authorisation returns a policy verdict and audit metadata without tool execution.",
    passed,
    evidence: passed
      ? "Allowed read action returned policy verdict, audit metadata, and no tool execution."
      : "AgentOps decision evidence was incomplete or included execution-like payloads."
  };
}

async function evaluateCapabilityAdmissionGovernance(): Promise<MockGatewayEvalResult> {
  const directory = resolve(process.cwd(), "../../../../shared/examples/agent-capability-governance");
  const [approvedEvidence, approvedDecision, blockedEvidence, blockedDecision, reviewEvidence, reviewDecision] = await Promise.all([
    readJsonFixture("knowledge-search.evidence.json", directory),
    readJsonFixture("knowledge-search.decision.json", directory),
    readJsonFixture("external-export.evidence.json", directory),
    readJsonFixture("external-export.decision.json", directory),
    readJsonFixture("change-summary.evidence.json", directory),
    readJsonFixture("change-summary.decision.json", directory)
  ]);
  const approvedEligibleForRuntime = approvedDecision.decision === "approved";
  const passed = approvedEvidence.scan.status === "passed"
    && approvedEvidence.evaluation.status === "passed"
    && approvedEligibleForRuntime
    && blockedEvidence.scan.status === "failed"
    && blockedDecision.decision === "blocked"
    && reviewEvidence.scan.status === "passed"
    && reviewDecision.decision === "approval-required"
    && reviewDecision.decision !== "approved";

  return {
    id: "capability-admission-governance",
    category: "contract",
    description: "Mock capability admission keeps approved, blocked, and approval-required reusable agent capabilities distinct.",
    passed,
    evidence: passed
      ? "Synthetic capability evidence preserved approved, blocked, and approval-required outcomes; only the approved asset is eligible for a future runtime action."
      : "Synthetic capability evidence did not preserve the required admission outcomes."
  };
}

function evaluateRagKnowledgeLifecycleGovernance(): MockGatewayEvalResult {
  const activeResponse = postRagQuery({
    requestId: "rag_lifecycle_eval_0001",
    query: "Summarize the active synthetic platform handbook.",
    dataClassification: "synthetic-public",
    retrieval: {
      allowedKnowledgeBases: ["demo-platform-handbook"],
      maxDocuments: 1,
      requiredMetadata: ["sourceId", "sourceTitle", "classification", "citationUrl", "retrievedAt"]
    },
    governance: {
      requireCitations: true,
      allowExternalEgress: false,
      policyProfile: "rag-demo-governed"
    }
  });
  const retiredBlocked = catchesHttpError(
    () => postRagQuery({
      requestId: "rag_lifecycle_eval_0002",
      query: "Summarize the retired synthetic platform handbook.",
      dataClassification: "synthetic-public",
      retrieval: {
        allowedKnowledgeBases: ["legacy-platform-handbook"],
        maxDocuments: 1,
        requiredMetadata: ["sourceId", "sourceTitle", "classification", "citationUrl", "retrievedAt"]
      },
      governance: {
        requireCitations: true,
        allowExternalEgress: false,
        policyProfile: "rag-demo-governed"
      }
    }),
    "retired_knowledge_source"
  );
  const passed = activeResponse.retrieval.sources[0]?.sourceId === "demo-platform-handbook-001"
    && retiredBlocked;

  return {
    id: "rag-knowledge-lifecycle-governance",
    category: "contract",
    description: "Mock RAG lifecycle allows an active source and blocks a retired source before response generation.",
    passed,
    evidence: passed
      ? "Active source returned governed evidence and retired source cannot produce a governed RAG response."
      : "RAG lifecycle did not preserve the active and retired source boundary."
  };
}

function evaluateGuardrailsAsAServiceContract(): MockGatewayEvalResult {
  const safeVerdict = postGuardrailAssessment({
    requestId: "guardrail_eval_safe_0001",
    policyProfile: "guardrails-demo",
    surface: "model-gateway",
    syntheticSignals: ["none"]
  });
  const piiVerdict = postGuardrailAssessment({
    requestId: "guardrail_eval_pii_0001",
    policyProfile: "guardrails-demo",
    surface: "rag",
    syntheticSignals: ["pii-detected"]
  });
  const jailbreakVerdict = postGuardrailAssessment({
    requestId: "guardrail_eval_jailbreak_0001",
    policyProfile: "guardrails-demo",
    surface: "agent-action",
    syntheticSignals: ["jailbreak-attempt"]
  });
  const highRiskVerdict = postGuardrailAssessment({
    requestId: "guardrail_eval_high_risk_0001",
    policyProfile: "guardrails-demo",
    surface: "delivery",
    syntheticSignals: ["high-risk-action"]
  });
  const serializedVerdicts = JSON.stringify([safeVerdict, piiVerdict, jailbreakVerdict, highRiskVerdict]);
  const passed = safeVerdict.verdict === "allow"
    && piiVerdict.verdict === "redact"
    && jailbreakVerdict.verdict === "deny"
    && highRiskVerdict.verdict === "approval-required"
    && !serializedVerdicts.includes("\"content\"")
    && !serializedVerdicts.includes("\"prompt\"");

  return {
    id: "guardrails-as-a-service-contract",
    category: "guardrail",
    description: "Mock GaaS converts synthetic risk signals into platform guardrail verdicts without inspecting raw content.",
    passed,
    evidence: passed
      ? "Synthetic PII, jailbreak, high-risk, and safe signals produced redaction, denial, approval, and allow verdicts without raw content."
      : "Synthetic guardrail signals did not produce the expected metadata-only verdicts."
  };
}

async function readJsonFixture(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function catchesHttpError(fn: () => unknown, code: string): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof HttpError && error.code === code;
  }
}
