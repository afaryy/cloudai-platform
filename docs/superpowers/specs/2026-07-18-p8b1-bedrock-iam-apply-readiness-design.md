# P8b.1 Bedrock IAM Apply Readiness Design

## Goal

Define the reviewable prerequisites for a future, manually approved Terraform apply of the P8b Bedrock IAM boundary. The slice makes the required GitHub environment configuration, Terraform-backend access, IAM apply permissions, evidence expectations, and stop conditions explicit before any cloud mutation is enabled.

## Context

P8a established the general Bedrock access-readiness boundary. P8b added a plan-only Terraform stack that defines a GitHub Actions OIDC role and a narrow Bedrock invoke policy, but its workflow intentionally supports only `validate` and `plan`.

The next safe decision is not to invoke Bedrock. It is to decide whether the existing bootstrap identity can create only the P8b IAM resources, through the protected `aws-sandbox` environment, with a reviewed plan and an accountable teardown path.

The repository currently has an older sequence in `docs/p8a-bedrock-access-readiness.md` that calls Terraform apply “P8c” and a smoke test “P8d”, while the P8 design calls the smoke test “P8c”. P8b.1 resolves that terminology: it is the pre-apply gate; P8c remains reserved for the later synthetic smoke test.

## Scope

Create one public-safe operator runbook and make targeted documentation updates that define:

- the exact protected `aws-sandbox` variables and secret classifications required by the current P8b plan workflow and any later apply workflow;
- which values are derived rather than separately configured;
- the minimum permission families needed by the existing Terraform backend and by the specific IAM role, customer-managed policy, and policy attachment created by P8b;
- explicit exclusions, including Bedrock runtime permissions, `iam:PassRole`, long-lived credentials, and broad IAM administration for the Terraform execution identity;
- required plan review, GitHub environment approval, accountable operator, evidence capture, and rollback/teardown checks;
- fail-closed stop conditions and the handoff criteria for a separately reviewed apply implementation.

## Non-Goals

- No Terraform apply, destroy, import, state migration, or live AWS inspection.
- No new or changed GitHub Actions workflow, workflow input, apply confirmation, or secret.
- No Bedrock invocation, SDK code, prompt, response handling, provider adapter, agent, Guardrails, or AgentCore work.
- No account IDs, role ARNs, backend resource names, model-entitlement evidence, credentials, Terraform state, plan files, or private screenshots.
- No assertion that the currently deployed bootstrap policy is sufficient; the runbook describes what must be verified before enabling apply.

## Architecture

```text
protected aws-sandbox environment
  -> GitHub Actions OIDC token
  -> existing Terraform execution role
  -> scoped state backend and P8b IAM apply permissions
  -> reviewed Terraform plan
  -> future separately approved apply workflow
  -> created Bedrock smoke-test role and invoke policy
  -> later P8c synthetic Bedrock smoke test
```

The Terraform execution role and the future Bedrock smoke-test role are separate identities. The execution role needs narrowly scoped state-backend and IAM-management permissions to create the boundary. The future smoke-test role receives only the resulting Bedrock runtime policy after the boundary has been applied. An IAM-only apply does not require `bedrock:InvokeModel` for the execution role.

## Environment Contract

The runbook will use this contract for the protected `aws-sandbox` GitHub environment:

| Name | Classification | Required for | Rule |
| --- | --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | Secret or protected variable | OIDC assumption by plan and future apply workflows | Never commit the role ARN. |
| `AWS_REGION` | Protected variable | Terraform backend and AWS credential configuration | Use the approved sandbox region only. |
| `TF_BACKEND_BUCKET` | Protected variable | Remote Terraform state | Never commit the real bucket name. |
| `TF_BACKEND_LOCK_TABLE` | Protected variable | Terraform state locking | Never commit the real table name. |
| `TF_STATE_KEY_PREFIX` | Protected variable | Derived P8b state key | Use a generic stack prefix. |
| `AWS_OIDC_PROVIDER_ARN` | Protected variable | Existing AWS IAM OIDC provider ARN, mapped by the workflow to Terraform's `TF_VAR_github_oidc_provider_arn` | Never commit the provider ARN. |
| `BEDROCK_ALLOWED_MODEL_ARNS` | Secret or protected variable | P8b invoke-policy resource boundary | Store a JSON list containing only approved model resources. |

`TF_STATE_KEY` is derived by the workflow as `${TF_STATE_KEY_PREFIX}/bedrock-sandbox/terraform.tfstate`; it is not a separately maintained environment value. `BEDROCK_MODEL_ID` is not required for the P8b IAM apply gate and remains a later P8c smoke-test input.

## AWS Permission Checklist

The operator must compare the actual Terraform execution-role policy with the required intent before any apply workflow is introduced.

### Terraform Backend

