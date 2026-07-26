# Observability and Evaluation

Observability helps platform teams understand AI traffic behavior, reliability, cost, and governance outcomes. Evaluation adds structured review of model and workflow quality before patterns are promoted beyond mock mode.

## Model and Request Signals

- Request count, latency, and error rate.
- Policy allow, deny, and review decisions.
- Provider and model routing decisions.
- Token estimates and cost allocation metadata.
- Quota, rate-limit, and capacity utilization signals.
- Guardrail trigger, safety policy, and blocked-request events.
- Agent session, tool-call, retrieval, and workflow trace events.
- Safety and responsible AI review markers.
- Synthetic evaluation results for prompt quality, response quality, retrieval relevance, and policy behavior.
- Human review outcomes for higher-risk examples.

## Workload Signals

- Workload class, owner, environment, and lifecycle state.
- Request/job queued, running, completed, failed, paused, or retired state.
- Retry count, queue time, completion criterion, and release/rollback outcome.
- Trace correlation across gateway, policy, guardrail, retrieval, and workflow evidence.

## Infrastructure Signals

- Capacity, quota, rate-limit, and headroom signals for the selected runtime.
- Future CPU/GPU utilisation, memory pressure, storage throughput, and network health signals.
- Future workload-placement, node health, and accelerator availability evidence where a bounded runtime exists.

The current repository does not collect GPU, storage, or network telemetry. These are future signal definitions, not a deployed monitoring stack.

## Governance Signals

- Policy allow, deny, and approval-required decisions.
- Data/egress boundary, guardrail, capability-lifecycle, and approval evidence.
- Budget stop condition, escalation outcome, pause/terminate action, and retirement evidence.

## Capacity and Operations Signals

The platform should make it possible to answer:

- Which model, provider, region, and route handled the request?
- Was the request served in real time, batched, cached, throttled, or failed over?
- Which quota, rate limit, or capacity control applied?
- Did any guardrail, safety policy, or content filter allow, block, or require review?
- Did retrieval, agent tooling, or workflow orchestration contribute to latency or cost?
- Which evaluation, policy, or human-review events are linked to the trace?

## Early Scope

The current P1 mock API includes local metadata, request logs, token estimates, and a small mock eval harness for gateway behavior checks.

The local eval harness checks synthetic cases for:

- allowed request behavior
- token budget blocking
- unsupported model blocking
- response metadata presence
- request log omission of prompt text and request bodies

Provider-specific dashboards, alarms, distributed traces, provider-hosted evals, and larger benchmark suites are future work.

## Optional EKS Sandbox Demonstration

The [EKS Prometheus and Grafana observability demonstration](eks-prometheus-grafana-observability-demo.md) is a planned, manually approved exercise for real Prometheus scraping and Grafana dashboard practice with synthetic metrics. It remains private-cluster, port-forward-only, time-boxed, and teardown-bound; it is not current production-monitoring evidence.
