import type { BedrockClient } from "./bedrockClient.js";
import type { ChatRequest, ChatResponse } from "../types.js";
import { buildChatMetadata } from "../lib/metadata.js";
import { normalizeChatRequest } from "../lib/validation.js";

export class MockBedrockClient implements BedrockClient {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const normalized = normalizeChatRequest(request);
    const response = buildMockResponse(normalized.prompt);

    return {
      response,
      metadata: buildChatMetadata({
        prompt: normalized.prompt,
        response,
        modelName: normalized.modelName
      })
    };
  }
}

function buildMockResponse(prompt: string): string {
  const trimmed = prompt.trim();
  return `Mock CloudAI response: received ${trimmed.length} characters and routed through the mock GenAI gateway.`;
}
