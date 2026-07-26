import { Counter, Histogram, Registry } from "prom-client";
import type { ModelProvider } from "../clients/providerClient.js";

const SAFE_ROUTES = new Set([
  "/health",
  "/chat",
  "/rag/status",
  "/rag/artifacts",
  "/rag/query",
  "/agent-actions/authorize",
  "/agent-actions/reliability-evaluate",
  "/guardrails/assess"
]);

export type RequestMetricOutcome = "success" | "client_error" | "server_error" | "not_found";

export type RequestMetricObservation = {
  route: string;
  outcome: RequestMetricOutcome;
  mode: ModelProvider;
  durationMs: number;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  estimatedCostUsd?: number;
  policyVerdict?: string;
  guardrailVerdict?: string;
  agentDecision?: string;
  runtimeState?: string;
  workloadState?: string;
};

export interface MetricsCollector {
  recordRequest(observation: RequestMetricObservation): void;
  renderMetrics(): Promise<string>;
}

export function createMetricsCollector(): MetricsCollector {
  const registry = new Registry();
  const requestTotal = new Counter({
    name: "cloudai_request_total",
    help: "Synthetic CloudAI API requests by route, outcome, and provider mode.",
    labelNames: ["route", "outcome", "mode"],
    registers: [registry]
  });
  const requestDurationSeconds = new Histogram({
    name: "cloudai_request_duration_seconds",
    help: "Synthetic CloudAI API request duration by route, outcome, and provider mode.",
    labelNames: ["route", "outcome", "mode"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [registry]
  });
  const estimatedInputTokensTotal = new Counter({
    name: "cloudai_estimated_input_tokens_total",
    help: "Synthetic estimated input tokens by route and provider mode.",
    labelNames: ["route", "mode"],
    registers: [registry]
  });
  const estimatedOutputTokensTotal = new Counter({
    name: "cloudai_estimated_output_tokens_total",
    help: "Synthetic estimated output tokens by route and provider mode.",
    labelNames: ["route", "mode"],
    registers: [registry]
  });
  const estimatedCostUsdTotal = new Counter({
    name: "cloudai_estimated_cost_usd_total",
    help: "Synthetic estimated cost in USD by route and provider mode.",
    labelNames: ["route", "mode"],
    registers: [registry]
  });
  const policyVerdictTotal = new Counter({
    name: "cloudai_policy_verdict_total",
    help: "Synthetic policy verdicts by verdict.",
    labelNames: ["verdict"],
    registers: [registry]
  });
  const guardrailVerdictTotal = new Counter({
    name: "cloudai_guardrail_verdict_total",
    help: "Synthetic guardrail verdicts by verdict.",
    labelNames: ["verdict"],
    registers: [registry]
  });
  const agentOpsDecisionTotal = new Counter({
    name: "cloudai_agentops_decision_total",
    help: "Synthetic AgentOps decisions by decision and runtime state.",
    labelNames: ["decision", "runtime_state"],
    registers: [registry]
  });
  const workflowStateTotal = new Counter({
    name: "cloudai_workflow_state_total",
    help: "Synthetic workflow states by state.",
    labelNames: ["state"],
    registers: [registry]
  });

  return {
    recordRequest(observation): void {
      const route = safeRoute(observation.route);
      const outcome = observation.outcome;
      const mode = observation.mode;
      requestTotal.inc({ route, outcome, mode });
      requestDurationSeconds.observe({ route, outcome, mode }, Math.max(0, observation.durationMs) / 1000);

      incrementIfPositive(estimatedInputTokensTotal, { route, mode }, observation.estimatedInputTokens);
      incrementIfPositive(estimatedOutputTokensTotal, { route, mode }, observation.estimatedOutputTokens);
      incrementIfPositive(estimatedCostUsdTotal, { route, mode }, observation.estimatedCostUsd);
      incrementIfPresent(policyVerdictTotal, { verdict: safeLabel(observation.policyVerdict) }, observation.policyVerdict);
      incrementIfPresent(guardrailVerdictTotal, { verdict: safeLabel(observation.guardrailVerdict) }, observation.guardrailVerdict);
      if (observation.agentDecision && observation.runtimeState) {
        agentOpsDecisionTotal.inc({
          decision: safeLabel(observation.agentDecision),
          runtime_state: safeLabel(observation.runtimeState)
        });
      }
      incrementIfPresent(workflowStateTotal, { state: safeLabel(observation.workloadState) }, observation.workloadState);
    },
    renderMetrics(): Promise<string> {
      return registry.metrics();
    }
  };
}

function safeRoute(route: string): string {
  return SAFE_ROUTES.has(route) ? route : "other";
}

function safeLabel(value: string | undefined): string {
  return value && /^[a-z0-9_-]{1,64}$/i.test(value) ? value : "not_applicable";
}

function incrementIfPositive(
  metric: Counter<string>,
  labels: Record<string, string>,
  value: number | undefined
): void {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    metric.inc(labels, value);
  }
}

function incrementIfPresent(
  metric: Counter<string>,
  labels: Record<string, string>,
  value: string | undefined
): void {
  if (value) {
    metric.inc(labels);
  }
}
