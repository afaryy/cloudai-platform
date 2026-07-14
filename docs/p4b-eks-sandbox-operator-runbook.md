# P4b EKS Sandbox Runbook

This is the single public runbook for the optional personal EKS sandbox. It covers readiness, day-of-run steps, safety gates, and evidence boundaries.

Do not use this runbook for production, customer, internal, or shared enterprise environments. The sandbox is for a personal AWS account with synthetic workloads only.

## Scope

The first real apply proves the platform foundation only:

- Terraform remote backend initialization.
- GitHub Actions OIDC role assumption.
- EKS control plane and managed node group creation.
- Small no-NAT sandbox network.
- Same-day destroy and sanitized evidence.

The first apply does not run `kubectl`, Helm deployment, Argo CD sync, Bedrock, Bedrock AgentCore, GPU, or HyperPod resources. Those belong in later opt-in slices after the EKS foundation has been applied, destroyed, and reviewed.

A later sandbox slice may add controlled Helm and Argo CD evidence, but it should keep the same safety model: synthetic workload only, manual approval, public-safe evidence, and same-day teardown. The first post-EKS slice should validate GitHub Actions `kubectl` access and Helm rendering before installing any workload.

## Architecture Boundary

```text
Personal AWS account
  -> existing GitHub Actions OIDC provider
  -> CloudFormation bootstrap stack
  -> S3 backend bucket + DynamoDB lock table
  -> aws-sandbox GitHub environment with manual approval
  -> terraform-eks-sandbox workflow
  -> optional EKS apply/destroy slice
```

The normal delivery plane is GitHub Actions with OIDC and environment approval. Laptop-local commands are for learning or emergency inspection, not the default portfolio path.

## Repository Evidence

| Evidence | Path | Purpose |
|---|---|---|
| Bootstrap guide | `providers/aws/infra/bootstrap/README.md` | Explains the S3/DynamoDB backend and GitHub OIDC role boundary. |
| Bootstrap template | `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` | CloudFormation example for backend bucket, lock table, and GitHub Actions role. |
| Terraform stack | `providers/aws/infra/terraform/envs/eks-sandbox/` | Holds the optional EKS sandbox Terraform entry point. |
| EKS workflow | `.github/workflows/terraform-eks-sandbox.yml` | Supports manual validate, plan, apply, and destroy. |
| Design note | `docs/p4b-real-eks-sandbox-design.md` | Describes the validate-first personal EKS sandbox design. |
| Evidence template | `docs/templates/p4b-eks-sandbox-apply-destroy-evidence.md` | Provides a sanitized apply/destroy evidence format. |

## Readiness Gates

Run `apply` only when every gate is true.

| Gate | Go condition | No-go signal |
|---|---|---|
| Branch state | Workflow changes are merged to `main`. | Running from an unmerged branch or local-only workflow. |
| GitHub environment | `aws-sandbox` exists and requires manual approval. | No environment protection or no human approval. |
| OIDC role | GitHub Actions can assume the sandbox role through OIDC. | Static AWS keys, missing trust policy, or unclear role boundary. |
| Bootstrap policy | The CloudFormation bootstrap stack has been updated with current EKS sandbox apply/destroy permissions, including EKS and EKS node group service-linked role creation. | `AccessDenied` for `iam:CreateRole`, `iam:CreateServiceLinkedRole`, `ec2:CreateVpc`, `eks:CreateCluster`, or `eks:CreateNodegroup`. |
| Backend | S3 backend bucket and DynamoDB lock table are configured as private GitHub environment values. | Backend names committed to git or copied into public notes. |
| State key | State key is derived from project, stack, and environment naming. | Reusing one state key across unrelated stacks. |
| Budget | Sandbox budget and alarm are active before apply. | No alarm recipient, no threshold, or no budget owner. |
| Cost shape | Plan does not introduce NAT Gateway, GPU, HyperPod, Bedrock, AgentCore, or unexpected expensive resources. | Any expensive or unclear resource appears unexpectedly. |
| Network | First sandbox uses a small VPC and subnet shape. | Enterprise-sized address ranges without a reason. |
| EKS endpoint | Private endpoint access is enabled and public endpoint access is restricted to explicit operator `/32` CIDRs. | `0.0.0.0/0`, broad public ranges, documentation placeholders, or unclear API access boundary. |
| Workload | Workload values are synthetic-only. | Real internal, customer, production, or personal sensitive data. |
| Evidence | Evidence template is ready and will be sanitized. | Raw plan/apply output, screenshots, account IDs, ARNs, endpoints, or kubeconfig will be saved. |
| Teardown | Destroy owner and same-day destroy window are confirmed. | No time to destroy after apply. |

