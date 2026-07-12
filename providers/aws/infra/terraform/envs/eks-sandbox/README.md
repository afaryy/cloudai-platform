# EKS Sandbox Terraform Environment

This folder contains a validate-only Terraform skeleton for a future personal AWS EKS sandbox.

The first implementation should prove release-engineering skills with the smallest useful scope:

- Terraform remote state in S3.
- DynamoDB state locking.
- GitHub Actions OIDC role assumption.
- GitHub Actions as the normal delivery plane for apply, deploy, and teardown.
- Minimal EKS cluster and managed node group skeleton only after explicit approval.
- Synthetic workload only.
- Budget alarm and teardown runbook before apply.
- P4b readiness checklist in `docs/personal-eks-sandbox-readiness.md`.

## Files

- `backend.s3.tf` enables the S3 backend with no committed account-specific values.
- `backend.tf.example` documents the equivalent backend shape with placeholders for local learning only.
- `versions.tf` pins the Terraform and provider requirements for validation.
- `main.tf` wires the `network` and `eks` modules together.
- `variables.tf` defines public-safe defaults for the sandbox shape.
- `outputs.tf` defines sanitized output names. Do not commit live output values.

## Terraform Shape

The current skeleton includes:

- a no-NAT VPC module;
- public subnets for the first low-cost sandbox path;
- an internet gateway and public route table;
- an EKS cluster module;
- a single managed node group with one small instance by default;
- project, environment, data-scope, cost-boundary, and teardown tags.

It does not include Bedrock, Bedrock AgentCore, Argo CD installation, Helm deployment, real model calls, or any production data path.

## Validate Locally

Run from the repository root:

```bash
terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox validate
terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox test
```

This validation and test path does not use the real remote backend and does not deploy AWS resources. The Terraform test file uses the Terraform AWS mock provider for availability-zone data.

Module tests can also be run without AWS credentials:

```bash
terraform -chdir=providers/aws/infra/terraform/modules/network init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/network test
terraform -chdir=providers/aws/infra/terraform/modules/eks init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/eks test
```

## Plan Through GitHub Actions

`plan` mode uses the committed empty S3 backend block in `backend.s3.tf` and injects private backend values from the `aws-sandbox` GitHub environment at runtime.

Required `aws-sandbox` environment values:

- secret or variable: `AWS_ROLE_TO_ASSUME`
- variable: `AWS_REGION`
- variable: `TF_BACKEND_BUCKET`
- variable: `TF_BACKEND_LOCK_TABLE`
- variable: `TF_STATE_KEY_PREFIX`

The EKS sandbox workflow derives the state key as:

```text
${TF_STATE_KEY_PREFIX}/eks-sandbox/terraform.tfstate
```

Use `cloudai-platform` as the prefix so future stacks can use separate state keys under the same backend bucket and lock table:

```text
cloudai-platform/platform-foundation/terraform.tfstate
cloudai-platform/eks-sandbox/terraform.tfstate
cloudai-platform/bedrock-sandbox/terraform.tfstate
cloudai-platform/agentcore-sandbox/terraform.tfstate
cloudai-platform/genai-gateway/terraform.tfstate
```

The workflow does not save a `tfplan` artifact. This avoids persisting account-specific plan output while still proving backend initialization, validation, and plan generation.

The workflow also uses a fixed GitHub Actions concurrency group, `terraform-eks-sandbox`, with `cancel-in-progress: false`. This queues overlapping manual runs instead of allowing two EKS sandbox runs to compete for the same state key and backend lock at the same time.

## Do Not Commit

- `backend.tf` with real bucket names.
- `terraform.tfvars` or `*.tfvars`.
- `.terraform/`.
- `*.tfstate` or `*.tfstate.*`.
- `*.tfplan`.
- kubeconfig.
- real account IDs, role ARNs, endpoints, or generated credentials.

## Future Apply Boundary

Before any real `terraform apply`, define:

1. AWS account and region.
2. Budget limit and alarm.
3. Cluster lifetime.
4. Teardown command and owner.
5. Synthetic workload evidence to capture.
6. GitHub environment approval rule.

Until then, this environment is validate/plan-only. When apply is introduced, it should run through GitHub Actions with OIDC and environment approval, not as the normal laptop-local path.

## Current Workflow Boundary

The current `.github/workflows/terraform-eks-sandbox.yml` workflow supports:

- `validate`: local Terraform initialization without backend and `terraform validate`;
- `plan`: OIDC credential configuration, remote S3 backend initialization from GitHub environment values, validation, and `terraform plan`;
- `apply`: visible but intentionally refused in code until a later enablement PR;
- `destroy`: visible but intentionally refused in code until a later enablement PR.

It does not run real `terraform apply`, real `terraform destroy`, Helm deploy, Argo CD sync, or kubectl commands. Those operations require a later explicitly approved slice with budget evidence, environment approval, teardown evidence, and release evidence.
