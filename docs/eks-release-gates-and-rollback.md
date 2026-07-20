# EKS Release Gates and Rollback Pattern

This document defines a synthetic-only release gates and rollback pattern for the P4 EKS release-engineering track.

The goal is to show how a Cloud & AI platform team would promote an AI platform service through Kubernetes release controls without requiring a live EKS cluster. The pattern connects the existing Helm chart and Argo CD Application examples to release governance, rollout observation, rollback, and audit evidence.

## Boundary

This is a portfolio release-engineering pattern, not a live operating procedure.

Do not commit:

- AWS account IDs, role ARNs, or region-specific account values.
- kubeconfig files, Argo CD tokens, cluster URLs, or generated credentials.
- Terraform state, Terraform plans, `.tfvars`, or backend bucket names tied to a real account.
- Real image registry credentials, production image tags, customer data, prompts, or provider payloads.

The default workload remains the mock AI API service with synthetic data and `providerMode: mock`.

## Release Flow

```text
Pull request
  -> static checks
  -> Helm render and lint
  -> policy and cost gates
  -> merge to main
  -> Argo CD detects desired state
  -> manual sync approval
  -> rollout observation
  -> rollback, pause, or promote
```

For a future personal sandbox, GitHub Actions should remain the controlled delivery plane. Laptop-local commands are useful for learning and inspection, but not the preferred deployment path.

## Pre-Deploy Gates

Before a sandbox sync or deployment, the release should pass these gates.

| Gate | Purpose | Portfolio Evidence |
| --- | --- | --- |
| Scope gate | Confirm the release is synthetic-only and mock-first. | `providerMode: mock`, `mockMode: "true"`, `dataScope: synthetic-only`. |
| Manifest gate | Ensure Kubernetes YAML renders locally. | `helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox`. |
| Chart quality gate | Catch Helm chart/template issues early. | `helm lint helm/ai-api-service`. |
| GitOps gate | Confirm the Argo CD Application points to the approved chart path and release name. | `argocd/applications/cloudai-api-sandbox.yaml`. |
| Secret gate | Confirm the release does not introduce Kubernetes `Secret` resources or provider credentials. | Review rendered YAML and chart templates. |
| Identity gate | Confirm service account token automount is disabled by default. | `automountServiceAccountToken: false`. |
| Policy gate | Confirm labels capture owner, environment, data scope, and cost allocation. | `cloudai-platform.example/*` labels. |
| Resource gate | Confirm requests, limits, probes, and PodDisruptionBudget are defined. | Helm chart templates and rendered YAML. |
| Cost gate | Confirm a later live sandbox has an explicit budget and teardown plan. | P4b sandbox documentation before any apply. |
| Approval gate | Confirm live sync/apply actions are manual. | Argo CD example has no automated sync; GitHub Actions uses manual dispatch/approval. |

## Rollout Observation

In a future sandbox, rollout observation should focus on service health and release safety rather than only whether YAML applied.

Expected checks:

- Argo CD Application health and sync status.
- Deployment rollout status.
- Pod readiness and liveness probe state.
- Recent Kubernetes events for scheduling, image pull, probe, and resource errors.
- Service endpoint availability inside the cluster.
- Logs for mock API startup and `/health` handling.
- Synthetic request checks only, with no real provider calls.

Example future inspection commands:

```bash
argocd app get cloudai-api-sandbox
kubectl -n cloudai-sandbox rollout status deployment/cloudai-api-ai-api-service
kubectl -n cloudai-sandbox get pods
kubectl -n cloudai-sandbox describe deployment cloudai-api-ai-api-service
kubectl -n cloudai-sandbox logs deploy/cloudai-api-ai-api-service
```

These commands require a real cluster and are not part of the default local validation path.

## Rollback Choices

Use the least surprising rollback path for the failure mode.

| Rollback Path | Use When | Notes |
| --- | --- | --- |
| Git revert | The desired state in Git is wrong. | Preferred GitOps rollback because it preserves review and audit history. |
| Argo CD rollback/history | A previously synced application revision is known good. | Useful for sandbox recovery; still follow with a Git correction if Git remains wrong. |
| Helm rollback | A Helm release exists and the cluster state needs immediate rollback. | Useful for direct Helm sandbox experiments; less aligned with GitOps if not reconciled back to Git. |
| Pause sync | The desired state is uncertain and further automation should stop. | Keep automated sync disabled by default; pause manual promotion until diagnosis completes. |
| Teardown | The sandbox is unhealthy, costly, or no longer needed. | Use explicit destroy/cleanup workflow for personal AWS resources. |

## Failure Modes

| Failure Mode | Likely Signal | Response |
| --- | --- | --- |
| Bad image tag | Image pull errors or pods stuck in `ImagePullBackOff`. | Revert image tag in Git or update chart values to known-good synthetic image. |
| Readiness failure | Deployment does not become available; readiness probe fails. | Inspect `/health`, container logs, and ConfigMap values; revert if config is wrong. |
| Resource pressure | Pods pending or evicted. | Lower requests/limits for sandbox or resize nodes only after cost review. |
| Bad config | App starts but mock mode, provider mode, or data scope is incorrect. | Block promotion; fix Helm values and regenerate rendered evidence. |
| Missing namespace | Sync fails because namespace does not exist. | Create namespace through approved sandbox bootstrap, not by enabling uncontrolled namespace creation in the app example. |
| Policy violation | Labels, service account, or secret boundaries are missing. | Stop sync and fix chart/application metadata before deployment. |

## Evidence To Capture

For a future sandbox PR or runbook, capture:

- Commit SHA and PR link.
- Helm chart version and release name.
- Rendered manifest summary.
- Argo CD application revision and sync status.
- Deployment rollout status.
- Rollback or revert commit if used.
- Cost and teardown confirmation.
- Confirmation that all data and payloads were synthetic.

## Local Validation

The default local validation commands remain:

```bash
yq eval '.' argocd/applications/cloudai-api-sandbox.yaml
helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox
helm lint helm/ai-api-service
pnpm --dir providers/aws/app/api test
```

Only the Helm and `yq` commands validate P4 release artifacts. The API tests protect the broader mock platform from regression.
