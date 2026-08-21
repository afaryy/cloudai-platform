import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const RUNBOOK_PATH = resolve(process.cwd(), "../../../../docs/solutions/eks-gpu-kueue-poc-runbook.md");

test("GPU Kueue POC runbook preserves active-cluster, bounded-runtime, and no-destroy controls", async () => {
  const runbook = await readFile(RUNBOOK_PATH, "utf8");

  assert.match(runbook, /EKS sandbox.*ACTIVE/is);
  assert.match(runbook, /min=0.*desired=0.*max=1/is);
  assert.match(runbook, /activeDeadlineSeconds: 300/);
  assert.match(runbook, /AUD 75.*not a hard cap/is);
  assert.match(runbook, /does not provide a destroy mode/is);
  assert.match(runbook, /NVIDIA device plugin.*not DRA/is);
});
