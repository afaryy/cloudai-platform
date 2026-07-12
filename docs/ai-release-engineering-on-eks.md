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
| P4e/P5 later | Bedrock Guardrails or AgentCore-aligned extension | Optional after EKS, Terraform, OIDC, FinOps, and cleanup controls are established. |

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

## ECS And EKS Boundary

ECS can be a useful simpler runtime pattern for API services, but P4 focuses on EKS because the portfolio goal is Kubernetes release engineering: Helm, Argo CD, rollout, rollback, probes, policy gates, and cluster-operational thinking. The first real sandbox should not deploy ECS and EKS at the same time.

## Current State

The P4a chart exists under `helm/ai-api-service/`. The P4c Argo CD application example exists under `argocd/applications/`. The EKS Terraform skeleton exists under `providers/aws/infra/terraform/`, and the manual workflow can run validation plus a backend-backed Terraform plan through the `aws-sandbox` GitHub environment. Real apply and destroy remain deferred until budget, approval, and teardown controls are confirmed.

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
- Argo CD README guidance for local validation and future GitOps sandbox use.

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
