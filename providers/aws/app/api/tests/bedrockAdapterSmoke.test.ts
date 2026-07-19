import test from "node:test";
import assert from "node:assert/strict";
import { runAdapterSmoke } from "../src/scripts/bedrockAdapterSmoke.js";

const bedrockEnvironment = {
  CONFIRM_BEDROCK_ADAPTER_SMOKE: "I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL",
  MODEL_PROVIDER: "bedrock",
  BEDROCK_MODEL_ID: "configured-profile",
  AWS_REGION: "ap-southeast-2"
};

test("adapter smoke rejects a missing confirmation before a provider call", async () => {
  let calls = 0;

  const result = await runAdapterSmoke(
    { ...bedrockEnvironment, CONFIRM_BEDROCK_ADAPTER_SMOKE: "" },
    async () => {
      calls += 1;
      return providerReportedMetadata();
    }
  );

  assert.equal(result, "confirmation-required");
  assert.equal(calls, 0);
});

test("adapter smoke invokes the configured adapter once and accepts provider usage", async () => {
  let calls = 0;

  const result = await runAdapterSmoke(bedrockEnvironment, async () => {
    calls += 1;
    return providerReportedMetadata();
  });

  assert.equal(result, "adapter-smoke-passed");
  assert.equal(calls, 1);
});

test("adapter smoke reports a sanitized configuration failure", async () => {
  const result = await runAdapterSmoke(
    { ...bedrockEnvironment, MODEL_PROVIDER: "mock" },
    async () => providerReportedMetadata()
  );

  assert.equal(result, "configuration-invalid");
});

test("adapter smoke does not expose an adapter error", async () => {
  const result = await runAdapterSmoke(bedrockEnvironment, async () => {
    throw new Error("provider detail must not be exposed");
  });

  assert.equal(result, "request-failed");
});

function providerReportedMetadata() {
  return {
    usage: { source: "provider-reported" as const, inputTokens: 2, outputTokens: 3 }
  };
}
