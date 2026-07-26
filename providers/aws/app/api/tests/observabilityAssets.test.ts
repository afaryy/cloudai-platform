import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DASHBOARD_PATH = resolve(process.cwd(), "../../../../helm/ai-api-service/dashboards/cloudai-mock-api-dashboard.json");
const CHART_PATH = resolve(process.cwd(), "../../../../helm/ai-api-service");
const GUIDE_PATH = resolve(process.cwd(), "../../../../docs/eks-prometheus-grafana-observability-demo.md");

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

test("observability Helm render is internal and opt-in", () => {
  const rendered = execFileSync("helm", [
    "template",
    "cloudai-observability",
    CHART_PATH,
    "--namespace",
    "cloudai-observability",
    "--set",
    "metrics.enabled=true",
    "--set",
    "metrics.serviceMonitor.enabled=true",
    "--set",
    "metrics.grafanaDashboard.enabled=true"
  ], { encoding: "utf8" });

  assert.match(rendered, /kind: ServiceMonitor/);
  assert.match(rendered, /path: \/metrics/);
  assert.match(rendered, /kind: ConfigMap/);
  assert.doesNotMatch(rendered, /kind: Ingress|type: LoadBalancer/);
});

test("observability sandbox guide preserves the time-boxed private-access boundary", async () => {
  const guide = await readFile(GUIDE_PATH, "utf8");

  assert.match(guide, /port-forward only/i);
  assert.match(guide, /same-day teardown/i);
  assert.match(guide, /I_UNDERSTAND_COST_AND_TEARDOWN/);
  assert.match(guide, /I_UNDERSTAND_DESTROY/);
  assert.doesNotMatch(guide, /Ingress|LoadBalancer/);
});
