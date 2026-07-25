import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DOC_PATH = resolve(process.cwd(), "../../../../docs/ai-workload-operating-contract.md");

test("AI Workload Operating Contract documents every agreed workload profile", async () => {
  const document = await readFile(DOC_PATH, "utf8");

  for (const profile of ["Service Inference", "Batch Processing", "Fine-Tuning", "Distributed Training"]) {
    assert.match(document, new RegExp(`## ${profile}`));
  }
});

test("AI Workload Operating Contract preserves the mock-first boundary", async () => {
  const document = await readFile(DOC_PATH, "utf8");

  assert.match(document, /does not add a scheduler, GPU cluster, or cloud runtime/);
});
