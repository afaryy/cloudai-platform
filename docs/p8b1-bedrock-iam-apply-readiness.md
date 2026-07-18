# P8b.1 Bedrock IAM Apply Readiness

P8b.1 is the documentation-only gate before a separately reviewed workflow may apply the P8b Bedrock IAM boundary. It does not apply Terraform, invoke Bedrock, create credentials, or enable a new GitHub Actions mode.

```text
P8a access readiness
  -> P8b validate/plan-only IAM boundary
  -> P8b.1 apply-readiness gate
  -> separately reviewed manual IAM apply
  -> P8c one synthetic Bedrock smoke test
```

The Terraform execution role creates the IAM role and policy boundary. The later Bedrock smoke-test role receives the narrow Bedrock invoke policy after that boundary exists. An IAM-only apply does not need Bedrock runtime permissions on the Terraform execution role.

## Scope

This gate defines the protected environment values, permission checklist, reviewed-plan boundary, accountable owners, evidence rules, and stop conditions required before a future apply workflow can be proposed.

It does not create or modify AWS resources, inspect a live account, run `terraform apply` or `destroy`, invoke a model, handle a prompt or response, add a provider adapter, or introduce AgentCore, Guardrails, or agent execution.

## Protected GitHub Environment Contract

Configure these only in the protected `aws-sandbox` GitHub environment:

| Name | Classification | Rule |
| --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | Secret or protected variable | Never commit the role ARN. |
| `AWS_REGION` | Protected variable | Use only the approved sandbox region. |
| `TF_BACKEND_BUCKET` | Protected variable | Never commit the real bucket name. |
| `TF_BACKEND_LOCK_TABLE` | Protected variable | Never commit the real table name. |
| `TF_STATE_KEY_PREFIX` | Protected variable | Keep the stack prefix generic. |
| `AWS_OIDC_PROVIDER_ARN` | Protected variable | Existing AWS IAM OIDC provider ARN. GitHub forbids configuration names beginning with `GITHUB_`; the workflow maps this value to Terraform's `TF_VAR_github_oidc_provider_arn`. Never commit the provider ARN. |
| `BEDROCK_ALLOWED_MODEL_ARNS` | Secret or protected variable | Store a JSON list of approved model resources only. |

`TF_STATE_KEY` is derived by the workflow as `${TF_STATE_KEY_PREFIX}/bedrock-sandbox/terraform.tfstate`; it is not a separately maintained environment value. `BEDROCK_MODEL_ID` is deferred to P8c and is not an input to the P8b IAM apply gate.

Do not use environment values to store account IDs, raw prompts, raw responses, credentials, session tokens, screenshots, or model-entitlement evidence.

## Terraform Execution-Role Permission Checklist

Review the actual Terraform execution-role policy before a future apply workflow is introduced. Scope every permission to the Bedrock sandbox boundary wherever AWS supports it.

### Terraform Backend Access

Scope access to the dedicated Terraform state bucket and P8b state key prefix, plus the dedicated lock table:

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`
- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:DeleteItem`
- `dynamodb:DescribeTable`

### P8b IAM Resource Management

The current P8b module creates one IAM role, one customer-managed policy, and one role-policy attachment. The Terraform execution role needs only the permission families Terraform requires to read, create, update, tag, attach, detach, and delete those P8b resources:

```text
iam:CreateRole
iam:GetRole
iam:UpdateAssumeRolePolicy
iam:DeleteRole
iam:TagRole
iam:UntagRole
iam:CreatePolicy
iam:GetPolicy
iam:GetPolicyVersion
iam:CreatePolicyVersion
iam:SetDefaultPolicyVersion
iam:DeletePolicyVersion
iam:DeletePolicy
iam:AttachRolePolicy
iam:DetachRolePolicy
iam:ListAttachedRolePolicies
```

Scope mutating IAM actions to the P8b naming boundary. Do not accept `Resource: "*"` for P8b IAM mutation by default. If AWS makes a specific resource scope impossible, document the narrow exception, why it is needed, and the reviewer approval before implementation.

### Explicitly Excluded Permissions

The Terraform execution role must not receive:

- `bedrock:InvokeModel` or `bedrock:InvokeModelWithResponseStream`;
- Bedrock administration, model-access management, Guardrails, AgentCore, SageMaker, EKS, network, KMS, or unrelated service permissions;
- `iam:PassRole`, because P8b does not pass a role to an AWS service;
- static AWS access keys or general account-administrator access.

The later smoke-test role is the only identity intended to receive narrow Bedrock runtime actions, and only after a separate review of the P8c smoke-test design.

## Apply-Readiness Gate

Do not propose a future apply workflow until all of these are true:

1. P8a access readiness remains complete, including its synthetic-data, cost, and public-evidence boundaries.
2. `aws-sandbox` requires human approval and contains the protected environment contract above.
3. The GitHub OIDC subject used by Terraform is reviewed against the repository and protected-environment boundary.
4. A fresh backend-backed P8b plan is reviewed and contains exactly one scoped IAM role, one scoped IAM policy, and one role-policy attachment; no unexpected resource is accepted.
5. The Terraform execution role meets the backend and IAM checklist without broad Bedrock runtime or account-administration permissions.
6. A named operator owns the apply, and a named owner is accountable for teardown after evidence capture.
7. A budget or spending boundary exists, and the public-safe evidence template is ready.
8. The future workflow design includes an explicit confirmation input, concurrency protection, `id-token: write`, least-privilege GitHub permissions, and no saved Terraform plan artifact.

## Stop Conditions

Stop and record only a sanitized readiness outcome when any of these is true:

- an environment value is missing, unprotected, or would expose account-specific information in git;
- the OIDC provider, subject, execution-role owner, or repository/environment boundary cannot be verified;
- the reviewed plan includes resources beyond the P8b role, policy, and attachment;
- the bootstrap policy requires broad IAM mutation, `iam:PassRole`, or Bedrock runtime access;
- the approved model-resource scope is unknown or an unreviewed wildcard is proposed;
- a cost boundary, evidence owner, apply owner, or teardown owner is missing;
- the proposed evidence requires prompts, responses, account identifiers, role ARNs, backend identifiers, or private screenshots.

Correct one narrow configuration or permission boundary at a time. Do not solve an access failure by granting broad permissions.

## Evidence And Handoff

Use [the P8 evidence template](templates/p8a-bedrock-smoke-test-evidence.md) for public-safe readiness, apply, and later smoke-test notes. Apply-readiness and IAM apply evidence must remain separate from P8c smoke-test evidence.

P8b.1 is implemented by P8b.2, which extends the existing manual workflow with `mode=apply` and requires `confirm_apply=I_UNDERSTAND_BEDROCK_IAM_APPLY`. It runs a fresh plan before applying the IAM boundary, does not offer destroy, and does not invoke Bedrock. P8c remains the later, one-prompt synthetic Bedrock smoke test.
