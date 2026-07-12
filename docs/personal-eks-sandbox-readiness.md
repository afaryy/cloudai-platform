# P4b Optional Personal EKS Sandbox Readiness

P4b defines the readiness boundary for a future personal AWS EKS sandbox.

The goal is to prove practical cloud platform engineering skills without turning this repository into a default live deployment. The sandbox is optional, short-lived, manually approved, budgeted, and synthetic-only.

## Boundary

This repository may document the sandbox pattern, but it must not commit account-specific or generated runtime material.

Do not commit:

- AWS account IDs, role ARNs, access keys, session tokens, or endpoint values.
- Terraform state, Terraform plans, `.tfvars`, `.terraform/`, backend files with real bucket names, or generated provider caches.
- kubeconfig files, Argo CD tokens, registry credentials, private backend bucket names, or live cluster URLs.
- Real prompts, customer data, production data, provider payloads, or non-synthetic workload data.

The default branch remains validate/readiness only. Any future apply, deploy, sync, or destroy action must be explicitly approved and protected by GitHub environment approval.

## Readiness Architecture

```text
Personal AWS account
  -> existing GitHub Actions OIDC provider
  -> CloudFormation bootstrap stack
  -> S3 backend bucket + DynamoDB lock table
  -> GitHub environment variable or secret for role assumption
  -> manual GitHub Actions validate/plan workflow
  -> future apply/deploy/destroy only after budget and teardown review
```

The normal delivery plane should be GitHub Actions with OIDC and environment approval. Laptop-local commands are useful for learning and emergency inspection, but they should not become the portfolio's default deployment path.

## Existing Repository Evidence

| Evidence | Path | Purpose |
|---|---|---|
| Bootstrap guide | `providers/aws/infra/bootstrap/README.md` | Explains the S3/DynamoDB backend and GitHub OIDC role boundary. |
| Bootstrap template | `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` | CloudFormation example for backend bucket, lock table, and GitHub Actions role. |
| Empty backend block | `providers/aws/infra/terraform/envs/eks-sandbox/backend.s3.tf` | Enables S3 backend initialization while keeping private backend values in GitHub environment variables. |
| Backend example | `providers/aws/infra/terraform/envs/eks-sandbox/backend.tf.example` | Documents the private Terraform backend shape without real names. |
| Terraform environment | `providers/aws/infra/terraform/envs/eks-sandbox/` | Holds the future sandbox Terraform entry point. |
| Manual workflow | `.github/workflows/terraform-eks-sandbox.yml` | Supports manual validate and backend-backed plan flow. |
| Evidence template | `docs/templates/p4b-eks-sandbox-apply-destroy-evidence.md` | Provides a public-safe checklist for apply and destroy evidence. |
| Release controls | `docs/eks-release-gates-and-rollback.md` | Defines release gates, rollout observation, rollback, and evidence. |
| Helm package | `helm/ai-api-service/` | Synthetic mock API workload package for future deployment evidence. |
| Argo CD pattern | `argocd/applications/cloudai-api-sandbox.yaml` | Manual GitOps promotion pattern for the mock API. |

## Readiness Checklist

Complete these gates before any real sandbox apply.

| Gate | Required outcome | Evidence to keep public-safe |
|---|---|---|
| Account boundary | Use a personal AWS account only. | Statement of account type, no account ID. |
| Region boundary | Use `ap-southeast-2` unless explicitly changed. | Region label only. |
| OIDC boundary | Reuse the existing account-level GitHub Actions OIDC provider. | Provider type and repo/environment condition, no account ARN. |
| Backend boundary | Bootstrap S3 state bucket and DynamoDB lock table with private names. | Template path and sanitized output names. |
| GitHub environment | Use `aws-sandbox` with manual approval. | Environment name and approval requirement. |
| Budget boundary | Create an AWS Budget before apply. | Budget amount category, owner, and alarm channel, no billing details. |
| Cost boundary | Avoid NAT Gateway by default in the first POC. | Architecture note explaining no-NAT default. |
| Workload boundary | Deploy only the mock AI API or a minimal synthetic placeholder. | Helm release name, namespace, synthetic labels. |
| Data boundary | Keep `providerMode: mock` and `dataScope: synthetic-only`. | Rendered values summary, no payloads. |
| Teardown boundary | Define destroy owner, deadline, and verification. | Teardown checklist and completion note. |

