import type { ChatRequest, ChatResponse } from "../types.js";

export interface BedrockClient {
  chat(request: ChatRequest): Promise<ChatResponse>;
}
