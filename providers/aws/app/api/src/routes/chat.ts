import type { BedrockClient } from "../clients/bedrockClient.js";
import type { ChatResponse } from "../types.js";
import { DEFAULT_POLICY_PROFILE, type MockPolicyProfile } from "../lib/policyProfile.js";
import { enforceInputTokenBudget } from "../lib/tokenBudget.js";
import { normalizeChatRequest } from "../lib/validation.js";

export async function postChat(
  client: BedrockClient,
  body: unknown,
  profile: MockPolicyProfile = DEFAULT_POLICY_PROFILE
): Promise<ChatResponse> {
  const request = normalizeChatRequest(body, profile);
  enforceInputTokenBudget(request.prompt, profile.maxInputTokens);
  return client.chat(request);
}
