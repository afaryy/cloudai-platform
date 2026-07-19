import test from "node:test";
import assert from "node:assert/strict";
import { readProviderClientConfig } from "../src/clients/providerClient.js";

test("uses mock mode when MODEL_PROVIDER is omitted", () => {
  assert.deepEqual(readProviderClientConfig({}), { provider: "mock" });
});

test("requires Bedrock model and region only in Bedrock mode", () => {
  assert.throws(
    () => readProviderClientConfig({ MODEL_PROVIDER: "bedrock" }),
    { code: "bedrock_configuration_invalid" }
  );
});

test("returns the configured Bedrock model and region", () => {
  assert.deepEqual(
    readProviderClientConfig({
      MODEL_PROVIDER: "bedrock",
      BEDROCK_MODEL_ID: "configured-profile",
      AWS_REGION: "ap-southeast-2"
    }),
    {
      provider: "bedrock",
      modelId: "configured-profile",
      region: "ap-southeast-2"
    }
  );
});

test("rejects an unknown provider", () => {
  assert.throws(
    () => readProviderClientConfig({ MODEL_PROVIDER: "other" }),
    { code: "model_provider_invalid" }
  );
});
