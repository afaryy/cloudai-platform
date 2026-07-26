import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DASHBOARD_PATH = resolve(process.cwd(), "../../../../observability/grafana/cloudai-mock-api-dashboard.json");

test("Grafana dashboard contains only the five synthetic observability panels", async () => {
  const dashboard = JSON.parse(await readFile(DASHBOARD_PATH, "utf8"));

  assert.equal(dashboard.title, "CloudAI Mock API — Synthetic Sandbox");
  assert.deepEqual(dashboard.panels.map((panel: { title: string }) => panel.title), [
    "Request rate and outcome",
    "Request latency",
    "Token estimate and synthetic cost",
    "Policy and guardrail verdicts",
    "AgentOps and workflow state"
  ]);
  assert.match(JSON.stringify(dashboard), /cloudai_request_total/);
  assert.doesNotMatch(JSON.stringify(dashboard), /requestId|traceId|prompt|payload|tenant|user/i);
});
