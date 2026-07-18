import test from "node:test";
import assert from "node:assert/strict";
import { AwsBedrockClient, type BedrockRuntimeInvoker } from "../src/clients/awsBedrockClient.js";

test("sends one bounded non-streaming Converse request", async () => {
  const invoker = new CapturingInvoker(successfulConverseResponse());
  const client = new AwsBedrockClient({ modelId: "configured-profile", invoker });

  const response = await client.chat({
    prompt: "synthetic-marker",
    modelName: "configured-profile"
  });

  assert.deepEqual(invoker.input, {
    modelId: "configured-profile",
    messages: [{ role: "user", content: [{ text: "synthetic-marker" }] }],
    inferenceConfig: { maxTokens: 8, temperature: 0 }
  });
  assert.equal(invoker.calls, 1);
  assert.equal(response.response, "synthetic-response");
  assert.deepEqual(response.metadata.usage, {
    source: "provider-reported",
    inputTokens: 2,
    outputTokens: 3
  });
  assert.equal(response.metadata.estimatedCostUsd, undefined);
});

test("rejects a request for a different model before invoking Bedrock", async () => {
  const invoker = new CapturingInvoker(successfulConverseResponse());
  const client = new AwsBedrockClient({ modelId: "configured-profile", invoker });

  await assert.rejects(
    () => client.chat({ prompt: "synthetic-marker", modelName: "another-model" }),
    { code: "unsupported_model" }
  );
  assert.equal(invoker.calls, 0);
});

test("does not expose provider error text", async () => {
  const client = new AwsBedrockClient({
    modelId: "configured-profile",
    invoker: new FailingInvoker("secret provider detail")
  });

  await assert.rejects(
    () => client.chat({ prompt: "synthetic-marker", modelName: "configured-profile" }),
    { code: "bedrock_unavailable", message: "Bedrock provider is currently unavailable." }
  );
});

test("rejects a provider response without text", async () => {
  const client = new AwsBedrockClient({
    modelId: "configured-profile",
    invoker: new CapturingInvoker({ output: { message: { content: [] } }, usage: { inputTokens: 2, outputTokens: 3 } })
  });

  await assert.rejects(
    () => client.chat({ prompt: "synthetic-marker", modelName: "configured-profile" }),
    { code: "bedrock_response_invalid" }
  );
});

type ConverseInput = {
  modelId: string;
  messages: Array<{ role: "user"; content: Array<{ text: string }> }>;
  inferenceConfig: { maxTokens: number; temperature: number };
};

type ConverseOutput = {
  output: { message: { content: Array<{ text?: string }> } };
  usage: { inputTokens?: number; outputTokens?: number };
};

class CapturingInvoker implements BedrockRuntimeInvoker {
  calls = 0;
  input: ConverseInput | undefined;

  constructor(private readonly output: ConverseOutput) {}

  async converse(input: ConverseInput): Promise<ConverseOutput> {
    this.calls += 1;
    this.input = input;
    return this.output;
  }
}

class FailingInvoker implements BedrockRuntimeInvoker {
  constructor(private readonly detail: string) {}

  async converse(): Promise<never> {
    throw new Error(this.detail);
  }
}

function successfulConverseResponse(): ConverseOutput {
  return {
    output: { message: { content: [{ text: "synthetic-response" }] } },
    usage: { inputTokens: 2, outputTokens: 3 }
  };
}