If any gate fails, do not apply yet.

## GitHub Environment Contract

Configure these values in the `aws-sandbox` GitHub environment.

| Name | Type | Purpose |
|---|---|---|
| `AWS_ROLE_TO_ASSUME` | Environment secret or variable | GitHub Actions OIDC role assumption. |
| `AWS_REGION` | Environment variable | Sandbox region, initially `ap-southeast-2`. |
| `TF_BACKEND_BUCKET` | Environment variable | S3 bucket for Terraform state. |
| `TF_BACKEND_LOCK_TABLE` | Environment variable | DynamoDB table for Terraform state locking. |
| `TF_STATE_KEY_PREFIX` | Environment variable | Project state prefix, recommended `cloudai-platform`. |
| `TF_VAR_ENDPOINT_PUBLIC_ACCESS_CIDRS` | Environment variable | Private list of operator `/32` CIDRs for the EKS public API endpoint before real apply. |
| `LOCAL_OPERATOR_PRINCIPAL_ARN` | Environment variable | Optional local operator identity for workstation `kubectl` inspection. Keep private and do not commit. |

The workflow derives the EKS sandbox state key as:

```text
cloudai-platform/eks-sandbox/terraform.tfstate
```

Use separate state keys for future stacks under the same backend bucket and lock table:

```text
cloudai-platform/platform-foundation/terraform.tfstate
cloudai-platform/eks-sandbox/terraform.tfstate
cloudai-platform/bedrock-sandbox/terraform.tfstate
cloudai-platform/agentcore-sandbox/terraform.tfstate
cloudai-platform/genai-gateway/terraform.tfstate
```

Before real apply, set `TF_VAR_ENDPOINT_PUBLIC_ACCESS_CIDRS` privately in GitHub to the operator public IP list, for example:

```text
["203.0.113.10/32"]
```

Use a real operator public IP in GitHub settings only. Do not commit it. Do not use `0.0.0.0/0`.

## Kubernetes Access Identities

The sandbox uses EKS access entries rather than manual `aws-auth` edits.

Two identities are supported:

- **GitHub Actions identity:** the OIDC role used by workflows. This is the preferred delivery-plane identity for future `kubectl`, Helm, and Argo CD evidence.
- **Local operator identity:** an optional IAM user or role used from a workstation for learning and inspection.

Both identities use cluster-admin access in this personal sandbox only. This is not a production permission model. Do not commit the local operator ARN, kubeconfig, cluster endpoint, or raw `kubectl` output containing account details.

## Network And Endpoint Defaults

The sandbox defaults are intentionally small:

```text
VPC: 10.42.0.0/24
public subnet A: 10.42.0.0/26
public subnet B: 10.42.0.64/26
```

These defaults are enough for a short-lived one-node sandbox while avoiding an enterprise-sized address range. EKS private endpoint access is enabled by default; public API access must be restricted to explicit operator `/32` CIDRs.

## Workflow Sequence

Run `validate` first:

```text
workflow: terraform-eks-sandbox
mode: validate
```

Then run `plan`:

```text
workflow: terraform-eks-sandbox
mode: plan
```

Review the plan in GitHub Actions. Do not copy raw plan output into git if it contains account identifiers, ARNs, endpoints, backend names, or provider-specific resource IDs.

Run `apply` only through GitHub Actions:

```text
workflow: terraform-eks-sandbox
mode: apply
confirm_apply: I_UNDERSTAND_COST_AND_TEARDOWN
```

Run `destroy` the same day after evidence is captured:

```text
workflow: terraform-eks-sandbox
mode: destroy
confirm_destroy: I_UNDERSTAND_DESTROY
```

The workflow uses the `terraform-eks-sandbox` concurrency group with `cancel-in-progress: false`. This queues overlapping manual runs instead of allowing two runs to compete for the same EKS sandbox state key. Terraform's DynamoDB backend lock remains the authoritative state lock.

## Future Helm And Argo CD Sandbox Slice

Run this slice only after the base EKS apply/destroy path has already succeeded at least once. The goal is to prove Kubernetes release engineering for the mock AI API service, not to add a production runtime.

