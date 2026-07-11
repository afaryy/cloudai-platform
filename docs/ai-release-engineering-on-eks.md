# AI Release Engineering on EKS

This track explores release engineering for AI services on Amazon EKS.

The default path is synthetic-only and mock-first. It shows how an enterprise platform team would package, promote, observe, roll back, and govern AI platform components on Kubernetes without requiring a real cluster. A separate personal AWS sandbox path can be used later to prove practical EKS skills with synthetic workloads, explicit budget controls, and teardown guidance.

## Phase Split

| Phase | Scope | Boundary |
|---|---|---|
| P4a | Public-safe Helm and Kubernetes release examples | No real cluster, no kubeconfig, no live endpoints, no secrets. |
| P4b | Optional personal AWS EKS sandbox POC | Personal account only, manual approval, budget alarm, synthetic workload, teardown required. |
| P4c | Argo CD / GitOps release pattern | Application manifests and promotion notes only until a sandbox is explicitly approved. |
| P4d/P5 later | Bedrock Guardrails or AgentCore-aligned extension | Optional after EKS, Terraform, OIDC, FinOps, and cleanup controls are established. |

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

## ECS And EKS Boundary

ECS can be a useful simpler runtime pattern for API services, but P4 focuses on EKS because the portfolio goal is Kubernetes release engineering: Helm, Argo CD, rollout, rollback, probes, policy gates, and cluster-operational thinking. The first real sandbox should not deploy ECS and EKS at the same time.

## Current State

Placeholder folders exist under `helm/`, `argocd/`, and `providers/aws/infra/terraform/modules/eks/`.

This readiness slice adds portfolio-ready scaffolding for the optional sandbox path:

- CloudFormation bootstrap example for Terraform backend and GitHub Actions role/policy.
- Terraform backend example for `eks-sandbox`.
- Manual GitHub Actions workflow example for future validate/plan flow.
- Helm and Argo CD README guidance.
