import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { validateRuntimeRequest, validateRuntimeResponse } from "../src/validation.js";

const examplesDirectory = resolve(process.cwd(), "../../../../shared/examples/agentcore-rag-poc");

test("runtime request rejects an action-bearing tool payload", () => {
  const result = validateRuntimeRequest({
    requestId: "synthetic-request-001",
    question: "What controls protect a governed AI platform?",
    knowledgeSource: "agentcore-poc-handbook",
    governance: { sourceLifecycle: "active", requireCitations: true, entryPath: "gateway" },
    tool: { name: "delete-resource" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "invalid_request");
});

test("runtime request accepts the smallest gateway-only retrieval shape", () => {
  const result = validateRuntimeRequest({
    requestId: "synthetic-request-002",
    question: "What controls protect a governed AI platform?",
    knowledgeSource: "agentcore-poc-handbook",
    governance: { sourceLifecycle: "active", requireCitations: true, entryPath: "gateway" }
  });

  assert.deepEqual(result, { ok: true });
});

test("six synthetic evaluation cases use the closed request contract", async () => {
  const requestFiles = (await readdir(examplesDirectory)).filter((file) => file.endsWith(".request.json"));
  assert.equal(requestFiles.length, 6);

  for (const file of requestFiles) {
    const request = JSON.parse(await readFile(resolve(examplesDirectory, file), "utf8"));
    assert.deepEqual(validateRuntimeRequest(request), { ok: true }, file);
  }
});

test("runtime response rejects raw provider content and accepts citation metadata", () => {
  const validResponse = {
    requestId: "synthetic-request-002",
    outcome: "answer",
    answer: "Use identity, source lifecycle, and evaluation controls.",
    citations: [{ title: "Synthetic platform handbook", uri: "synthetic://agentcore-poc-handbook#controls" }],
    audit: { sourceLifecycle: "active", citationPresent: true }
  };

  assert.deepEqual(validateRuntimeResponse(validResponse), { ok: true });
  assert.equal(validateRuntimeResponse({ ...validResponse, rawProviderResponse: "not allowed" }).ok, false);
});