## GitHub Actions Flow

The current workflow is intentionally limited:

```text
workflow_dispatch
  -> mode: validate
  -> terraform init -backend=false
  -> terraform validate
```

```text
workflow_dispatch
  -> mode: plan
  -> configure AWS credentials through OIDC
  -> read backend values from aws-sandbox environment
  -> terraform init with S3 backend
  -> terraform validate
  -> terraform plan without saving a tfplan artifact
```

```text
workflow_dispatch
  -> mode: apply
  -> confirm_apply: I_UNDERSTAND_COST_AND_TEARDOWN
  -> aws-sandbox environment approval
  -> configure AWS credentials through OIDC
  -> terraform init with S3 backend
  -> terraform validate
  -> terraform apply -auto-approve
```

```text
workflow_dispatch
  -> mode: destroy
  -> confirm_destroy: I_UNDERSTAND_DESTROY
  -> aws-sandbox environment approval
  -> configure AWS credentials through OIDC
  -> terraform init with S3 backend
  -> terraform validate
  -> terraform destroy -auto-approve
```

Recommended environment variable contract:

| Name | Type | Purpose |
|---|---|---|
| `AWS_ROLE_TO_ASSUME` | Environment secret or variable | GitHub Actions OIDC role assumption. |
| `AWS_REGION` | Environment variable | Sandbox region, initially `ap-southeast-2`. |
| `TF_BACKEND_BUCKET` | Environment variable | S3 bucket for Terraform state. |
| `TF_BACKEND_LOCK_TABLE` | Environment variable | DynamoDB table for Terraform state locking. |
| `TF_STATE_KEY_PREFIX` | Environment variable | Project state prefix, recommended `cloudai-platform`. |

The EKS sandbox state key is derived as:

```text
cloudai-platform/eks-sandbox/terraform.tfstate
```

The workflow can run `terraform apply` and `terraform destroy` only through manual dispatch, exact confirmation phrases, and the `aws-sandbox` environment. It does not run Helm deployment, Argo CD sync, or kubectl commands. Those actions belong in later opt-in slices after the first EKS apply/destroy evidence is captured.

The workflow uses the `terraform-eks-sandbox` concurrency group with `cancel-in-progress: false`. This queues overlapping manual runs instead of allowing two runs to compete for the same EKS sandbox state key. Terraform's DynamoDB backend lock remains the authoritative state lock; GitHub Actions concurrency is an additional delivery-plane guardrail.

Use `docs/templates/p4b-eks-sandbox-apply-destroy-evidence.md` after each real run. Keep the evidence sanitized and do not commit live command output containing account identifiers, ARNs, endpoints, kubeconfig, state, or billing details.

## Budget And Cleanup Rules

Before creating an EKS cluster:

1. Create an AWS Budget for the sandbox.
2. Confirm the alarm recipient.
3. Record the maximum sandbox lifetime.
4. Confirm the teardown owner.
5. Confirm no NAT Gateway is required for the first POC.
6. Confirm the workload is synthetic-only.
7. Confirm the destroy workflow or command path.

Teardown is complete only when:

- EKS cluster and node groups are deleted.
- Load balancers and target groups are gone.
- EBS volumes and snapshots created by the sandbox are reviewed.
- NAT gateways, elastic IPs, and public load balancers are absent or deleted.
- CloudWatch log groups created by the sandbox are either deleted or intentionally retained with cost awareness.
- Terraform state backend remains only if it is shared for future sandbox work.

## Future Apply Decision

The workflow now contains an opt-in apply/destroy path for the Terraform EKS sandbox. The design boundary for this real-cloud step is documented in `docs/p4b-real-eks-sandbox-design.md`. The first real slice should focus on EKS, Terraform, GitHub Actions OIDC, apply evidence, and teardown before adding Helm deployment, Bedrock, or Bedrock AgentCore.

Before using `apply`, confirm:

- keep `workflow_dispatch`;
- use the `aws-sandbox` environment;
- require manual approval;
- document the budget and teardown gates;
- keep workload values synthetic;
- avoid committing account-specific values;
- include a destroy path.

## Portfolio Explanation

Use this short explanation:

> P4b shows how I would move from mock Kubernetes release engineering into a bounded personal AWS EKS sandbox: Terraform backend first, GitHub OIDC identity, manual environment approval, budget and teardown controls, synthetic workload only, and no account-specific values committed to git.
