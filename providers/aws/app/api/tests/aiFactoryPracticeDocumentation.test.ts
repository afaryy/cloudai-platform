import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DOC_PATH = resolve(process.cwd(), "../../../../docs/practices/ai-workload-operating-contract.md");
const AI_FACTORY_PATH = resolve(process.cwd(), "../../../../docs/architecture/ai-factory-infrastructure-lens.md");
const GPU_READINESS_PATH = resolve(process.cwd(), "../../../../docs/architecture/ai-factory-gpu-workload-readiness.md");
const OBSERVABILITY_PATH = resolve(process.cwd(), "../../../../docs/practices/observability.md");
const FINOPS_PATH = resolve(process.cwd(), "../../../../docs/practices/ai-finops.md");
const README_PATH = resolve(process.cwd(), "../../../../README.md");
const FEATURED_SOLUTIONS_PATH = resolve(process.cwd(), "../../../../docs/solutions/featured-solutions.md");
const CURRENT_STATUS_PATH = resolve(process.cwd(), "../../../../docs/practices/current-status.md");

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

test("AI Workload Operating Contract distinguishes current AgentOps controls from a future operating contract", async () => {
  const document = await readFile(DOC_PATH, "utf8");

  assert.match(document, /Current AgentOps authorisation controls/);
  assert.match(document, /future Agent Action \/ Operating Contract/);
});

test("AI Workload Operating Contract presents tool adoption as a staged path", async () => {
  const document = await readFile(DOC_PATH, "utf8");

  assert.match(document, /### 1\. Local observability foundation/);
  assert.match(document, /### 2\. Correlate existing evidence/);
  assert.match(document, /### 3\. Expose only after local proof/);
  assert.match(document, /### 4\. Defer provider and GPU tooling/);
});

test("AI Factory documentation distinguishes orchestration from future scheduling", async () => {
  const document = await readFile(AI_FACTORY_PATH, "utf8");

  assert.match(document, /Kubernetes.*service inference/i);
  assert.match(document, /batch.*training.*scheduling/i);
  assert.match(document, /does not deploy Slurm/);
});

test("GPU readiness documentation distinguishes the source path from a deployed runtime", async () => {
  const document = await readFile(GPU_READINESS_PATH, "utf8");

  assert.match(document, /Kueue-aware admission contract/);
  assert.match(document, /EKS GPU \+ Kueue POC design/);
  assert.match(document, /source implementation is not a deployed GPU runtime/i);
  assert.match(document, /device plugins.*baseline/i);
  assert.match(document, /Dynamic Resource Allocation/);
  assert.match(document, /future advanced allocation path/i);
});

test("GPU placement guidance joins admission, runtime outcomes, and FinOps without a deployment claim", async () => {
  const readiness = await readFile(GPU_READINESS_PATH, "utf8");
  const placement = await readFile(resolve(process.cwd(), "../../../../docs/architecture/ai-factory-workload-placement-comparison.md"), "utf8");

  assert.match(readiness, /## Correlation-first observability panels/);
  assert.match(readiness, /admission → GPU health →\s*queue\/checkpoint state → goodput\/SLO → cost/i);
  assert.match(readiness, /No DCGM, Prometheus, Grafana, GPU Operator, or live GPU sandbox deployment/i);
  assert.match(placement, /Placement is a contract decision, not a benchmark claim/);
  assert.match(placement, /one-node[\s\S]*Kueue[\s\S]*proof of concept/i);
  assert.match(placement, /queue wait[\s\S]*GPU\/runtime health[\s\S]*checkpoint[\s\S]*goodput[\s\S]*cost/i);
  assert.match(placement, /does not provision\s+GPU nodes/i);
});

test("observability and FinOps documents define model, workload, infrastructure, and governance signals", async () => {
  const observability = await readFile(OBSERVABILITY_PATH, "utf8");
  const finops = await readFile(FINOPS_PATH, "utf8");

  assert.match(observability, /## Infrastructure Signals/);
  assert.match(observability, /## Governance Signals/);
  assert.match(finops, /cost per successful outcome/);
});

test("AI Factory practice navigation is present without a false runtime claim", async () => {
  for (const path of [README_PATH, FEATURED_SOLUTIONS_PATH, CURRENT_STATUS_PATH]) {
    const document = await readFile(path, "utf8");
    assert.match(document, /ai-workload-operating-contract\.md/);
  }

  const readme = await readFile(README_PATH, "utf8");
  assert.match(readme, /future\/design practice track/);
  assert.doesNotMatch(readme, /Implemented — GPU cluster/);
  assert.doesNotMatch(readme, /Implemented — Slurm/);
});

test("AI Factory status records the source path without a runtime claim", async () => {
  const status = await readFile(CURRENT_STATUS_PATH, "utf8");
  const readiness = await readFile(GPU_READINESS_PATH, "utf8");

  assert.match(status, /synthetic Agent\/RAG, batch, fine-tuning, and distributed-training workload profiles/);
  assert.match(status, /one-node GPU \+ Kueue source path/);
  assert.match(readiness, /source implementation is not a deployed GPU runtime/i);
  assert.match(status, /still no deployed GPU runtime, scheduler validation, or AI Factory implementation/);
});
