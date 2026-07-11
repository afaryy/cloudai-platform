import type { RagGovernanceResponse } from "../types.js";
import { normalizeRagGovernanceRequest } from "../lib/validation.js";

const DEMO_SOURCE = {
  sourceId: "demo-platform-handbook-001",
  sourceTitle: "CloudAI Demo Platform Handbook",
  citationUrl: "https://example.com/cloudai-platform/demo-platform-handbook"
} as const;

const MOCK_EVALUATED_AT = "2026-07-10T00:00:00.000Z";

export function postRagQuery(body: unknown): RagGovernanceResponse {
  const request = normalizeRagGovernanceRequest(body);

  return {
    requestId: request.requestId,
    response: {
      answer: "Mock governed RAG response: evaluated the request using synthetic retrieval evidence and local governance checks.",
      citations: request.governance.requireCitations ? [DEMO_SOURCE] : []
    },
    retrieval: {
      knowledgeBase: request.retrieval.allowedKnowledgeBases[0],
      documentsConsidered: Math.min(request.retrieval.maxDocuments, 3),
      documentsReturned: 1,
      sources: [
        {
          ...DEMO_SOURCE,
          classification: request.dataClassification,
          retrievedAt: MOCK_EVALUATED_AT
        }
      ]
    },
    governance: {
      citationRequirementMet: request.governance.requireCitations,
      egressDecision: {
        allowed: true,
        scope: "controlled_response",
        reason: "controlled_response_allowed_with_synthetic_sources"
      }
    },
    audit: {
      requestId: request.requestId,
      policyProfile: request.governance.policyProfile,
      evaluatedAt: MOCK_EVALUATED_AT
    }
  };
}