Recommended sequence:

```text
terraform validate
  -> terraform plan
  -> terraform apply
  -> verify EKS cluster access
  -> render and lint Helm chart without install
  -> dry-run the sandbox namespace
  -> optionally deploy mock API service with Helm in a later run
  -> observe rollout and health if a workload is installed
  -> optionally install or connect Argo CD after the Helm path is understood
  -> manually sync the Argo CD Application only after approval
  -> capture sanitized evidence
  -> terraform destroy the same day
```

Keep the first Helm slice smaller than the first Argo CD slice:

- **P4e Helm validation first:** confirm GitHub Actions can reach EKS, validate node readiness, lint/render the chart, and dry-run the namespace without installing workloads.
- **P4f Helm install second:** install or upgrade the mock AI API service, inspect rollout status, confirm mock-mode health, and test rollback or uninstall.
- **P4g Argo CD third:** install or connect Argo CD only after the Helm release path is understood, then manually sync the existing sandbox Application pattern.

Do not add Bedrock, Bedrock AgentCore, real model calls, real retrieval runtime, live customer data, GPU workloads, or HyperPod resources to this release-engineering slice.

Additional gates before Helm or Argo CD:

| Gate | Go condition | No-go signal |
|---|---|---|
| Cluster access | `kubectl` access is temporary, controlled, and limited to the sandbox. | Kubeconfig is committed, shared, or copied into public evidence. |
| Namespace | The target namespace is sandbox-only and synthetic. | Namespace naming suggests production, shared, internal, or customer use. |
| Helm chart | `helm template` and `helm lint` pass before install or upgrade. | Rendered manifests introduce secrets, real provider settings, or unclear image sources. |
| Workload mode | The mock API runs in mock mode with synthetic labels and no provider credentials. | Bedrock, AgentCore, retrieval, or provider credentials are required. |
| Argo CD posture | Sync is manual and limited to the sandbox Application. | Automated sync, broad cluster access, or unclear rollback ownership. |
| Evidence | Evidence is summarized and sanitized. | Raw kubeconfig, endpoint, account ID, ARN, logs, screenshots, or provider output would be exposed. |
| Teardown | Destroy still happens the same day. | The cluster remains running without an explicit reason and budget owner. |

Example evidence to capture:

- Helm chart version and release name.
- Namespace name pattern.
- Rollout status summarized without raw cluster endpoint details.
- Health check result for mock mode.
- Argo CD Application sync status if Argo CD is included.
- Rollback or Git revert decision if the deployment fails.
- Destroy confirmation after the sandbox run.

## After Destroy

Verify:

- EKS cluster is deleted.
- Managed node group is deleted.
- Load balancers and target groups are gone.
- EBS volumes and snapshots created by the sandbox are reviewed.
- NAT gateways, elastic IPs, and public load balancers are absent or deleted.
- CloudWatch log groups are reviewed.
- Terraform backend is intentionally retained or intentionally cleaned.

## Evidence Boundary

Good evidence:

```text
Terraform apply completed: yes
Terraform destroy completed: yes
Region: ap-southeast-2
Cluster name pattern: cloudai-platform-eks-sandbox
Node group name pattern: cloudai-platform-eks-sandbox-default
Endpoint: not committed
Kubeconfig: not committed
Data scope: synthetic-only
Teardown target: same day
```

Do not commit:

- live EKS API endpoint;
- load balancer DNS name;
- kubeconfig;
- AWS account ID;
- role ARN;
- backend bucket name;
- DynamoDB lock table name;
- Terraform state;
- raw Terraform plan;
- command output containing account identifiers or ARNs;
- screenshots showing account or billing details.

## Stop Conditions

Stop before apply if:

- budget alarm is missing;
- manual environment approval is missing;
- teardown time is not available;
- plan shows unexpected expensive resources;
- NAT Gateway appears unexpectedly;
- non-synthetic workload values are present;
- evidence would require exposing private identifiers;
- you are unsure whether the workload is synthetic-only.

The safest professional answer is sometimes: do not apply yet.

## Portfolio Explanation

Use this short explanation:

> P4b shows how I would move from mock Kubernetes release engineering into a bounded personal AWS EKS sandbox: Terraform backend first, GitHub OIDC identity, manual environment approval, budget and teardown controls, synthetic workload only, and no account-specific values committed to git.
