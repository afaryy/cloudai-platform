import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");

test("AgentCore POC is discoverable from the public portfolio navigation", async () => {
  const readme = await readFile(resolve(repoRoot, "README.md"), "utf8");
  const library = await readFile(resolve(repoRoot, "docs/architecture/architecture-library.md"), "utf8");
  const solutions = await readFile(resolve(repoRoot, "docs/solutions/featured-solutions.md"), "utf8");

  assert.match(readme, /AgentCore Governed RAG POC/i);
  assert.match(library, /AgentCore Governed RAG POC/i);
  assert.match(solutions, /## AgentCore Governed RAG POC/i);
  assert.match(solutions, /sandbox-validated/i);
  assert.match(solutions, /not a production autonomous[- ]agent platform/i);
});

test("AgentCore RAG runbook preserves synthetic-only and manual-deployment boundaries", async () => {
  const runbook = await readFile(resolve(repoRoot, "docs/solutions/agentcore-governed-rag-poc-runbook.md"), "utf8");
  assert.match(runbook, /synthetic/i);
  assert.match(runbook, /manual approval/i);
  assert.match(runbook, /teardown/i);
  assert.match(runbook, /not production-ready guidance/i);
});

test("AgentCore RAG preflight evidence is sanitized and records no resource change", async () => {
  const evidence = await readFile(resolve(repoRoot, "docs/evidence/agentcore-governed-rag-preflight-evidence.md"), "utf8");
  assert.match(evidence, /Resource changes: none/i);
  assert.match(evidence, /AWS identity \| Pass/i);
  assert.doesNotMatch(evidence, /\b\d{12}\b/);
  assert.doesNotMatch(evidence, /arn:aws/i);
});
