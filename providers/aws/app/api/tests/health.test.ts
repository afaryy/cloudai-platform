import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockApiServer } from "../src/server.js";
import type { RequestLogEvent, RequestLogger } from "../src/lib/requestLogger.js";

test("GET /health returns mock mode status", async () => {
  const logger = createCapturingLogger();
  const server = createMockApiServer(undefined, logger);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const port = getServerPort(server.address());

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.status, "ok");
    assert.equal(body.mode, "mock");
    assert.equal(body.service, "mock-genai-api");
    assert.equal(typeof body.timestamp, "string");

    assert.equal(logger.events.length, 1);
    assert.equal(logger.events[0].event, "mock_api_request");
    assert.equal(logger.events[0].route, "/health");
    assert.equal(logger.events[0].statusCode, 200);
    assert.equal(logger.events[0].mode, "mock");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
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
