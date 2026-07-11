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
