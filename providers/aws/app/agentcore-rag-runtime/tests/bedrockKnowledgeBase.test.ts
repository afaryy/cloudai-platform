import assert from "node:assert/strict";
import test from "node:test";

import { retrieveGroundedAnswer, type KnowledgeBaseClient } from "../src/bedrockKnowledgeBase.js";

const allowedInput = {
  requestId: "synthetic-request-active-001",
  question: "What controls protect a governed AI platform?",
  knowledgeSource: "agentcore-poc-handbook" as const,
  governance: { sourceLifecycle: "active" as const, requireCitations: true, entryPath: "gateway" as const }
};

test("provider failure becomes a sanitized abstention", async () => {
  const client: KnowledgeBaseClient = {
    retrieveAndGenerate: async () => {
      throw new Error("provider details must not escape");
    }
  };

  const response = await retrieveGroundedAnswer(client, allowedInput);
  assert.equal(response.outcome, "abstain");
  assert.equal(response.reasonCode, "retrieval_unavailable");
  assert.doesNotMatch(JSON.stringify(response), /provider details/);
});

test("missing citations become a safe abstention", async () => {
  const client: KnowledgeBaseClient = {
    retrieveAndGenerate: async () => ({ answer: "Ungrounded answer", citations: [] })
  };

  const response = await retrieveGroundedAnswer(client, allowedInput);
  assert.equal(response.outcome, "abstain");
  assert.equal(response.reasonCode, "insufficient_evidence");
});

test("provider citations map to synthetic titles and URIs only", async () => {
  const client: KnowledgeBaseClient = {
    retrieveAndGenerate: async () => ({
      answer: "Use identity and source lifecycle controls.",
      citations: [{ title: "Synthetic platform handbook", uri: "synthetic://agentcore-poc-handbook#controls" }]
    })
  };

  const response = await retrieveGroundedAnswer(client, allowedInput);
  assert.equal(response.outcome, "answer");
  assert.deepEqual(response.citations, [{ title: "Synthetic platform handbook", uri: "synthetic://agentcore-poc-handbook#controls" }]);
});
