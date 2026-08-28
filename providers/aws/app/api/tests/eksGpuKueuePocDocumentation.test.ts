import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const RUNBOOK_PATH = resolve(process.cwd(), "../../../../docs/solutions/eks-gpu-kueue-poc-runbook.md");
const CURRENT_STATUS_PATH = resolve(process.cwd(), "../../../../docs/practices/current-status.md");

test("GPU Kueue POC runbook preserves active-cluster, bounded-runtime, and no-destroy controls", async () => {
  const runbook = await readFile(RUNBOOK_PATH, "utf8");

  assert.match(runbook, /EKS sandbox.*ACTIVE/is);
  assert.match(runbook, /min=0.*desired=0.*max=1/is);
  assert.match(runbook, /activeDeadlineSeconds: 300/);
  assert.match(runbook, /AUD 75.*not a hard cap/is);
  assert.match(runbook, /does not provide a destroy mode/is);
  assert.match(runbook, /NVIDIA device plugin.*not DRA/is);
});

test("GPU source validation remains separate from protected runtime evidence", async () => {
  const [runbook, currentStatus] = await Promise.all([
    readFile(RUNBOOK_PATH, "utf8"),
    readFile(CURRENT_STATUS_PATH, "utf8"),
  ]);

  assert.match(runbook, /source-validate.*without AWS credentials/is);
  assert.match(runbook, /runtime-validate.*protected.*AWS/is);
  assert.match(currentStatus, /Private EKS, ARC and GPU source: source implemented; runtime validation pending\./);
  assert.match(currentStatus, /earlier public EKS sandbox was destroyed and is not the private GPU target\./);
  assert.match(currentStatus, /AgentCore RAG is a separate managed-runtime path and is not hosted on EKS\./);
});
