import type {
  AgentActionAuthorisationRequest,
  AgentActionClass,
  AgentRiskTier,
  AgentSessionStatus,
  ChatRequest,
  GuardrailAssessmentRequest,
  GuardrailSurface,
  GuardrailSyntheticSignal,
  RagGovernanceRequest,
  WorkflowAcceptanceCheck,
  WorkflowRunRequest
} from "../types.js";
import { HttpError } from "./errors.js";
import {
  DEFAULT_POLICY_PROFILE,
  isModelAllowed,
  type MockPolicyProfile
} from "./policyProfile.js";

const RAG_REQUEST_KEYS = ["requestId", "query", "dataClassification", "retrieval", "governance"] as const;
const RAG_RETRIEVAL_KEYS = ["allowedKnowledgeBases", "maxDocuments", "requiredMetadata"] as const;
const RAG_GOVERNANCE_KEYS = ["requireCitations", "allowExternalEgress", "policyProfile"] as const;
const RAG_REQUIRED_METADATA_VALUES = [
  "sourceId",
  "sourceTitle",
  "classification",
  "citationUrl",
  "retrievedAt"
] as const;
const AGENTOPS_REQUEST_KEYS = ["requestId", "session", "action", "governance"] as const;
const AGENTOPS_SESSION_KEYS = ["sessionId", "agentId", "owner", "delegatedUser", "riskTier", "status"] as const;
const AGENTOPS_ACTION_KEYS = ["toolId", "actionClass", "leastPrivilegeScope"] as const;
const AGENTOPS_GOVERNANCE_KEYS = ["policyProfile", "approvalId", "budgetLimit", "budgetConsumed"] as const;
const GUARDRAIL_REQUEST_KEYS = ["requestId", "policyProfile", "surface", "syntheticSignals"] as const;
const WORKFLOW_REQUEST_KEYS = [
  "workflowId", "objective", "owner", "riskTier", "agentAction", "capability", "knowledgeSource", "guardrails", "acceptanceChecks"
] as const;
const WORKFLOW_CAPABILITY_KEYS = ["capabilityId", "admissionStatus"] as const;
const WORKFLOW_SOURCE_KEYS = ["sourceId", "allowedKnowledgeBase"] as const;
const WORKFLOW_ACCEPTANCE_CHECKS: WorkflowAcceptanceCheck[] = [
  "capability-admitted", "source-active", "guardrails-allow", "within-budget"
];

export function normalizeChatRequest(
  input: unknown,
  profile: MockPolicyProfile = DEFAULT_POLICY_PROFILE
): Required<ChatRequest> {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }

  if (typeof input.prompt !== "string") {
    throw new HttpError(400, "prompt is required and must be a string.", "invalid_prompt");
  }

  const prompt = input.prompt.trim();
  if (prompt.length === 0) {
    throw new HttpError(400, "prompt must not be empty.", "empty_prompt");
  }

  if (prompt.length > profile.maxPromptCharacters) {
    throw new HttpError(
      400,
      `prompt must be ${profile.maxPromptCharacters} characters or fewer.`,
      "prompt_too_long"
    );
  }

  const modelName = typeof input.modelName === "string" && input.modelName.trim().length > 0
    ? input.modelName.trim()
    : profile.defaultModelName;

  if (!isModelAllowed(modelName, profile)) {
    throw new HttpError(400, "modelName is not supported in mock mode.", "unsupported_model");
  }

  return { prompt, modelName };
}

export function normalizeRagGovernanceRequest(input: unknown): RagGovernanceRequest {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }

  assertOnlyKeys(input, RAG_REQUEST_KEYS, "request");

  const requestId = readRequiredString(input, "requestId", "invalid_rag_request");
  const query = readRequiredString(input, "query", "invalid_rag_query").trim();

  if (query.length === 0) {
    throw new HttpError(400, "query must not be empty.", "empty_rag_query");
  }

  const dataClassification = readDataClassification(input.dataClassification);
  const retrieval = readRetrieval(input.retrieval);
  const governance = readGovernance(input.governance);

  return {
    requestId,
    query,
    dataClassification,
    retrieval,
    governance
  };
}

