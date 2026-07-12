# P4b Real EKS Sandbox Design

This design defines the first real AWS sandbox step for CloudAI Platform.

The goal is to prove practical Cloud & AI Platform Engineering skills in a personal AWS account while keeping the repository safe to publish. The first real deployment should focus on EKS only. Bedrock and Bedrock AgentCore remain later slices after the Terraform backend, GitHub Actions identity, budget, release, observability, and teardown controls are proven.

## Recommended Sequence

```text
P4b real EKS sandbox
  -> P4e deploy mock CloudAI API with Helm
  -> P4f optional Argo CD sync and rollback evidence
  -> P2/P6 Bedrock sandbox for governed model access
  -> P6/P7 Bedrock AgentCore exploration
```

Do not deploy EKS, Bedrock, and AgentCore in the same first real-cloud slice. EKS alone is enough to prove the core platform path and carries enough cost, IAM, networking, and teardown risk to deserve a bounded rollout.

## Scope

The first real sandbox slice should include:

- Terraform-managed AWS infrastructure.
- Remote Terraform state in S3.
- DynamoDB state locking.
- GitHub Actions OIDC role assumption.
- Manual `validate`, `plan`, `apply`, and `destroy` workflow modes.
- Required GitHub environment approval through `aws-sandbox`.
- Minimal EKS cluster and managed node group.
- Synthetic workload only.
- Budget and teardown gates before apply.
- Public-safe evidence capture after deploy and destroy.

The first real sandbox slice should not include:

- Bedrock model invocation.
- Bedrock AgentCore.
- Real customer, internal, production, or personal data.
- Long-lived cluster operations.
- NAT-heavy defaults.
- Committed account IDs, role ARNs, backend names, tfvars, state, plans, kubeconfig, endpoints, or credentials.

## Target Architecture

```text
GitHub Actions workflow_dispatch
  -> aws-sandbox environment approval
  -> GitHub OIDC token
  -> AWS IAM role assumption
  -> Terraform remote backend in S3
  -> DynamoDB state lock
  -> VPC and EKS sandbox resources
  -> Helm deployment of mock CloudAI API
  -> rollout, logs, and service evidence
  -> manual destroy
  -> teardown evidence
```

The public repository defines the structure and commands. Private values stay in GitHub environments, GitHub secrets, AWS console configuration, or local ignored files.

## GitHub Environment Contract

Create or use a GitHub environment named `aws-sandbox`.

Required environment protections:

- Manual reviewer approval before `apply`.
- Manual reviewer approval before `destroy`.
- No automatic scheduled apply.
- No branch wildcard that allows unreviewed sandbox mutation.

Required private values:

| Value | Storage | Public repo rule |
|---|---|---|
| AWS role to assume | GitHub environment secret or variable | Do not commit ARN. |
| AWS region | GitHub environment variable | Region label can be documented. |
| Terraform backend bucket | Private backend file or environment value | Do not commit real bucket name. |
| Terraform lock table | Private backend file or environment value | Do not commit real table name. |
| Terraform state key prefix | GitHub environment variable | Use a generic project prefix such as `cloudai-platform`. |
| Budget owner or alarm recipient | AWS Budget or private note | Do not commit billing details. |

## Terraform Shape

The first Terraform implementation should be intentionally small:

```text
providers/aws/infra/terraform/envs/eks-sandbox/
  versions.tf
  backend.s3.tf
  backend.tf.example
  main.tf
  variables.tf
  outputs.tf

providers/aws/infra/terraform/modules/
  network/
  eks/
```

The Terraform skeleton now exists in those paths. It defines the intended VPC, public subnet, EKS cluster, and managed node group shape. The workflow can run backend-backed `plan`, confirmation-gated `apply`, and confirmation-gated `destroy` through the `aws-sandbox` GitHub environment.

The workflow uses a fixed GitHub Actions concurrency group for the EKS sandbox stack. This queues overlapping manual runs instead of allowing them to compete for the same state key, while Terraform's DynamoDB backend lock remains the authoritative state lock.

Real `apply` requires the exact `confirm_apply` input value `I_UNDERSTAND_COST_AND_TEARDOWN`. Real `destroy` requires the exact `confirm_destroy` input value `I_UNDERSTAND_DESTROY`. These confirmation strings are not secrets; they are deliberate friction so sandbox mutation only happens after budget, teardown, and evidence boundaries are reviewed.

State key pattern:

```text
cloudai-platform/<stack-name>/terraform.tfstate
```

Initial stack:

```text
cloudai-platform/eks-sandbox/terraform.tfstate
```

Future Bedrock, AgentCore, GenAI gateway, and platform foundation stacks should use separate keys under the same prefix. This keeps state isolated by stack while reusing the same backend bucket and lock table.

This sandbox pattern is intentionally small-scale. It is suitable for a personal account, a portfolio POC, or a small number of platform stacks. It should not be presented as the operating model for hundreds or thousands of landing zones. At enterprise scale, use a landing-zone factory model with account inventory, blueprint catalogs, account vending, baseline rollout, policy-as-code, CI/CD orchestration, drift detection, and generated state keys. See `docs/aws-reference-architecture.md` for the scale boundary.

Recommended defaults:

- Region: `ap-southeast-2` unless explicitly changed.
- One sandbox VPC.
- Public subnets only for the first low-cost version if private NAT is not required.
- No NAT Gateway by default.
- EKS public API endpoint restricted as tightly as practical for the sandbox.
- One small managed node group.
- Clear tags for project, environment, owner, cost, and teardown deadline.

## Cost Controls

Before `apply`, confirm:

1. AWS Budget exists for the personal sandbox.
2. Alarm recipient is configured.
3. Maximum cluster lifetime is recorded.
4. No NAT Gateway is required for the first POC.
5. Workload is synthetic-only.
6. `destroy` path is reviewed before `apply`.

Recommended first-run lifetime: same day teardown after evidence capture.

## Deployment Evidence

Capture only sanitized evidence in public docs or examples:

- Workflow run mode.
- Terraform plan summary without account IDs or ARNs.
- Cluster name pattern, not live endpoint.
- Namespace name.
- Helm release name.
- Pod readiness summary.
- Service type and port summary.
- Rollout status.
- Rollback decision if exercised.
- Destroy completion checklist.

Do not commit raw Terraform plans, kubeconfig, live endpoints, AWS console screenshots with account data, or full command output containing ARNs.

## Teardown Evidence

Teardown is complete only after checking:

- EKS cluster deleted.
- Managed node groups deleted.
- Load balancers and target groups deleted.
- EBS volumes and snapshots reviewed.
- Elastic IPs and NAT Gateways absent or deleted.
- CloudWatch log groups reviewed for cost.
- Terraform state remains only if needed for future sandbox work.

## Bedrock And AgentCore Boundary

Bedrock should come after the EKS sandbox path is stable. The first Bedrock slice should be a small governed model-access sandbox with IAM boundaries, budget awareness, and either no model call or one controlled smoke test.

Bedrock AgentCore should come later still. Treat it as an AgentOps / runtime-governance exploration after the project has a clear Bedrock access boundary and EKS release-engineering evidence.

## Interview Story

Use this summary:

> I moved the portfolio from mock Kubernetes release engineering toward a bounded personal AWS EKS sandbox by defining Terraform remote state, GitHub Actions OIDC, manual environment approval, budget gates, synthetic workload deployment, rollout evidence, and teardown controls before adding any live Bedrock or agent runtime resources.
