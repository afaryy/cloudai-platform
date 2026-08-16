import type { RuntimeRequest, RuntimeResponse } from "./validation.js";

export interface RetrievalResult {
  answer?: string;
  citations: Array<{ title: string; uri: string }>;
}

export interface KnowledgeBaseClient {
  retrieveAndGenerate(input: Pick<RuntimeRequest, "question">): Promise<RetrievalResult>;
}

export interface BedrockKnowledgeBaseConfig {
  knowledgeBaseId: string;
  modelArn: string;
  region: "ap-southeast-2";
}

export async function retrieveGroundedAnswer(
  client: KnowledgeBaseClient,
  request: RuntimeRequest
): Promise<RuntimeResponse> {
  try {
    const result = await client.retrieveAndGenerate({ question: request.question });
    const citations = sanitizeCitations(result.citations);
    if (!result.answer || citations.length === 0) {
      return abstention(request, "insufficient_evidence");
    }
    return {
      requestId: request.requestId,
      outcome: "answer",
      answer: result.answer.slice(0, 1_000),
      citations,
      audit: { sourceLifecycle: request.governance.sourceLifecycle, citationPresent: true }
    };
  } catch {
    return abstention(request, "retrieval_unavailable");
  }
}

export function readBedrockKnowledgeBaseConfig(environment: NodeJS.ProcessEnv = process.env): BedrockKnowledgeBaseConfig | undefined {
  const knowledgeBaseId = environment.AGENTCORE_RAG_KNOWLEDGE_BASE_ID;
  const modelArn = environment.AGENTCORE_RAG_MODEL_ARN;
  if (!knowledgeBaseId || !modelArn) return undefined;
  return { knowledgeBaseId, modelArn, region: "ap-southeast-2" };
}

export async function createBedrockKnowledgeBaseClient(
  config: BedrockKnowledgeBaseConfig
): Promise<KnowledgeBaseClient> {
  const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = await import("@aws-sdk/client-bedrock-agent-runtime");
  const client = new BedrockAgentRuntimeClient({ region: config.region });

  return {
    async retrieveAndGenerate(input) {
      const result = await client.send(new RetrieveAndGenerateCommand({
        input: { text: input.question },
        retrieveAndGenerateConfiguration: {
          type: "KNOWLEDGE_BASE",
          knowledgeBaseConfiguration: {
            knowledgeBaseId: config.knowledgeBaseId,
            modelArn: config.modelArn
          }
        }
      }));
      return {
        answer: result.output?.text,
        citations: (result.citations ?? []).map(() => ({
          title: "Synthetic platform handbook",
          uri: "synthetic://agentcore-poc-handbook#retrieval"
        }))
      };
    }
  };
}

function sanitizeCitations(citations: RetrievalResult["citations"]): RetrievalResult["citations"] {
  return citations
    .filter((citation) => citation.title.length > 0 && citation.uri.startsWith("synthetic://"))
    .slice(0, 5)
    .map((citation) => ({ title: citation.title.slice(0, 160), uri: citation.uri }));
}

function abstention(request: RuntimeRequest, reasonCode: string): RuntimeResponse {
  return {
    requestId: request.requestId,
    outcome: "abstain",
    reasonCode,
    citations: [],
    audit: { sourceLifecycle: request.governance.sourceLifecycle, citationPresent: false }
  };
}
