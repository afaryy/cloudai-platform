import type { RuntimeOutcome, SourceLifecycle } from "./validation.js";

export interface RuntimeObservation {
  requestId: string;
  outcome: RuntimeOutcome;
  reasonCode?: string;
  sourceLifecycle: SourceLifecycle;
  citationPresent: boolean;
  latencyMs: number;
  providerFailureClass?: string;
}

const metricNamespace = "CloudAI/AgentCoreRag";
const route = "governed-rag-runtime";
const environment = process.env.AGENTCORE_OBSERVABILITY_ENVIRONMENT ?? "agentcore-rag-sandbox";

/**
 * Emit one metadata-safe JSON event per validated invocation.
 *
 * Request IDs stay in the log body for correlation but are deliberately not
 * metric dimensions. This keeps the EMF series bounded and avoids a
 * high-cardinality custom-metric bill.
 */
export function emitRuntimeObservation(observation: RuntimeObservation): void {
  const reasonCode = observation.reasonCode ?? "none";
  const metrics = {
    InvocationCount: 1,
    InvocationLatencyMs: Math.max(0, Math.round(observation.latencyMs)),
    AnswerCount: observation.outcome === "answer" ? 1 : 0,
    AbstentionCount: observation.outcome === "abstain" ? 1 : 0,
    DeniedCount: observation.outcome === "denied" ? 1 : 0,
    DisabledCount: observation.outcome === "disabled" ? 1 : 0,
    CitationMissingCount: observation.outcome === "answer" && !observation.citationPresent ? 1 : 0,
    RetrievalUnavailableCount: reasonCode === "retrieval_unavailable" ? 1 : 0
  };

  console.log(JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: metricNamespace,
        Dimensions: [["Environment", "Route", "Outcome"]],
        Metrics: Object.entries(metrics).map(([Name, value]) => ({
          Name,
          Unit: Name === "InvocationLatencyMs" ? "Milliseconds" : "Count"
        }))
      }]
    },
    event: "agentcore_rag_invocation_completed",
    environment,
    route,
    requestId: observation.requestId,
    outcome: observation.outcome,
    reasonCode,
    sourceLifecycle: observation.sourceLifecycle,
    citationPresent: observation.citationPresent,
    latencyMs: metrics.InvocationLatencyMs,
    providerFailureClass: observation.providerFailureClass,
    ...metrics
  }));
}