export function normalizeAgentActionAuthorisationRequest(input: unknown): AgentActionAuthorisationRequest {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }

  assertOnlyKeys(input, AGENTOPS_REQUEST_KEYS, "request", "invalid_agent_action_request");

  return {
    requestId: readRequiredString(input, "requestId", "invalid_agent_action_request").trim(),
    session: readAgentSession(input.session),
    action: readAgentAction(input.action),
    governance: readAgentGovernance(input.governance)
  };
}

export function normalizeGuardrailAssessmentRequest(input: unknown): GuardrailAssessmentRequest {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }

  assertOnlyKeys(input, GUARDRAIL_REQUEST_KEYS, "request", "invalid_guardrail_assessment_request");

  return {
    requestId: readRequiredString(input, "requestId", "invalid_guardrail_assessment_request").trim(),
    policyProfile: readRequiredString(input, "policyProfile", "invalid_guardrail_assessment_request").trim(),
    surface: readGuardrailSurface(input.surface),
    syntheticSignals: readGuardrailSignals(input.syntheticSignals)
  };
}

export function normalizeWorkflowRunRequest(input: unknown): WorkflowRunRequest {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_workflow_run_request");
  }

  assertOnlyKeys(input, WORKFLOW_REQUEST_KEYS, "request", "invalid_workflow_run_request");
  const objective = readRequiredString(input, "objective", "invalid_workflow_run_request").trim();
  if (objective.length === 0) {
    throw new HttpError(400, "objective must not be empty.", "invalid_workflow_run_request");
  }

  return {
    workflowId: readRequiredString(input, "workflowId", "invalid_workflow_run_request").trim(),
    objective,
    owner: readRequiredString(input, "owner", "invalid_workflow_run_request").trim(),
    riskTier: readAgentRiskTier(input.riskTier),
    agentAction: {
      requestId: readWorkflowAgentActionRequestId(input.agentAction),
      session: readAgentSession(requireRecord(input.agentAction, "agentAction" ).session),
      action: readAgentAction(requireRecord(input.agentAction, "agentAction").action),
      governance: readAgentGovernance(requireRecord(input.agentAction, "agentAction").governance)
    },
    capability: readWorkflowCapability(input.capability),
    knowledgeSource: readWorkflowKnowledgeSource(input.knowledgeSource),
    guardrails: readWorkflowGuardrails(input.guardrails),
    acceptanceChecks: readWorkflowAcceptanceChecks(input.acceptanceChecks)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  input: Record<string, unknown>,
  key: string,
  errorCode: string
): string {
  if (typeof input[key] !== "string") {
    throw new HttpError(400, `${key} is required and must be a string.`, errorCode);
  }

  return input[key];
}

function readDataClassification(value: unknown): RagGovernanceRequest["dataClassification"] {
  if (value === "synthetic-public" || value === "synthetic-restricted") {
    return value;
  }

  throw new HttpError(400, "dataClassification is not supported in mock mode.", "invalid_rag_request");
}

function readRetrieval(value: unknown): RagGovernanceRequest["retrieval"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "retrieval is required and must be an object.", "invalid_rag_request");
  }

  assertOnlyKeys(value, RAG_RETRIEVAL_KEYS, "retrieval");

  if (typeof value.maxDocuments !== "number" || value.maxDocuments < 1) {
    throw new HttpError(400, "retrieval.maxDocuments must be a positive number.", "invalid_rag_request");
  }

  return {
    allowedKnowledgeBases: readStringArray(value.allowedKnowledgeBases, "retrieval.allowedKnowledgeBases"),
    maxDocuments: value.maxDocuments,
    requiredMetadata: readStringArray(
      value.requiredMetadata,
      "retrieval.requiredMetadata",
      [...RAG_REQUIRED_METADATA_VALUES]
    )
  };
}

function readGovernance(value: unknown): RagGovernanceRequest["governance"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "governance is required and must be an object.", "invalid_rag_request");
  }

  assertOnlyKeys(value, RAG_GOVERNANCE_KEYS, "governance");

  if (typeof value.requireCitations !== "boolean") {
    throw new HttpError(400, "governance.requireCitations must be a boolean.", "invalid_rag_request");
  }

  if (typeof value.allowExternalEgress !== "boolean") {
    throw new HttpError(400, "governance.allowExternalEgress must be a boolean.", "invalid_rag_request");
  }

  if (typeof value.policyProfile !== "string" || value.policyProfile.trim().length === 0) {
    throw new HttpError(400, "governance.policyProfile is required and must be a string.", "invalid_rag_request");
  }

  return {
    requireCitations: value.requireCitations,
    allowExternalEgress: value.allowExternalEgress,
    policyProfile: value.policyProfile.trim()
  };
}

