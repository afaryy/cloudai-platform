import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const currentStatusPath = resolve(repoRoot, "docs/practices/current-status.md");
const runbookPath = resolve(repoRoot, "docs/solutions/yy-44-cost-guardrails-runbook.md");

test("YY-44 documentation records the protected apply without overstating enforcement", async () => {
  const [currentStatus, runbook] = await Promise.all([
    readFile(currentStatusPath, "utf8"),
    readFile(runbookPath, "utf8"),
  ]);
  const combined = `${currentStatus}\n${runbook}`;

  assert.match(currentStatus, /YY-44 Cost Guardrails.*protected apply complete/is);
  assert.match(combined, /exactly two.*notification-only.*AWS Budget/is);
  assert.match(combined, /notification delivery.*not.*validated/is);
  assert.match(combined, /not.*automatic shutdown|not.*real-time kill switch/is);
  assert.doesNotMatch(currentStatus, /YY-44 Cost Guardrails.*Source implementation planned/is);
  assert.doesNotMatch(runbook, /Until both protected applies succeed.*source implementation only/is);
});
