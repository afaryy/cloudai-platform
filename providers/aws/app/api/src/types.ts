export type ChatRequest = {
  prompt: string;
  modelName?: string;
};

export type ChatMetadata = {
  requestId: string;
  modelName: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  timestamp: string;
};

export type ChatResponse = {
  response: string;
  metadata: ChatMetadata;
};

export type HealthResponse = {
  status: "ok";
  mode: "mock";
  service: "mock-genai-api";
  timestamp: string;
};

export type RagWorkflowBoundaries = {
  embeddings: false;
  vectorIndex: false;
  modelCalls: false;
  cloudDeployment: false;
  pythonExecutionFromApi: false;
};

export type RagWorkflowArtifactPaths = {
  requestSchema: string;
  responseSchema: string;
  chunkExport: string;
  evalDataset: string;
  scoreReport: string;
  walkthrough: string;
};

export type RagStatusResponse = {
  status: "available";
  mode: "mock";
  workflow: "local-rag-governance";
  summary: string;
  artifacts: RagWorkflowArtifactPaths;
  boundaries: RagWorkflowBoundaries;
};

export type RagArtifactKind = "schema" | "sample-output" | "documentation";

export type RagArtifactMetadata = {
  name: string;
  kind: RagArtifactKind;
  path: string;
  description: string;
};

export type RagArtifactsResponse = {
  mode: "mock";
  workflow: "local-rag-governance";
  artifacts: RagArtifactMetadata[];
};

export type RagGovernanceRequest = {
  requestId: string;
  query: string;
  dataClassification: "synthetic-public" | "synthetic-restricted";
  retrieval: {
    allowedKnowledgeBases: string[];
    maxDocuments: number;
    requiredMetadata: string[];
  };
  governance: {
    requireCitations: boolean;
    allowExternalEgress: boolean;
    policyProfile: string;
  };
};

export type RagGovernanceResponse = {
  requestId: string;
  response: {
    answer: string;
    citations: Array<{
      sourceId: string;
      sourceTitle: string;
      citationUrl: string;
    }>;
  };
  retrieval: {
    knowledgeBase: string;
    documentsConsidered: number;
    documentsReturned: number;
    sources: Array<{
      sourceId: string;
      sourceTitle: string;
      citationUrl: string;
      classification: "synthetic-public" | "synthetic-restricted";
      retrievedAt: string;
    }>;
  };
  governance: {
    citationRequirementMet: boolean;
    egressDecision: {
      allowed: boolean;
      scope: "controlled_response" | "external_network";
      reason: "controlled_response_allowed_with_synthetic_sources" | "external_egress_not_allowed_for_demo_policy";
    };
  };
  audit: {
    requestId: string;
    policyProfile: string;
    evaluatedAt: string;
  };
};

export type AgentActionClass = "read" | "write" | "high-impact";
export type AgentRiskTier = "standard" | "high";
export type AgentSessionStatus = "active" | "paused" | "terminated";
export type AgentAuthorisationVerdict = "allow" | "deny" | "approval-required" | "paused";
export type AgentAuthorisationReasonCode =
  | "read_only_action_allowed"
  | "approved_high_impact_action"
  | "human_approval_required"
  | "tool_not_allowed"
  | "budget_limit_exceeded"
  | "session_not_active";

export type AgentActionAuthorisationRequest = {
  requestId: string;
  session: {
    sessionId: string;
    agentId: string;
    owner: string;
    delegatedUser: string;
    riskTier: AgentRiskTier;
    status: AgentSessionStatus;
  };
  action: {
    toolId: string;
    actionClass: AgentActionClass;
    leastPrivilegeScope: string;
  };
  governance: {
    policyProfile: string;
    approvalId: string | null;
    budgetLimit: number;
    budgetConsumed: number;
  };
};

export type AgentActionAuthorisationDecision = {
  requestId: string;
  decision: {
    verdict: AgentAuthorisationVerdict;
    reasonCode: AgentAuthorisationReasonCode;
    policyId: string;
  };
  approval: {
    required: boolean;
    approvalId: string | null;
  };
  runtimeControl: {
    state: AgentSessionStatus;
    budgetLimit: number;
    budgetConsumed: number;
    budgetRemaining: number;
  };
  audit: {
    traceId: string;
    eventId: string;
    recordedAt: string;
  };
};

export type GuardrailSurface = "model-gateway" | "rag" | "agent-action" | "delivery";
export type GuardrailSyntheticSignal =
  | "none"
  | "pii-detected"
  | "prompt-injection"
  | "jailbreak-attempt"
  | "high-risk-action";
export type GuardrailVerdict = "allow" | "redact" | "deny" | "approval-required";
export type GuardrailReasonCode =
  | "no_synthetic_risk_signal"
  | "synthetic_pii_signal"
  | "synthetic_prompt_injection_signal"
  | "synthetic_high_risk_action_signal";

export type GuardrailAssessmentRequest = {
  requestId: string;
  policyProfile: string;
  surface: GuardrailSurface;
  syntheticSignals: GuardrailSyntheticSignal[];
};

export type GuardrailAssessmentVerdict = {
  requestId: string;
  verdict: GuardrailVerdict;
  reasonCode: GuardrailReasonCode;
  policyProfile: string;
  audit: {
    traceId: string;
    recordedAt: string;
  };
};

export type WorkflowAcceptanceCheck =
  | "capability-admitted"
  | "source-active"
  | "guardrails-allow"
  | "within-budget";

export type WorkflowRunRequest = {
  workflowId: string;
  objective: string;
  owner: string;
  riskTier: AgentRiskTier;
  agentAction: AgentActionAuthorisationRequest;
  capability: {
    capabilityId: string;
    admissionStatus: "admitted" | "blocked";
  };
  knowledgeSource: {
    sourceId: string;
    allowedKnowledgeBase: string;
  };
  guardrails: GuardrailAssessmentRequest;
  acceptanceChecks: WorkflowAcceptanceCheck[];
};
