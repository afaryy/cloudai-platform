# AWS Provider

AWS is the first provider with bounded implementation and validation evidence
for `cloudai-platform`; it is not a persistent provider-backed platform.

## Intended Mapping

- Amazon Bedrock for model access.
- API Gateway and Lambda for a lightweight gateway pattern.
- IAM, KMS, and Secrets Manager for security foundations.
- DynamoDB and S3 for metadata and synthetic examples.
- CloudWatch for logs and metrics.
- EKS for bounded release-engineering sandbox validation.
- CloudFormation bootstrap for Terraform backend and GitHub Actions OIDC role setup.

## Current State

Committed artifacts are public-safe and synthetic-only. Optional personal EKS
and Bedrock validations have been performed and destroyed; no credentials,
kubeconfig, state files, tfvars, plan files, account values, or live deployment
outputs are committed.

## P4 EKS Sandbox Readiness

The optional personal EKS sandbox path is intentionally split:

- `infra/bootstrap/` documents a CloudFormation bootstrap pattern for S3 state, DynamoDB locking, and GitHub Actions role assumption.
- `infra/terraform/envs/eks-sandbox/` contains the optional Terraform sandbox
  environment boundary.
- Repeat AWS deployment remains opt-in and requires private account values,
  budget controls, manual approval, synthetic workloads, and teardown guidance.
