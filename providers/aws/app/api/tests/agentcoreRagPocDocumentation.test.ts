import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");

test("AgentCore RAG runbook preserves synthetic-only and manual-deployment boundaries", async () => {
  const runbook = await readFile(resolve(repoRoot, "docs/solutions/agentcore-governed-rag-poc-runbook.md"), "utf8");
  assert.match(runbook, /synthetic/i);
  assert.match(runbook, /manual approval/i);
  assert.match(runbook, /teardown/i);
  assert.match(runbook, /not production-ready guidance/i);
});
