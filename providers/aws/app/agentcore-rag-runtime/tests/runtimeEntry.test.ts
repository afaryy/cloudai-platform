import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDependencies } from "../src/runtimeEntry.js";

const request = {
  requestId: "synthetic-runtime-entry-001",
  question: "What controls protect a governed AI platform?",
  knowledgeSource: "agentcore-poc-handbook" as const,
  governance: { sourceLifecycle: "active" as const, requireCitations: true, entryPath: "gateway" as const }
};

test("missing Bedrock configuration abstains without calling a provider", async () => {
  let factoryCalls = 0;
  const dependencies = await createRuntimeDependencies({}, async () => {
    factoryCalls += 1;
    throw new Error("must not initialize a provider without approved configuration");
  });

  const response = await dependencies.retrieveAndGenerate(request);
  assert.equal(factoryCalls, 0);
  assert.equal(response.outcome, "abstain");
  assert.equal(response.reasonCode, "retrieval_unavailable");
});

test("approved Bedrock configuration returns only the bounded cited result", async () => {
  const dependencies = await createRuntimeDependencies({
    AGENTCORE_RAG_KNOWLEDGE_BASE_ID: "ABCDEFGHIJ",
    AGENTCORE_RAG_MODEL_ARN: "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
  }, async () => ({
    retrieveAndGenerate: async () => ({
      answer: "Use identity and source lifecycle controls.",
      citations: [{ title: "Synthetic platform handbook", uri: "synthetic://agentcore-poc-handbook#controls" }]
    })
  }));

  const response = await dependencies.retrieveAndGenerate(request);
  assert.equal(response.outcome, "answer");
  assert.deepEqual(response.citations, [{ title: "Synthetic platform handbook", uri: "synthetic://agentcore-poc-handbook#controls" }]);
});
