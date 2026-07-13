# AWS Bootstrap For Terraform And GitHub OIDC

This folder contains portfolio-ready bootstrap examples for a future personal AWS EKS sandbox.

The bootstrap layer exists because Terraform needs a backend before it can safely manage the EKS sandbox. A small CloudFormation stack can create the shared prerequisites:

- S3 bucket for Terraform state.
- DynamoDB table for Terraform state locking.
- IAM role for GitHub Actions.
- IAM policy scoped to the sandbox bootstrap and Terraform plan/apply needs.
- Trust policy that uses an existing account-level GitHub Actions OIDC provider.

## Boundary

This repository does not include real account IDs, role ARNs, bucket names, state files, tfvars, plan files, kubeconfig, credentials, or live endpoint details.

The template expects an existing provider ARN such as:

```text
arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com
```

Replace `<ACCOUNT_ID>` only in your private local command or AWS console. Do not commit the resolved value.

## Recommended Sandbox Flow

1. Create or confirm the account-level GitHub OIDC provider outside this repository.
2. Deploy the bootstrap CloudFormation stack with private parameter values.
3. Store the resulting role ARN as a GitHub environment variable or secret named `AWS_ROLE_TO_ASSUME`.
4. Use the `aws-sandbox` GitHub environment for manual approval.
5. Run Terraform validate/plan first.
6. Run future apply, deploy, GitOps update, and teardown through GitHub Actions rather than laptop-local commands.
7. Add apply only after budget alarm, teardown, and synthetic workload boundaries are reviewed.

## Updating The Bootstrap Stack

If a Terraform apply fails with `AccessDenied` for sandbox resources such as `iam:CreateRole`, `ec2:CreateVpc`, `eks:CreateCluster`, or `eks:CreateNodegroup`, update the existing CloudFormation bootstrap stack with the latest template in this folder.

The bootstrap role needs both backend access and bounded sandbox apply/destroy permissions. The policy intentionally grants the EKS sandbox role enough access to create and delete the small VPC, EKS cluster, managed node group, and associated sandbox IAM roles. It should not be reused for production, shared enterprise, or non-synthetic workloads.

## Safety Notes

- Prefer `ap-southeast-2` for Australia-first examples unless there is a reason to choose another region.
- Keep EKS clusters short-lived.
- Avoid NAT Gateway by default in the first POC because it can create avoidable cost.
- Use synthetic workloads only.
- Delete the sandbox when the evidence has been captured.
