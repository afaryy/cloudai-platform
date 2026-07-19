import { HttpError } from "../lib/errors.js";

export type ModelProvider = "mock" | "bedrock";

export type ProviderClientConfig =
  | { provider: "mock" }
  | { provider: "bedrock"; modelId: string; region: string };

export function readProviderClientConfig(env: NodeJS.ProcessEnv): ProviderClientConfig {
  const provider = env.MODEL_PROVIDER?.trim() || "mock";

  if (provider === "mock") {
    return { provider };
  }

  if (provider !== "bedrock") {
    throw new HttpError(500, "Model provider configuration is invalid.", "model_provider_invalid");
  }

  const modelId = env.BEDROCK_MODEL_ID?.trim();
  const region = env.AWS_REGION?.trim();
  if (!modelId || !region) {
    throw new HttpError(500, "Bedrock provider configuration is incomplete.", "bedrock_configuration_invalid");
  }

  return { provider, modelId, region };
}
