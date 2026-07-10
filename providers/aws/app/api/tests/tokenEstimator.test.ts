import test from "node:test";
import assert from "node:assert/strict";
import { estimateMockCostUsd, estimateTokens } from "../src/lib/tokenEstimator.js";

test("estimateTokens returns a synthetic positive token estimate", () => {
  assert.equal(estimateTokens(""), 1);
  assert.equal(estimateTokens("hello world"), 3);
});

test("estimateMockCostUsd estimates cost from synthetic token rates", () => {
  assert.equal(estimateMockCostUsd({ inputTokens: 1000, outputTokens: 1000 }), 0.003);
});