function assertOnlyKeys(
  input: Record<string, unknown>,
  allowedKeys: readonly string[],
  objectName: string,
  errorCode = "invalid_rag_request"
): void {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.includes(key)) {
      throw new HttpError(400, `${objectName}.${key} is not supported in mock mode.`, errorCode);
    }
  }
}

function readStringArray(value: unknown, fieldName: string, allowedValues?: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, `${fieldName} must include at least one item.`, "invalid_rag_request");
  }

  if (!value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw new HttpError(400, `${fieldName} must contain only non-empty strings.`, "invalid_rag_request");
  }

  const normalized = value.map((item) => item.trim());

  if (allowedValues && !normalized.every((item) => allowedValues.includes(item))) {
    throw new HttpError(400, `${fieldName} contains an unsupported value.`, "invalid_rag_request");
  }

  return normalized;
}

function readAgentSession(value: unknown): AgentActionAuthorisationRequest["session"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "session is required and must be an object.", "invalid_agent_action_request");
  }

  assertOnlyKeys(value, AGENTOPS_SESSION_KEYS, "session", "invalid_agent_action_request");

  return {
    sessionId: readRequiredString(value, "sessionId", "invalid_agent_action_request").trim(),
    agentId: readRequiredString(value, "agentId", "invalid_agent_action_request").trim(),
    owner: readRequiredString(value, "owner", "invalid_agent_action_request").trim(),
    delegatedUser: readRequiredString(value, "delegatedUser", "invalid_agent_action_request").trim(),
    riskTier: readAgentRiskTier(value.riskTier),
    status: readAgentSessionStatus(value.status)
  };
}

function requireRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpError(400, `${fieldName} is required and must be an object.`, "invalid_workflow_run_request");
  }

  return value;
}

function readWorkflowAgentActionRequestId(value: unknown): string {
  const agentAction = requireRecord(value, "agentAction");
  assertOnlyKeys(agentAction, AGENTOPS_REQUEST_KEYS, "agentAction", "invalid_workflow_run_request");
  return readRequiredString(agentAction, "requestId", "invalid_workflow_run_request").trim();
}

function readWorkflowCapability(value: unknown): WorkflowRunRequest["capability"] {
  const capability = requireRecord(value, "capability");
  assertOnlyKeys(capability, WORKFLOW_CAPABILITY_KEYS, "capability", "invalid_workflow_run_request");
  if (capability.admissionStatus !== "admitted" && capability.admissionStatus !== "blocked") {
    throw new HttpError(400, "capability.admissionStatus is not supported in mock mode.", "invalid_workflow_run_request");
  }

  return {
    capabilityId: readRequiredString(capability, "capabilityId", "invalid_workflow_run_request").trim(),
    admissionStatus: capability.admissionStatus
  };
}

function readWorkflowKnowledgeSource(value: unknown): WorkflowRunRequest["knowledgeSource"] {
  const source = requireRecord(value, "knowledgeSource");
  assertOnlyKeys(source, WORKFLOW_SOURCE_KEYS, "knowledgeSource", "invalid_workflow_run_request");
  return {
    sourceId: readRequiredString(source, "sourceId", "invalid_workflow_run_request").trim(),
    allowedKnowledgeBase: readRequiredString(source, "allowedKnowledgeBase", "invalid_workflow_run_request").trim()
  };
}

function readWorkflowGuardrails(value: unknown): GuardrailAssessmentRequest {
  const guardrails = requireRecord(value, "guardrails");
  assertOnlyKeys(guardrails, GUARDRAIL_REQUEST_KEYS, "guardrails", "invalid_workflow_run_request");
  return {
    requestId: readRequiredString(guardrails, "requestId", "invalid_workflow_run_request").trim(),
    policyProfile: readRequiredString(guardrails, "policyProfile", "invalid_workflow_run_request").trim(),
    surface: readGuardrailSurface(guardrails.surface),
    syntheticSignals: readGuardrailSignals(guardrails.syntheticSignals)
  };
}

