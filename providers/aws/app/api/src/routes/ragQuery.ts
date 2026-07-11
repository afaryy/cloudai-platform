import type { RagGovernanceResponse } from "../types.js";
import { requireActiveKnowledgeSource } from "../lib/knowledgeSourceRegistry.js";
import { normalizeRagGovernanceRequest } from "../lib/validation.js";

const MOCK_EVALUATED_AT = "2026-07-10T00:00:00.000Z";

export function postRagQuery(body: unknown): RagGovernanceResponse {
  const request = normalizeRagGovernanceRequest(body);
  const knowledgeBase = request.retrieval.allowedKnowledgeBases[0];
  const source = requireActiveKnowledgeSource(knowledgeBase);
  const citation = {
    sourceId: source.sourceId,
    sourceTitle: source.sourceTitle,
    citationUrl: source.citationUrl
  };

  return {
    requestId: request.requestId,
    response: {
      answer: "Mock governed RAG response: evaluated the request using synthetic retrieval evidence and local governance checks.",
      citations: request.governance.requireCitations ? [citation] : []
    },
    retrieval: {
      knowledgeBase,
      documentsConsidered: Math.min(request.retrieval.maxDocuments, 3),
      documentsReturned: 1,
      sources: [
        {
          ...citation,
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
