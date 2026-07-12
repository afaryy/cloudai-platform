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

- `backend.tf.example` documents the remote backend shape with placeholders.
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
```

This validation does not use the real remote backend and does not deploy AWS resources.

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

Until then, this environment is validate/plan-readiness only. When apply is introduced, it should run through GitHub Actions with OIDC and environment approval, not as the normal laptop-local path.

## Current Workflow Boundary

The current `.github/workflows/terraform-eks-sandbox.yml` workflow supports:

- `validate`: local Terraform initialization without backend and `terraform validate`;
- `plan`: OIDC credential configuration followed by a readiness placeholder and validation.
- `apply`: visible but intentionally refused until a later enablement PR;
- `destroy`: visible but intentionally refused until a later enablement PR.

It does not run real `terraform apply`, real `terraform destroy`, Helm deploy, Argo CD sync, or kubectl commands. Those operations require a later explicitly approved slice with budget and teardown evidence.
