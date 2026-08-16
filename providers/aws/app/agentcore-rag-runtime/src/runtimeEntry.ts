import {
  createBedrockKnowledgeBaseClient,
  readBedrockKnowledgeBaseConfig,
  retrieveGroundedAnswer,
  type KnowledgeBaseClient
} from "./bedrockKnowledgeBase.js";
import type { RuntimeDependencies } from "./app.js";
import type { RuntimeRequest, RuntimeResponse } from "./validation.js";

type KnowledgeBaseClientFactory = (config: Parameters<typeof createBedrockKnowledgeBaseClient>[0]) => Promise<KnowledgeBaseClient>;

export async function createRuntimeDependencies(
  environment: NodeJS.ProcessEnv = process.env,
  createClient: KnowledgeBaseClientFactory = createBedrockKnowledgeBaseClient
): Promise<RuntimeDependencies> {
  const config = readBedrockKnowledgeBaseConfig(environment);
  if (!config) {
    return { retrieveAndGenerate: async (request) => unavailable(request) };
  }

  const client = await createClient(config);
  return { retrieveAndGenerate: async (request) => retrieveGroundedAnswer(client, request) };
}

function unavailable(request: RuntimeRequest): RuntimeResponse {
  return {
    requestId: request.requestId,
    outcome: "abstain",
    reasonCode: "retrieval_unavailable",
    citations: [],
    audit: { sourceLifecycle: request.governance.sourceLifecycle, citationPresent: false }
  };
}
