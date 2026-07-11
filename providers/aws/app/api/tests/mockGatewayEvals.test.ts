import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  runMockGatewayEvals,
  type MockGatewayEvalReport
} from "../src/evals/mockGatewayEvals.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/mock-genai-api");

test("runMockGatewayEvals reports all default mock gateway eval cases as passed", async () => {
  const report = await runMockGatewayEvals();

  assert.equal(report.mode, "mock");
  assert.equal(report.totalCases, 6);
  assert.equal(report.passedCases, 6);
  assert.equal(report.failedCases, 0);
  assert.deepEqual(
    report.results.map((result) => result.id),
    [
      "allowed-chat-request",
      "token-budget-blocked-request",
      "unsupported-model-request",
      "response-metadata-present",
      "request-log-omits-prompt",
      "governed-rag-query-contract"
    ]
  );
  assert.ok(report.results.every((result) => result.passed));
});

test("mock gateway evals include contract, guardrail, metadata, and observability categories", async () => {
  const report = await runMockGatewayEvals();
  const categories = new Set(report.results.map((result) => result.category));

  assert.ok(categories.has("contract"));
  assert.ok(categories.has("guardrail"));
  assert.ok(categories.has("metadata"));
  assert.ok(categories.has("observability"));
});

test("mock gateway evals include governed RAG query evidence", async () => {
  const report = await runMockGatewayEvals();
  const ragEval = report.results.find((result) => result.id === "governed-rag-query-contract");

  assert.ok(ragEval);
  assert.equal(ragEval.category, "contract");
  assert.equal(ragEval.passed, true);
  assert.match(ragEval.evidence, /citation, egress decision, and audit evidence/i);
});

test("mock gateway eval report fixture matches the current report shape", async () => {
  const raw = await readFile(resolve(EXAMPLE_DIR, "eval-result.mock.json"), "utf8");
  const fixture = JSON.parse(raw) as MockGatewayEvalReport;
  const report = await runMockGatewayEvals();

  assert.equal(fixture.mode, report.mode);
  assert.equal(fixture.totalCases, report.totalCases);
  assert.equal(fixture.passedCases, report.passedCases);
  assert.equal(fixture.failedCases, report.failedCases);
  assert.deepEqual(
    fixture.results.map((result) => ({
      id: result.id,
      category: result.category,
      passed: result.passed
    })),
    report.results.map((result) => ({
      id: result.id,
      category: result.category,
      passed: result.passed
    }))
  );
});
