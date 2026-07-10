import { randomUUID } from "node:crypto";
import type { ChatMetadata } from "../types.js";
import { estimateMockCostUsd, estimateTokens } from "./tokenEstimator.js";

type MetadataInput = {
  prompt: string;
  response: string;
  modelName: string;
};

export function buildChatMetadata(input: MetadataInput): ChatMetadata {
  const estimatedInputTokens = estimateTokens(input.prompt);
  const estimatedOutputTokens = estimateTokens(input.response);

  return {
    requestId: randomUUID(),
    modelName: input.modelName,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd: estimateMockCostUsd({
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens
    }),
    timestamp: new Date().toISOString()
  };
}
