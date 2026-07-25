import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DOC_PATH = resolve(process.cwd(), "../../../../docs/ai-workload-operating-contract.md");
const AI_FACTORY_PATH = resolve(process.cwd(), "../../../../docs/ai-factory-infrastructure-lens.md");
const OBSERVABILITY_PATH = resolve(process.cwd(), "../../../../docs/observability.md");
const FINOPS_PATH = resolve(process.cwd(), "../../../../docs/ai-finops.md");

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

test("AI Factory documentation distinguishes orchestration from future scheduling", async () => {
  const document = await readFile(AI_FACTORY_PATH, "utf8");

  assert.match(document, /Kubernetes.*service inference/i);
  assert.match(document, /batch.*training.*scheduling/i);
  assert.match(document, /does not deploy Slurm/);
});

test("observability and FinOps documents define model, workload, infrastructure, and governance signals", async () => {
  const observability = await readFile(OBSERVABILITY_PATH, "utf8");
  const finops = await readFile(FINOPS_PATH, "utf8");

  assert.match(observability, /## Infrastructure Signals/);
  assert.match(observability, /## Governance Signals/);
  assert.match(finops, /cost per successful outcome/);
});
