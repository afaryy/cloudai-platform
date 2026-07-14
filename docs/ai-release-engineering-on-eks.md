# AI Release Engineering on EKS

This track explores release engineering for AI services on Amazon EKS.

The default path is synthetic-only and mock-first. It shows how an enterprise platform team would package, promote, observe, roll back, and govern AI platform components on Kubernetes without requiring a real cluster. A separate personal AWS sandbox path can be used later to prove practical EKS skills with synthetic workloads, explicit budget controls, and teardown guidance.

## Phase Split

| Phase | Scope | Boundary |
|---|---|---|
| P4a | Synthetic-only Helm and Kubernetes release examples | No real cluster, no kubeconfig, no live endpoints, no secrets. |
| P4b | Optional personal AWS EKS sandbox POC | Personal account only, manual approval, budget alarm, synthetic workload, teardown required. |
| P4c | Argo CD / GitOps release pattern | Synthetic Application manifest and promotion notes only until a sandbox is explicitly approved. |
| P4d | Release gates and rollback pattern | Documentation-only gates, rollout observation, failure modes, and rollback choices. |
| P4e | Helm-on-EKS sandbox validation | Optional after the base EKS sandbox is active; verifies GitHub Actions access, node readiness, Helm lint/render, and namespace dry-run without installing workloads. |
| P4f | Future Helm install and rollback evidence | Optional after P4e; installs the mock API only, observes rollout, captures sanitized health evidence, and supports rollback or uninstall. |
| P4g | Future Argo CD sandbox sync evidence | Optional after the Helm install path is understood; manual sync only and same-day teardown. |
| P7 later | Bedrock Guardrails, AgentCore, or AI Factory extension | Optional after EKS, Terraform, OIDC, FinOps, cleanup, and release controls are established. |

## Candidate Topics

- Helm chart packaging.
- Argo CD application delivery.
- Progressive delivery.
- Runtime observability.
- Policy-aware deployment gates.
- Readiness and liveness probes.
- Resource requests and limits.
- Pod disruption and rollback notes.
- Release audit metadata.
- Synthetic workload labels for cost and governance.

## Personal Sandbox Guardrails

If the optional P4b sandbox is used, the design should include:

- Terraform remote state in S3 and locking in DynamoDB.
- GitHub Actions OIDC role assumption using an existing account-level OIDC provider.
- GitHub Actions as the intended delivery plane for Terraform plan/apply, image build and push, Helm deploy, GitOps update, and teardown.
- Manual `workflow_dispatch` and environment approval for plan, apply, deploy, sync, and destroy actions.
- A small, short-lived EKS cluster in `ap-southeast-2` unless explicitly changed.
- No NAT-heavy design by default because NAT Gateway can create avoidable cost.
- Synthetic workload only, such as the mock API container or a minimal placeholder service.
- Budget alarm and teardown runbook before any apply.
- No committed account IDs, role ARNs, state, tfvars, kubeconfig, plan files, or generated credentials.

Normal sandbox operation should not rely on laptop-local deploy commands. Local commands can be useful for learning and emergency inspection, but the portfolio pattern should show controlled delivery through GitHub Actions with OIDC identity and GitHub environment approval.

See `docs/p4b-eks-sandbox-operator-runbook.md` for the P4b readiness checklist, budget and cleanup rules, GitHub Actions boundary, apply/destroy steps, and evidence gate.

## P4e Helm-On-EKS Validation

P4e proves the smallest useful real Kubernetes access and release-validation path after the base EKS sandbox is active. It should not install workloads yet, and it should not introduce Bedrock, AgentCore, Argo CD, real provider calls, real retrieval, GPU workloads, or production-like data.

Run P4e only when:

- the EKS cluster is `Active`;
- the managed node group is `Active`;
- the budget and same-day destroy plan are still valid;
- kubeconfig or cluster access is temporary and not committed;
- the workflow runs through the `aws-sandbox` GitHub environment;
- the chart remains the mock AI API service with synthetic data only.

Recommended P4e sequence:

```text
confirm EKS and node group are active
  -> assume GitHub Actions OIDC identity
  -> create temporary runner kubeconfig
  -> confirm kubectl can read nodes
  -> lint Helm chart
  -> render Helm chart for the sandbox namespace
  -> dry-run the namespace manifest
  -> capture sanitized evidence
```

Evidence should be summarized, not copied raw:

- workflow run reference or commit SHA;
- chart name and version;
- release name pattern;
- namespace pattern;
- rendered/lint status;
- node readiness summary;
- namespace dry-run status;
- confirmation that no workload was installed.

Do not commit kubeconfig, cluster endpoint, account ID, role ARN, backend values, raw command output, screenshots with private details, or live service endpoints.

