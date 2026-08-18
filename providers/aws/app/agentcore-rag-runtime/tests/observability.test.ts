import assert from "node:assert/strict";
import test from "node:test";

import { emitRuntimeObservation } from "../src/observability.js";

test("EMF observation is metadata-safe and uses bounded metric dimensions", () => {
  const originalLog = console.log;
  const events: string[] = [];
  console.log = (message?: unknown) => events.push(String(message));

  try {
    emitRuntimeObservation({
      requestId: "synthetic-request-active-001",
      outcome: "answer",
      sourceLifecycle: "active",
      citationPresent: true,
      latencyMs: 842
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(events.length, 1);
  const event = JSON.parse(events[0]) as Record<string, any>;
  assert.equal(event.event, "agentcore_rag_invocation_completed");
  assert.equal(event.requestId, "synthetic-request-active-001");
  assert.equal(event.InvocationCount, 1);
  assert.equal(event.AnswerCount, 1);
  assert.equal(event.CitationMissingCount, 0);
  assert.deepEqual(event._aws.CloudWatchMetrics[0].Dimensions, [["Environment", "Route", "Outcome"]]);
  assert.equal(event._aws.CloudWatchMetrics[0].Dimensions.flat().includes("requestId"), false);
});

test("EMF observation records bounded failure counters without provider details", () => {
  const originalLog = console.log;
  const events: string[] = [];
  console.log = (message?: unknown) => events.push(String(message));

  try {
    emitRuntimeObservation({
      requestId: "synthetic-request-timeout-004",
      outcome: "abstain",
      reasonCode: "retrieval_unavailable",
      providerFailureClass: "timeout",
      sourceLifecycle: "active",
      citationPresent: false,
      latencyMs: 1_234
    });
  } finally {
    console.log = originalLog;
  }

  const event = JSON.parse(events[0]) as Record<string, any>;
  assert.equal(event.AbstentionCount, 1);
  assert.equal(event.RetrievalUnavailableCount, 1);
  assert.equal(event.latencyMs, 1234);
  assert.equal(event.providerFailureClass, "timeout");
  assert.equal("answer" in event, false);
});
