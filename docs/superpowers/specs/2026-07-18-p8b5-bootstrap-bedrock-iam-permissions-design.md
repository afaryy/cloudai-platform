# P8b.5 Bootstrap Bedrock IAM Permissions Design

## Purpose

Allow the existing GitHub Actions OIDC Terraform execution role to apply the P8b Bedrock IAM boundary after a reviewed plan. The change addresses the observed `iam:CreatePolicy` denial without granting Bedrock runtime access or broad IAM administration.

## Existing Boundary

`providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` is the CloudFormation bootstrap template for the Terraform state backend and the `GitHubActionsTerraformRole`. The role is exported as `AWS_ROLE_TO_ASSUME` and is shared by the EKS and Bedrock sandbox Terraform workflows.

The P8b Terraform module creates only a Bedrock sandbox IAM role, a customer-managed IAM policy, and their attachment. It cannot manage the permissions of its own GitHub execution role.

## Selected Design

Add one `BedrockSandboxIamApply` statement to the existing inline policy on `GitHubActionsTerraformRole`.

The statement will grant only the P8b IAM role and customer-managed-policy lifecycle actions. Where supported, resources are restricted to:

- `arn:${AWS::Partition}:iam::${AWS::AccountId}:role/cloudai-platform-bedrock-sandbox-*`
- `arn:${AWS::Partition}:iam::${AWS::AccountId}:policy/cloudai-platform-bedrock-sandbox-*`

Read/list actions that cannot be restricted to the P8b resource boundary will remain outside this new statement only if CloudFormation/IAM action semantics require it; the implementation must document any such exception in the template.

## Explicit Exclusions

The bootstrap role will not receive:

- `bedrock:InvokeModel` or any other Bedrock runtime or administration action;
- `iam:PassRole` for the P8b path;
- permissions for resources outside the Bedrock sandbox naming boundary;
- workflow, GitHub environment, Terraform module, state, or model-access changes.

## Documentation and Verification

Update the bootstrap README so operators know to update the CloudFormation stack when a bounded Bedrock IAM lifecycle permission is missing.

Verification will check that the template parses as YAML, the new statement contains the exact P8b IAM lifecycle actions, its resource patterns are bounded, and excluded permissions are absent.
