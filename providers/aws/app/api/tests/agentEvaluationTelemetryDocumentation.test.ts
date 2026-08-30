import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(process.cwd(), "../../../..");

test("agent evaluation telemetry documentation records standards, scores, and evidence boundaries", async () => {
  const documentation = (await Promise.all([
    "docs/solutions/agent-evaluation-telemetry-runbook.md",
    "docs/architecture/agentcore-governed-rag-poc.md",
    "docs/solutions/p8i-agentcore-rag-key-process-record.md",
    "docs/practices/current-status.md",
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
    "does not call AWS",
    "provider-parity-v1",
    "provider-direct",
    "I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY",
    "AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME",
    "AGENTCORE_EVALUATION_MAX_CALLS=6",
    "Builtin.ToolSelectionAccuracy",
    "Stage B",
    "Runtime-to-CloudWatch"
  ]) {
    assert.match(documentation, new RegExp(escapeRegExp(required), "i"));
  }
});

test("managed-score boundaries reserve admission and approval for deterministic controls", async () => {
  const scoreBoundaryDocuments = [
    "docs/solutions/agent-evaluation-telemetry-runbook.md",
    "docs/architecture/agentcore-governed-rag-poc.md",
    "docs/solutions/p8i-agentcore-rag-key-process-record.md"
  ];

  for (const path of scoreBoundaryDocuments) {
    const document = await readFile(resolve(ROOT, path), "utf8");
    assert.match(
      document,
      /Managed scores supplement\s+deterministic\s+controls[\s\S]{0,120}never authorize IAM,\s+admission or approval,\s+tool execution,\s+deployment,\s+remediation,\s+rollback,\s+or\s+deletion/i,
      `${path} must reserve admission and approval for deterministic controls`
    );
  }
});

test("current status does not overstate the local agent evaluation evidence", async () => {
  const currentStatus = await readFile(
    resolve(ROOT, "docs/practices/current-status.md"),
    "utf8"
  );
  const telemetryRow = currentStatus
    .split("\n")
    .find((line) => line.startsWith("| Framework-neutral agent evaluation telemetry |"));

  assert.ok(telemetryRow, "current status must include the telemetry gate");
  assert.doesNotMatch(telemetryRow, /live validated/i);
  assert.doesNotMatch(telemetryRow, /managed evaluation/i);
  assert.doesNotMatch(telemetryRow, /provider validated/i);
  assert.doesNotMatch(telemetryRow, /runtime validated/i);
  assert.doesNotMatch(telemetryRow, /production evaluation/i);
  assert.match(telemetryRow, /source implemented/i);
  assert.match(telemetryRow, /provider validation pending/i);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
