type CostInput = {
  inputTokens: number;
  outputTokens: number;
};

const SYNTHETIC_INPUT_RATE_PER_1K = 0.001;
const SYNTHETIC_OUTPUT_RATE_PER_1K = 0.002;

export function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.3));
}

export function estimateMockCostUsd(input: CostInput): number {
  const inputCost = (input.inputTokens / 1000) * SYNTHETIC_INPUT_RATE_PER_1K;
  const outputCost = (input.outputTokens / 1000) * SYNTHETIC_OUTPUT_RATE_PER_1K;
  return Number((inputCost + outputCost).toFixed(6));
}
