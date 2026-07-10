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
