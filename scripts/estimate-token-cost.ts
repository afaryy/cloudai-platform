type EstimateInput = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

const sample: EstimateInput = {
  provider: "mock",
  model: "synthetic-llm",
  inputTokens: 1200,
  outputTokens: 300
};

function estimateMockCost(input: EstimateInput): number {
  const syntheticRatePerThousandTokens = 0.001;
  return ((input.inputTokens + input.outputTokens) / 1000) * syntheticRatePerThousandTokens;
}

const estimatedCost = estimateMockCost(sample);

console.log(JSON.stringify({
  mode: "mock",
  note: "Synthetic estimate only. No provider pricing or live usage is used.",
  sample,
  estimatedCostUsd: Number(estimatedCost.toFixed(6))
}, null, 2));
