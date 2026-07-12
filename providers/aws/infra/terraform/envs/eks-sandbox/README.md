# EKS Sandbox Terraform Environment

This folder is a synthetic-only placeholder for a future personal AWS EKS sandbox.

The first implementation should prove release-engineering skills with the smallest useful scope:

- Terraform remote state in S3.
- DynamoDB state locking.
- GitHub Actions OIDC role assumption.
- GitHub Actions as the normal delivery plane for apply, deploy, and teardown.
- Minimal EKS cluster only after explicit approval.
- Synthetic workload only.
- Budget alarm and teardown runbook before apply.
- P4b readiness checklist in `docs/personal-eks-sandbox-readiness.md`.

## Files

- `backend.tf.example` documents the remote backend shape with placeholders.
- `versions.tf` pins the Terraform and provider requirements for future validation.

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

It does not run `terraform apply`, `terraform destroy`, Helm deploy, Argo CD sync, or kubectl commands. Those operations require a later explicitly approved slice with budget and teardown evidence.
