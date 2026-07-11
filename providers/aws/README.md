# AWS Provider

AWS is the first implementation provider for `cloudai-platform`.

## Intended Mapping

- Amazon Bedrock for model access.
- API Gateway and Lambda for a lightweight gateway pattern.
- IAM, KMS, and Secrets Manager for security foundations.
- DynamoDB and S3 for metadata and synthetic examples.
- CloudWatch for logs and metrics.
- EKS for future release engineering.
- CloudFormation bootstrap for future Terraform backend and GitHub Actions OIDC role setup.

## Current State

This folder contains synthetic-only examples. No Terraform apply, credentials, kubeconfig, state files, tfvars, plan files, or live deployment outputs are committed.

## P4 EKS Sandbox Readiness

The optional personal EKS sandbox path is intentionally split:

- `infra/bootstrap/` documents a CloudFormation bootstrap pattern for S3 state, DynamoDB locking, and GitHub Actions role assumption.
- `infra/terraform/envs/eks-sandbox/` documents the future Terraform environment boundary.
- Real AWS deployment remains opt-in and requires private account values, budget controls, manual approval, synthetic workloads, and teardown guidance.