function readWorkflowAcceptanceChecks(value: unknown): WorkflowAcceptanceCheck[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => WORKFLOW_ACCEPTANCE_CHECKS.includes(item as WorkflowAcceptanceCheck))) {
    throw new HttpError(400, "acceptanceChecks must contain supported workflow checks.", "invalid_workflow_run_request");
  }

  if (new Set(value).size !== value.length) {
    throw new HttpError(400, "acceptanceChecks must not contain duplicates.", "invalid_workflow_run_request");
  }

  return value as WorkflowAcceptanceCheck[];
}

function readAgentAction(value: unknown): AgentActionAuthorisationRequest["action"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "action is required and must be an object.", "invalid_agent_action_request");
  }

  assertOnlyKeys(value, AGENTOPS_ACTION_KEYS, "action", "invalid_agent_action_request");

  return {
    toolId: readRequiredString(value, "toolId", "invalid_agent_action_request").trim(),
    actionClass: readAgentActionClass(value.actionClass),
    leastPrivilegeScope: readRequiredString(value, "leastPrivilegeScope", "invalid_agent_action_request").trim()
  };
}

function readAgentGovernance(value: unknown): AgentActionAuthorisationRequest["governance"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "governance is required and must be an object.", "invalid_agent_action_request");
  }

  assertOnlyKeys(value, AGENTOPS_GOVERNANCE_KEYS, "governance", "invalid_agent_action_request");

  if (value.approvalId !== null && (typeof value.approvalId !== "string" || value.approvalId.trim().length === 0)) {
    throw new HttpError(400, "governance.approvalId must be a non-empty string or null.", "invalid_agent_action_request");
  }

  if (!isNonNegativeNumber(value.budgetLimit) || !isNonNegativeNumber(value.budgetConsumed)) {
    throw new HttpError(400, "governance budget values must be non-negative numbers.", "invalid_agent_action_request");
  }

  return {
    policyProfile: readRequiredString(value, "policyProfile", "invalid_agent_action_request").trim(),
    approvalId: typeof value.approvalId === "string" ? value.approvalId.trim() : null,
    budgetLimit: value.budgetLimit,
    budgetConsumed: value.budgetConsumed
  };
}

function readAgentRiskTier(value: unknown): AgentRiskTier {
  if (value === "standard" || value === "high") {
    return value;
  }

  throw new HttpError(400, "session.riskTier is not supported in mock mode.", "invalid_agent_action_request");
}

function readAgentSessionStatus(value: unknown): AgentSessionStatus {
  if (value === "active" || value === "paused" || value === "terminated") {
    return value;
  }

  throw new HttpError(400, "session.status is not supported in mock mode.", "invalid_agent_action_request");
}

function readAgentActionClass(value: unknown): AgentActionClass {
  if (value === "read" || value === "write" || value === "high-impact") {
    return value;
  }

  throw new HttpError(400, "action.actionClass is not supported in mock mode.", "invalid_agent_action_request");
}

function readGuardrailSurface(value: unknown): GuardrailSurface {
  if (value === "model-gateway" || value === "rag" || value === "agent-action" || value === "delivery") {
    return value;
  }

  throw new HttpError(400, "surface is not supported in mock mode.", "invalid_guardrail_assessment_request");
}

function readGuardrailSignals(value: unknown): GuardrailSyntheticSignal[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(
      400,
      "syntheticSignals must include at least one item.",
      "invalid_guardrail_assessment_request"
    );
  }

  const normalized = value.map((item) => {
    if (
      item === "none"
      || item === "pii-detected"
      || item === "prompt-injection"
      || item === "jailbreak-attempt"
      || item === "high-risk-action"
    ) {
      return item;
    }

    throw new HttpError(
      400,
      "syntheticSignals contains an unsupported value.",
      "invalid_guardrail_assessment_request"
    );
  });

  if (normalized.includes("none") && normalized.length > 1) {
    throw new HttpError(
      400,
      "syntheticSignals.none cannot be combined with risk signals.",
      "invalid_guardrail_assessment_request"
    );
  }

  return normalized;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
