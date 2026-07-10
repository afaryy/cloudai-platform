import type { BedrockClient } from "../clients/bedrockClient.js";
import type { ChatResponse } from "../types.js";
import { enforceInputTokenBudget } from "../lib/tokenBudget.js";
import { normalizeChatRequest } from "../lib/validation.js";

export async function postChat(client: BedrockClient, body: unknown): Promise<ChatResponse> {
  const request = normalizeChatRequest(body);
  enforceInputTokenBudget(request.prompt);
  return client.chat(request);
}
