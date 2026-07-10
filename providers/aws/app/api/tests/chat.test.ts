import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockApiServer } from "../src/server.js";

test("POST /chat returns a mock response with metadata", async () => {
  const server = createMockApiServer();
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
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("POST /chat rejects an empty prompt", async () => {
  const server = createMockApiServer();
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
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}
