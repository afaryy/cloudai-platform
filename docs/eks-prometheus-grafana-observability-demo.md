# EKS Prometheus and Grafana Observability Demonstration

## Purpose and Boundary

This is an optional, short-lived personal EKS sandbox exercise for the synthetic CloudAI mock API. It proves real Prometheus scraping, Grafana dashboard use, private-cluster access, and teardown discipline. It is not a production monitoring deployment, SLO, capacity study, or model-quality evaluation.

The API emits aggregate metadata-only metrics. Prompts, request or response bodies, tool payloads, source text, credentials, account identifiers, request IDs, trace IDs, timestamps, and free-form errors must never appear as metric labels or values.

Prometheus and Grafana use private cluster services and port-forward only access. Do not expose a dashboard publicly or retain the sandbox after the exercise.

## Prerequisites

Before any apply, confirm all of the following:

- the existing `aws-sandbox` GitHub environment has manual approval and the private current-operator `/32` setting;
- a named teardown owner and a same-day teardown window;
- a budget alert below the agreed AUD 100 ceiling, with a lower early-warning threshold;
- the existing EKS sandbox plan is reviewed without committing plans, state, endpoint values, or kubeconfig;
- all repository tests, Helm lint/render checks, and secret/scope checks are green.

AWS Budget alerts are advisory. Short duration and verified cleanup are the primary cost controls.

## Run Order

1. Confirm the budget alert, teardown owner, current operator `/32`, and `aws-sandbox` approval.
2. Run the existing Terraform plan and review it privately.
3. Trigger `.github/workflows/terraform-eks-sandbox.yml` in `apply` mode with `confirm_apply=I_UNDERSTAND_COST_AND_TEARDOWN`.
4. Install `kube-prometheus-stack` with `observability/kube-prometheus-stack-values.yaml` into the `observability` namespace.
5. Install `helm/ai-api-service` into `cloudai-observability` with `metrics.enabled=true`, `metrics.serviceMonitor.enabled=true`, and `metrics.grafanaDashboard.enabled=true`.
6. Use temporary port-forward sessions for Grafana and the mock API. Send only synthetic requests, verify the Prometheus scrape target, and review the five dashboard panels.
7. Record metadata-only evidence using [the evidence template](evidence/templates/eks-observability-sandbox-evidence.md).
8. Uninstall both Helm releases, delete the two namespaces, then trigger Terraform `destroy` with `confirm_destroy=I_UNDERSTAND_DESTROY`.
9. Record successful cleanup and destroy. Do not retain endpoints, screenshots, kubeconfig, plans, or state in git.

## Dashboard Signals

The dashboard shows only synthetic, aggregate signals:

- request rate and outcome by route;
- request latency;
- estimated tokens and synthetic cost;
- policy and guardrail verdict counts;
- AgentOps decision, runtime, and workflow state counts.

The checked-in dashboard is intentionally small. It does not replace incident response, retention policy, alert design, or production capacity planning.

## Evidence and Teardown

Use a private copy of the evidence template for the actual run. Prefer text-only, sanitized evidence. If a screenshot is necessary, remove browser chrome, account details, endpoints, timestamps, and any other identifying data before sharing it.

If deployment, scrape validation, dashboard import, Helm cleanup, namespace deletion, or Terraform destroy fails, stop and resolve the failure before considering the exercise complete.