Scope state access to the dedicated state bucket and P8b key prefix, and lock access to the dedicated lock table:

- S3: `GetObject`, `PutObject`, `DeleteObject`, and `ListBucket`.
- DynamoDB: `GetItem`, `PutItem`, `DeleteItem`, and `DescribeTable`.

### P8b IAM Resources

Scope IAM management to the exact P8b role and customer-managed policy naming boundary. The current module creates one role, one customer-managed policy, and one role-policy attachment. The execution role therefore needs only the action families Terraform requires to read, create, update, tag, attach, detach, and delete those resources, including:

- role lifecycle and trust-policy management: `CreateRole`, `GetRole`, `UpdateAssumeRolePolicy`, `DeleteRole`, `TagRole`, and `UntagRole`;
- customer-managed policy lifecycle and version inspection: `CreatePolicy`, `GetPolicy`, `GetPolicyVersion`, `CreatePolicyVersion`, `SetDefaultPolicyVersion`, `DeletePolicyVersion`, and `DeletePolicy`;
- attachment reconciliation: `AttachRolePolicy`, `DetachRolePolicy`, and `ListAttachedRolePolicies`.

The exact resource ARNs and any unavoidable read/list exceptions must be reviewed against the final Terraform provider behaviour before implementation. The runbook must reject `Resource: "*"` for mutating P8b IAM actions unless AWS makes resource scoping impossible and the exception is documented and approved.

### Explicitly Not Required For IAM Apply

- `bedrock:InvokeModel` or `bedrock:InvokeModelWithResponseStream` on the Terraform execution role;
- Bedrock administration, model-access management, Guardrails, AgentCore, SageMaker, EKS, network, KMS, or unrelated service permissions;
- `iam:PassRole`, because the P8b IAM-only stack does not pass a role to an AWS service;
- static AWS access keys or a local administrator credential.

## Apply Gate

Before a future apply implementation can be proposed, all of these must be true:

1. P8a remains complete and its synthetic-data, cost, and evidence rules still apply.
2. The `aws-sandbox` environment enforces human approval and has the environment contract above.
3. The GitHub OIDC subject used by Terraform is reviewed against the repository and environment boundary.
4. A fresh backend-backed P8b plan succeeds and is reviewed for exactly one scoped role, one scoped policy, and one attachment; no unexpected resource is accepted.
5. The Terraform execution role satisfies the backend and IAM permission checklist without broadening into Bedrock runtime or general account administration.
6. A named operator owns the apply and a named person owns teardown after evidence capture.
7. The evidence template is ready, and reviewers agree that only sanitized metadata will be retained.
8. A future workflow design includes an explicit confirmation phrase, concurrency protection, `id-token: write`, least-privilege GitHub permissions, and no saved Terraform plan artifact.

## Stop Conditions

Do not design or run apply when any of the following occurs:

- an environment value is missing, unprotected, or would expose account-specific information in the repository;
- the OIDC subject, provider input, or execution-role owner cannot be verified;
- the plan contains resources beyond the P8b role, policy, and attachment;
- the bootstrap policy needs broad IAM mutation, `iam:PassRole`, or Bedrock runtime access to make Terraform work;
- model-resource scoping is unknown or an unreviewed wildcard is proposed;
- a budget, evidence owner, or teardown owner is missing;
- any proposed evidence includes prompts, responses, account identifiers, role ARNs, backend identifiers, or private screenshots.

The correct result is a sanitized failed-readiness record and a focused permission or configuration correction. Do not solve an access failure by granting broad permissions.

## Documentation Updates

- Add `docs/p8b1-bedrock-iam-apply-readiness.md` as the operator-facing gate and checklist.
- Update `docs/p8a-bedrock-access-readiness.md`, `docs/p8-real-bedrock-sandbox-design.md`, and `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md` to use the sequence P8a → P8b → P8b.1 → separately reviewed apply → P8c smoke test.
- Link P8b.1 from the plan-only workflow explanation without adding an apply mode.
- Update the smoke-test evidence template only to clarify that apply evidence and smoke-test evidence are separate records.

## Testing

This documentation-only slice will verify:

- all referenced variable names exactly match the current P8b workflow;
- the permission checklist matches the current P8b Terraform resources;
- documentation consistently reserves P8c for the synthetic smoke test;
- changed public files contain no account IDs, role ARNs, backend identifiers, credentials, raw prompts, or raw responses;
- existing Terraform validate/test and API test workflows remain unchanged.

## Success Criteria

- A reviewer can determine whether the P8b IAM boundary is ready for a separately reviewed apply workflow without needing private values in git.
- The required execution-role permissions are distinguishable from the later Bedrock smoke-test permissions.
- The project fails closed when its environment, identity, plan scope, evidence, cost, or teardown conditions are incomplete.
- P8c has one unambiguous meaning: the later, single synthetic Bedrock smoke test.
