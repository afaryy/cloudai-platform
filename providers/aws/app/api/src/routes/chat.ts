import type { BedrockClient } from "../clients/bedrockClient.js";
import type { ChatResponse } from "../types.js";
import { DEFAULT_POLICY_PROFILE } from "../lib/policyProfile.js";
import { enforceInputTokenBudget } from "../lib/tokenBudget.js";
import { normalizeChatRequest } from "../lib/validation.js";

export async function postChat(client: BedrockClient, body: unknown): Promise<ChatResponse> {
  const request = normalizeChatRequest(body, DEFAULT_POLICY_PROFILE);
  enforceInputTokenBudget(request.prompt, DEFAULT_POLICY_PROFILE.maxInputTokens);
  return client.chat(request);
}
