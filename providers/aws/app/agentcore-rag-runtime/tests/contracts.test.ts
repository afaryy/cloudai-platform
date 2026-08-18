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

test("five behavioural evaluation cases preserve bounded outcomes and evidence levels", async () => {
  const cases = JSON.parse(await readFile(resolve(examplesDirectory, "behavioral-evaluation-cases.json"), "utf8")) as Array<Record<string, any>>;
  assert.equal(cases.length, 5);
  assert.deepEqual(cases.map((evaluation) => evaluation.scenario), [
    "synthetic-citation-missing",
    "synthetic-stale-source",
    "synthetic-provider-timeout",
    "synthetic-denied-tool",
    "synthetic-human-approval-boundary"
  ]);

  for (const evaluation of cases) {
    assert.match(evaluation.scenario, /^synthetic-/);
    assert.ok(evaluation.title);
    assert.ok(evaluation.boundary);
    assert.ok(evaluation.expectedOutcome);
    assert.ok(evaluation.expectedReasonCode);
    assert.equal(evaluation.evidenceLevel, "local-contract");
    assert.ok(evaluation.simulation);
  }

  assert.deepEqual(validateRuntimeRequest(cases[0].runtimeRequest), { ok: true });
  assert.deepEqual(validateRuntimeRequest(cases[1].runtimeRequest), { ok: true });
  assert.deepEqual(validateRuntimeRequest(cases[2].runtimeRequest), { ok: true });
  assert.equal(cases[3].action.toolId, "unapproved-tool");
  assert.equal(cases[4].action.actionClass, "high-impact");
  assert.equal(cases[4].expectedOutcome, "approval-required");
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
