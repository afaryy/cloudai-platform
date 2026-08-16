# AWS Bootstrap For Terraform And GitHub OIDC

This folder contains portfolio-ready bootstrap examples for the personal AWS
sandboxes used by this project, including EKS, Bedrock, and the governed
AgentCore RAG POC.

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
2. Create or confirm a separate GitHub OIDC **bootstrap role** that can update
   the existing CloudFormation stack. This is the trust root for updating the
   narrower Terraform execution role; it must not be the same role as
   `AWS_ROLE_TO_ASSUME`.
3. Use the protected `update-aws-bootstrap` GitHub Actions workflow to create
   a CloudFormation change set, review it, then explicitly apply it.
4. Store the resulting Terraform role ARN as a GitHub environment variable or secret named `AWS_ROLE_TO_ASSUME`.
5. Use the `aws-sandbox` GitHub environment for manual approval.
6. Run Terraform validate/plan first.
7. Run future apply, deploy, GitOps update, and teardown through GitHub Actions rather than laptop-local commands.
8. Add apply only after budget alarm, teardown, and synthetic workload boundaries are reviewed.

## Updating The Bootstrap Stack

If a Terraform apply fails with `AccessDenied` for sandbox resources such as
`iam:CreateRole`, `iam:CreateServiceLinkedRole`, `ec2:CreateVpc`,
`eks:CreateCluster`, `eks:CreateNodegroup`, `ecr:CreateRepository`, or
`bedrock-agentcore:CreateAgentRuntime`, update the existing CloudFormation
bootstrap stack through `update-aws-bootstrap`. Do not attach an inline policy
to the Terraform role in the AWS Console.

The bootstrap role needs both backend access and bounded sandbox apply/destroy permissions. The policy intentionally grants the EKS sandbox role enough access to create and delete the small VPC, EKS cluster, managed node group, the EKS and EKS node group service-linked roles, sandbox access entries, and associated sandbox IAM roles. It should not be reused for production, shared enterprise, or non-synthetic workloads.

For the P8b Bedrock IAM boundary, an `iam:CreatePolicy` or similar IAM lifecycle denial is remediated by updating this same bootstrap CloudFormation stack before rerunning the Bedrock workflow. The Bedrock statement is limited to roles and customer-managed policies named `cloudai-platform-bedrock-sandbox-*`; it does not grant Bedrock model invocation or `iam:PassRole`.

The AgentCore statements are limited to the
`cloudai-platform-agentcore-rag-sandbox` ECR repository, IAM roles named
`cloudaiplatformagentcoreragsandbox-*`, and AgentCore resources tagged with
`Project=cloudai-platform` and `Environment=agentcore-rag-sandbox`. The
CloudFormation template is the only supported place to evolve these Terraform
execution permissions. It does not grant general IAM administration, model
invocation, Knowledge Base reads, browser access, or autonomous write actions.

## CI/CD-Only Bootstrap Updates

Use `.github/workflows/update-aws-bootstrap.yml` for every update to the
existing bootstrap CloudFormation stack. It is intentionally separate from the
normal Terraform workflow, because a Terraform execution role must not be able
to grant itself additional permissions.

Configure these values in the protected `aws-sandbox` GitHub Environment:

| Setting | Purpose |
| --- | --- |
| `AWS_BOOTSTRAP_ROLE_TO_ASSUME` | Separate GitHub OIDC trust-root role that may update the existing bootstrap stack. |
| `AWS_BOOTSTRAP_STACK_NAME` | Existing CloudFormation stack name; this workflow updates, never creates, the stack. |
| `AWS_OIDC_PROVIDER_ARN` | Existing account-level GitHub Actions OIDC provider ARN. |
| `TF_BACKEND_BUCKET` | Existing Terraform state bucket name, passed back to the bootstrap stack as a private parameter. |
| `TF_BACKEND_LOCK_TABLE` | Existing Terraform lock-table name, passed back to the bootstrap stack as a private parameter. |

`AWS_ROLE_TO_ASSUME` remains the normal Terraform execution role and must not
equal `AWS_BOOTSTRAP_ROLE_TO_ASSUME`. The bootstrap role is a pre-existing AWS
trust root. If it has not yet been created, no CI/CD system can safely create
or empower itself; establish that one-time role through the account’s approved
platform provisioning process, then manage every later update through this
workflow.

Execution order:

1. Every pull request that changes the bootstrap template or workflow runs
   CloudFormation linting on the GitHub runner. You can also dispatch
   `update-aws-bootstrap` with `mode=validate`; both paths are cloud-free.
2. Run it with `mode=plan`; it creates a CloudFormation change set but does
   not update AWS resources. Record the emitted `cloudai-bootstrap-<run-id>`
   name and inspect every change.
3. Run it with `mode=apply`, supply that exact reviewed change-set name, and
   enter `I_UNDERSTAND_AWS_BOOTSTRAP_APPLY`. GitHub Environment approval still
   applies.
4. Run `terraform-agentcore-rag-sandbox` with `mode=bootstrap-plan`.
5. Review the Terraform plan, then run `bootstrap-apply` with
   `I_UNDERSTAND_AGENTCORE_RAG_BOOTSTRAP_APPLY`.

No AWS Console inline-policy attachment and no laptop-local AWS deployment is
part of this path.

## Safety Notes

- Prefer `ap-southeast-2` for Australia-first examples unless there is a reason to choose another region.
- Keep EKS clusters short-lived.
- Avoid NAT Gateway by default in the first POC because it can create avoidable cost.
- Use synthetic workloads only.
- Delete the sandbox when the evidence has been captured.
