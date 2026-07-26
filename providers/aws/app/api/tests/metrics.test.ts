import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockApiServer } from "../src/server.js";

test("GET /metrics exposes aggregate safe request metrics", async () => {
  const server = createMockApiServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());
    const prompt = "synthetic prompt that must never become a metric";

    const chatResponse = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    assert.equal(chatResponse.status, 200);

    const response = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/plain; version=0\.0\.4/);

    const metrics = await response.text();
    assert.match(metrics, /cloudai_request_total\{route="\/chat",outcome="success",mode="mock"\} 1/);
    assert.match(metrics, /cloudai_request_duration_seconds_bucket/);
    assert.doesNotMatch(metrics, new RegExp(prompt));
    assert.doesNotMatch(metrics, /requestId|trace_[A-Za-z0-9_]+/);
  } finally {
    await close(server);
  }
});

test("GET /metrics does not count its own scrape", async () => {
  const server = createMockApiServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());
    const before = await (await fetch(`http://127.0.0.1:${port}/metrics`)).text();
    const after = await (await fetch(`http://127.0.0.1:${port}/metrics`)).text();

    assert.equal(after, before);
    assert.doesNotMatch(after, /route="\/metrics"/);
  } finally {
    await close(server);
  }
});

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}

async function close(server: ReturnType<typeof createMockApiServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
