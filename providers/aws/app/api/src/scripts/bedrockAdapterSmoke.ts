import type { AddressInfo } from "node:net";
import { createConfiguredApiServer } from "../server.js";
import { readProviderClientConfig } from "../clients/providerClient.js";

const CONFIRMATION = "I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL";

export type AdapterSmokeResult =
  | "adapter-smoke-passed"
  | "confirmation-required"
  | "configuration-invalid"
  | "request-failed"
  | "response-invalid";

type ProviderUsageMetadata = {
  usage: {
    source: "provider-reported";
    inputTokens: number;
    outputTokens: number;
  };
};

export async function runAdapterSmoke(
  env: NodeJS.ProcessEnv,
  invoke: () => Promise<ProviderUsageMetadata>
): Promise<AdapterSmokeResult> {
  if (env.CONFIRM_BEDROCK_ADAPTER_SMOKE !== CONFIRMATION) {
    return "confirmation-required";
  }

  try {
    const config = readProviderClientConfig(env);
    if (config.provider !== "bedrock") {
      return "configuration-invalid";
    }
  } catch {
    return "configuration-invalid";
  }

  try {
    const metadata = await invoke();
    return hasProviderReportedUsage(metadata) ? "adapter-smoke-passed" : "response-invalid";
  } catch {
    return "request-failed";
  }
}

async function invokeConfiguredGateway(env: NodeJS.ProcessEnv): Promise<ProviderUsageMetadata> {
  env.AWS_MAX_ATTEMPTS = "1";
  const server = createConfiguredApiServer(env, { info: () => undefined });
  await new Promise<void>((resolve, reject) => server.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve()));

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("adapter server did not bind a local port");
    }

    const marker = `synthetic-${env.GITHUB_RUN_ID ?? process.pid}`;
    const response = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: marker, modelName: env.BEDROCK_MODEL_ID })
    });

    if (!response.ok) {
      throw new Error("adapter gateway request was unsuccessful");
    }

    const body: unknown = await response.json();
    const metadata = readProviderUsageMetadata(body);
    if (!metadata) {
      throw new Error("adapter gateway response was invalid");
    }
    return metadata;
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve()));
  }
}

function readProviderUsageMetadata(body: unknown): ProviderUsageMetadata | undefined {
  if (!isRecord(body) || !isRecord(body.metadata) || !isRecord(body.metadata.usage)) {
    return undefined;
  }

  const usage = body.metadata.usage;
  if (usage.source !== "provider-reported" || typeof usage.inputTokens !== "number" || typeof usage.outputTokens !== "number") {
    return undefined;
  }

  return {
    usage: {
      source: "provider-reported",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens
    }
  };
}

function hasProviderReportedUsage(metadata: ProviderUsageMetadata): boolean {
  return metadata.usage.source === "provider-reported"
    && Number.isFinite(metadata.usage.inputTokens)
    && Number.isFinite(metadata.usage.outputTokens)
    && metadata.usage.inputTokens >= 0
    && metadata.usage.outputTokens >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runAdapterSmoke(process.env, () => invokeConfiguredGateway(process.env));
  if (result === "adapter-smoke-passed") {
    console.log(result);
  } else {
    console.error(`::error::Bedrock adapter smoke test failed: ${result}.`);
    process.exitCode = 1;
  }
}