## P4f Helm Install And Rollback Readiness

P4f should come after P4e. This is the first optional slice that may install the mock AI API service into the short-lived sandbox.

Recommended P4f boundary:

- install or upgrade only the existing mock API Helm chart;
- keep provider mode as `mock` and data scope as `synthetic`;
- observe Deployment rollout and Kubernetes events;
- run only synthetic health checks;
- capture sanitized rollout evidence;
- test rollback, uninstall, or teardown behavior;
- destroy the sandbox the same day unless there is an explicit learning reason to keep it briefly.

Do not add ingress, public load balancers, real provider credentials, real retrieval, Bedrock, AgentCore, GPU workloads, or long-lived runtime data in the first Helm install slice.

## P4g Argo CD Sandbox Sync Readiness

P4g should come after P4f. The first Argo CD slice should validate GitOps promotion behavior, not broaden the runtime.

Recommended P4g boundary:

- install or connect Argo CD only inside the short-lived sandbox;
- keep sync manual;
- use the existing `argocd/applications/cloudai-api-sandbox.yaml` Application pattern;
- sync the mock API release only;
- capture sanitized sync and health status;
- destroy the sandbox the same day.

Do not enable automated sync, broad cluster administration, real provider credentials, or long-lived Argo CD access in the first sandbox slice.

## ECS And EKS Boundary

ECS can be a useful simpler runtime pattern for API services, but P4 focuses on EKS because the portfolio goal is Kubernetes release engineering: Helm, Argo CD, rollout, rollback, probes, policy gates, and cluster-operational thinking. The first real sandbox should not deploy ECS and EKS at the same time.

## Current State

The P4a chart exists under `helm/ai-api-service/`. The P4c Argo CD application example exists under `argocd/applications/`. The EKS Terraform stack exists under `providers/aws/infra/terraform/`, and the manual workflow can run validation, backend-backed plan, apply, and destroy through the `aws-sandbox` GitHub environment. The optional personal EKS sandbox has been exercised with a managed node group and EKS access entries. P4e now adds a manual Helm-on-EKS validation workflow that proves GitHub Actions can reach the sandbox, check node readiness, lint and render the Helm chart, and dry-run the namespace without installing workloads.

Current P4 evidence includes:

- Synthetic-only Helm chart for the mock AI API service.
- Kubernetes Deployment, Service, ConfigMap, ServiceAccount, and optional PodDisruptionBudget templates.
- Readiness and liveness probes on `/health`.
- Resource requests, limits, and release metadata labels.
- Synthetic-only Argo CD Application manifest for the mock AI API Helm chart.
- Manual sync posture with no automated sync enabled by default.
- Argo CD labels and annotations for owner, environment, data scope, cost allocation, release boundary, and rollback/runbook metadata.
- Release gates and rollback pattern in `docs/eks-release-gates-and-rollback.md`.
- P4b readiness and operator guidance in `docs/p4b-eks-sandbox-operator-runbook.md`.
- CloudFormation bootstrap example for Terraform backend and GitHub Actions role/policy.
- Terraform backend example and empty committed S3 backend block for `eks-sandbox`.
- Manual GitHub Actions workflow for validation and backend-backed plan.
- Manual GitHub Actions workflow for P4e Helm-on-EKS validation without workload install.
- Argo CD README guidance for local validation and future GitOps sandbox use.
- P4f/P4g readiness guidance for future Helm install/rollback and manual Argo CD sandbox evidence.

## P4c Argo CD Boundary

The Argo CD example is a release-engineering contract, not a live deployment. It intentionally uses:

- `destination.server: https://kubernetes.default.svc` as the in-cluster Argo CD destination placeholder.
- `destination.namespace: cloudai-sandbox` as a synthetic namespace.
- `syncPolicy` without automated sync.
- Helm values that keep `mockMode`, `providerMode`, and `dataScope` synthetic.

Do not add a real cluster URL, Argo CD token, kubeconfig, account ID, role ARN, or live namespace to the public manifest.

## P4d Release Gates And Rollback

`docs/eks-release-gates-and-rollback.md` defines the release governance pattern that sits between GitOps intent and a future sandbox deployment. It covers:

- pre-deploy gates for scope, manifest rendering, chart quality, secrets, identity, policy, resources, cost, and approval;
- rollout observation through Argo CD health, Kubernetes Deployment readiness, probes, events, logs, and synthetic health checks;
- rollback choices across Git revert, Argo CD rollback/history, Helm rollback, sync pause, and teardown;
- failure modes such as bad image tags, readiness failures, resource pressure, bad config, missing namespaces, and policy violations.

The document is intentionally not a live operating procedure. It is a public-safe release-engineering pattern for future sandbox work.
