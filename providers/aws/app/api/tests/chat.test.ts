import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createConfiguredApiServer, createMockApiServer } from "../src/server.js";
import type { RequestLogEvent, RequestLogger } from "../src/lib/requestLogger.js";
import type { BedrockClient } from "../src/clients/bedrockClient.js";
import { createBedrockPolicyProfile } from "../src/lib/policyProfile.js";

test("POST /chat returns a mock response with metadata", async () => {
  const logger = createCapturingLogger();
  const server = createMockApiServer(undefined, logger);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());

    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: "Explain the CloudAI control plane.",
        modelName: "mock-bedrock-claude"
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.match(body.response, /Mock CloudAI response/);
    assert.equal(body.metadata.modelName, "mock-bedrock-claude");
    assert.equal(typeof body.metadata.requestId, "string");
    assert.equal(typeof body.metadata.timestamp, "string");
    assert.equal(typeof body.metadata.estimatedInputTokens, "number");
    assert.equal(typeof body.metadata.estimatedOutputTokens, "number");
    assert.equal(typeof body.metadata.estimatedCostUsd, "number");

    assert.equal(logger.events.length, 1);
    assert.equal(logger.events[0].event, "mock_api_request");
    assert.equal(logger.events[0].route, "/chat");
    assert.equal(logger.events[0].statusCode, 200);
    assert.equal(logger.events[0].requestId, body.metadata.requestId);
    assert.equal(logger.events[0].modelName, body.metadata.modelName);
    assert.equal(logger.events[0].estimatedCostUsd, body.metadata.estimatedCostUsd);
    assert.equal(Object.hasOwn(logger.events[0], "prompt"), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});

test("POST /chat rejects an empty prompt", async () => {
  const logger = createCapturingLogger();
  const server = createMockApiServer(undefined, logger);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());

    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: " " })
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "empty_prompt");

    assert.equal(logger.events.length, 1);
    assert.equal(logger.events[0].route, "/chat");
    assert.equal(logger.events[0].statusCode, 400);
    assert.equal(logger.events[0].errorCode, "empty_prompt");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});

test("POST /chat rejects prompts that exceed the mock token budget", async () => {
  const logger = createCapturingLogger();
  const server = createMockApiServer(undefined, logger);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());
    const oversizedPrompt = Array.from({ length: 70 }, (_, index) => `word${index}`).join(" ");

    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: oversizedPrompt })
    });

    assert.equal(response.status, 429);
    const body = await response.json();
    assert.equal(body.error.code, "token_budget_exceeded");

    assert.equal(logger.events.length, 1);
    assert.equal(logger.events[0].route, "/chat");
    assert.equal(logger.events[0].statusCode, 429);
    assert.equal(logger.events[0].errorCode, "token_budget_exceeded");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});

test("configured server remains mock when no provider is configured", async () => {
  const logger = createCapturingLogger();
  const server = createConfiguredApiServer({}, logger);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "synthetic-marker" })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.match(body.response, /Mock CloudAI response/);
    assert.equal(body.metadata.usage.source, "synthetic-estimate");
    assert.equal(logger.events[0].mode, "mock");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});

test("request log omits prompt and response in Bedrock mode", async () => {
  const logger = createCapturingLogger();
  const server = createMockApiServer(new FakeBedrockClient(), logger, "bedrock");
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "synthetic-marker", modelName: "mock-bedrock-claude" })
    });

    assert.equal(response.status, 200);
    assert.equal(logger.events[0].mode, "bedrock");
    assert.equal(Object.hasOwn(logger.events[0], "prompt"), false);
    assert.equal(Object.hasOwn(logger.events[0], "response"), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});

test("Bedrock mode accepts only its configured model before calling the adapter", async () => {
  const logger = createCapturingLogger();
  const client = new FakeBedrockClient();
  const server = createMockApiServer(
    client,
    logger,
    "bedrock",
    createBedrockPolicyProfile("configured-profile")
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "synthetic-marker", modelName: "configured-profile" })
    });

    assert.equal(response.status, 200);
    assert.equal(client.calls, 1);
    assert.equal(client.requests[0].modelName, "configured-profile");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
  }
});

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}

function createCapturingLogger(): RequestLogger & { events: RequestLogEvent[] } {
  const events: RequestLogEvent[] = [];
  return {
    events,
    info(event: RequestLogEvent): void {
      events.push(event);
    }
  };
}

class FakeBedrockClient implements BedrockClient {
  calls = 0;
  requests: Array<{ prompt: string; modelName?: string }> = [];

  async chat(request: { prompt: string; modelName?: string }) {
    this.calls += 1;
    this.requests.push(request);
    return {
      response: "synthetic-response",
      metadata: {
        requestId: "synthetic-id",
        modelName: "mock-bedrock-claude",
        usage: { source: "provider-reported" as const, inputTokens: 2, outputTokens: 3 },
        timestamp: "2026-07-19T00:00:00.000Z"
      }
    };
  }
}
