import test from "node:test";
import assert from "node:assert/strict";
import { buildRequestLogEvent } from "../src/lib/requestLogger.js";

test("buildRequestLogEvent normalizes request log metadata", () => {
  const event = buildRequestLogEvent({
    requestId: "synthetic-request-id",
    method: "POST",
    route: "/chat",
    statusCode: 200,
    durationMs: 12.7,
    timestamp: "2026-07-10T00:00:00.000Z",
    modelName: "mock-bedrock-claude",
    estimatedInputTokens: 8,
    estimatedOutputTokens: 24,
    estimatedCostUsd: 0.000032
  });

  assert.equal(event.event, "mock_api_request");
  assert.equal(event.mode, "mock");
  assert.equal(event.durationMs, 13);
  assert.equal(event.route, "/chat");
  assert.equal(event.modelName, "mock-bedrock-claude");
});
