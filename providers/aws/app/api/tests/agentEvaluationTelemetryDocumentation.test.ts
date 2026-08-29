import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(process.cwd(), "../../../..");

test("agent evaluation telemetry documentation records standards, scores, and evidence boundaries", async () => {
  const documentation = (await Promise.all([
    "docs/solutions/agent-evaluation-telemetry-runbook.md",
    "docs/architecture/agentcore-governed-rag-poc.md",
    "providers/aws/app/api/README.md"
  ].map((path) => readFile(resolve(ROOT, path), "utf8")))).join("\n");

  for (const required of [
    "OpenTelemetry GenAI",
    "OpenInference",
    "opentelemetry.instrumentation.*",
    "openinference.instrumentation.*",
    "local.telemetry_compatibility",
    "local.tool_trajectory_accuracy",
    "locally contract-tested",
    "protected provider-parity lane",
    "does not call AWS"
  ]) {
    assert.match(documentation, new RegExp(escapeRegExp(required), "i"));
  }
});

test("current status does not overstate the local agent evaluation evidence", async () => {
  const currentStatus = await readFile(
    resolve(ROOT, "docs/practices/current-status.md"),
    "utf8"
  );
  const telemetryRow = currentStatus
    .split("\n")
    .find((line) => line.includes("Framework-neutral agent evaluation telemetry"));

  assert.ok(telemetryRow, "current status must include the telemetry gate");
  assert.doesNotMatch(telemetryRow, /live validated/i);
  assert.doesNotMatch(telemetryRow, /managed evaluation/i);
  assert.doesNotMatch(telemetryRow, /production evaluation/i);
  assert.match(telemetryRow, /locally contract-tested/i);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
