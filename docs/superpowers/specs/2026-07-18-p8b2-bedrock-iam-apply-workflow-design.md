# P8b.2 Bedrock IAM Apply Workflow Design

## Goal

Extend the existing manual `terraform-bedrock-sandbox` workflow with a confirmation-gated `apply` mode so one protected GitHub Actions workflow records validation, plan, and a future real IAM apply. The workflow applies only the P8b IAM boundary; it does not invoke Bedrock or implement destroy.

## Context

P8a defined broad access readiness. P8b added the Terraform role, policy, and attachment boundary with validate/plan-only workflow support. P8b.1 then defined the protected environment contract, least-privilege execution-role checklist, plan review, ownership, evidence, and stop conditions required before an apply workflow could be introduced.

Keeping `validate`, `plan`, and `apply` as modes of the existing manual workflow gives one auditable GitHub Actions history for the same state key and IAM boundary. The protected `aws-sandbox` environment remains the human approval boundary, while an explicit apply phrase prevents accidental mutation from a routine manual dispatch.

## Scope

- Add `apply` as a `workflow_dispatch` mode in `.github/workflows/terraform-bedrock-sandbox.yml`.
- Add a `confirm_apply` string input that must exactly equal `I_UNDERSTAND_BEDROCK_IAM_APPLY` before any AWS credentials are configured for apply.
- Reuse the existing protected environment values, OIDC role assumption, remote backend initialisation, validation, concurrency group, state key, and Terraform working directory.
- For apply mode, check all current P8b backend and model-boundary variables, configure OIDC credentials, initialise the remote backend, run `terraform validate`, run a fresh unsaved `terraform plan`, and then run `terraform apply -input=false -auto-approve -no-color`.
- Update the P8b.1 operator runbook and evidence template to state how an approved P8b.2 apply is recorded and that the workflow remains the single manual entry point.
- Add static workflow checks that prove apply stays manual, confirmation-gated, environment-approved, and independent from any Bedrock invocation.

## Non-Goals

- No automatic push, pull-request, schedule, reusable-workflow, or external trigger for apply.
- No `destroy` mode in this increment; teardown remains a named owner responsibility and requires a separately reviewed follow-up.
- No Bedrock SDK, CLI, model invocation, prompt, response, adapter, Guardrails, AgentCore, runtime, agent, or application change.
- No change to the Terraform module or the P8b model policy scope.
- No saved Terraform plan artifact, account ID, role ARN, backend identifier, credential, raw plan output, prompt, or response committed to git.

## Workflow Design

```text
workflow_dispatch(mode=apply, confirm_apply=exact phrase)
  -> aws-sandbox human approval
  -> confirmation gate
  -> protected environment-variable check
  -> GitHub OIDC role assumption
  -> remote Terraform backend initialisation
  -> terraform validate
  -> fresh unsaved terraform plan
  -> terraform apply
  -> sanitized apply evidence
  -> later separate P8c smoke-test workflow/design
```

`validate` remains local-backend-free validation. `plan` remains read-only and uses the existing remote backend steps. `apply` uses the same remote-operation steps as `plan`, then adds the confirmation gate, a fresh unsaved plan, and the apply command. The workflow must not invoke AWS Bedrock; Terraform only creates the IAM role, customer-managed policy, and attachment described by P8b.

## Apply Controls

### Dispatch and Approval

- The workflow retains `workflow_dispatch` as its only trigger.
- `mode` allows only `validate`, `plan`, and `apply`.
- `confirm_apply` is optional for other modes and required for `apply` with the exact value `I_UNDERSTAND_BEDROCK_IAM_APPLY`.
- The job continues to declare `environment: aws-sandbox`, so GitHub environment protection reviews occur before the job receives protected values.
- The workflow retains `contents: read` and `id-token: write` only.
- The existing concurrency group remains non-cancelling, preventing a second Bedrock control-plane run from overlapping an apply.

### Environment and Identity

Apply requires every existing plan variable:

```text
AWS_ROLE_TO_ASSUME
AWS_REGION
TF_BACKEND_BUCKET
TF_BACKEND_LOCK_TABLE
TF_STATE_KEY_PREFIX
TF_STATE_KEY
AWS_OIDC_PROVIDER_ARN
TF_VAR_github_oidc_provider_arn
TF_VAR_allowed_model_arns
```

`AWS_OIDC_PROVIDER_ARN` is the protected GitHub Environment variable holding
the existing AWS IAM provider ARN. The workflow maps it to Terraform's runtime
input `TF_VAR_github_oidc_provider_arn`; GitHub does not permit configuration
names beginning with `GITHUB_`.

The workflow obtains temporary credentials only through `aws-actions/configure-aws-credentials@v4` and the protected OIDC role. No static key path is added. The role must already meet the P8b.1 backend and IAM permission checklist; a permission error is a fail-closed result, not authority to broaden the policy.

### Terraform Commands

The apply path runs these commands in order after the confirmation and environment checks:

```text
terraform init [existing remote backend configuration]
terraform validate
terraform plan -input=false -no-color
terraform apply -input=false -auto-approve -no-color
```

The plan is deliberately not saved as a `.tfplan` artifact. Reviewers inspect the plan in the protected run before it proceeds. The workflow does not apply when the confirmation, environment checks, OIDC configuration, initialisation, validation, or plan fails.

## Evidence And Failure Handling

The evidence template gains `apply` as a Run Summary mode and records whether the confirmation, environment approval, OIDC assumption, fresh plan, IAM apply, and sanitized resource summary completed. It must not capture private backend values, role ARNs, account identifiers, raw plan output, or a provider response.

Expected failures include a missing protected value, rejected environment approval, incorrect confirmation phrase, OIDC trust failure, backend lock/access denial, insufficient scoped IAM permission, unknown model-resource input, or unexpected plan resource. Each failure stops the workflow before apply or at the failing Terraform command. The next action is a narrow configuration or permission correction followed by a new reviewed run.

## Documentation Updates

- Update `docs/p8b1-bedrock-iam-apply-readiness.md` to identify P8b.2 as the approved implementation of the manual apply gate and describe its exact confirmation phrase and no-destroy boundary.
- Update `docs/p8a-bedrock-access-readiness.md`, `docs/p8-real-bedrock-sandbox-design.md`, and `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md` with the sequence P8a → P8b → P8b.1 → P8b.2 manual IAM apply → P8c smoke test.
- Update `docs/templates/p8a-bedrock-smoke-test-evidence.md` so Run Summary includes `apply` and apply-specific sanitized evidence fields.
- Update the existing workflow explanation from plan-only wording to manual IAM-boundary wording without implying Bedrock invocation.

## Testing

- Add static workflow tests to assert the exact trigger, allowed modes, confirmation phrase, protected environment, OIDC permission, remote-operation condition, fresh plan before apply, and absence of Bedrock or destroy commands.
- Run `terraform init -backend=false`, `terraform validate`, and `terraform test` for the unchanged P8b stack.
- Run the API contract suite to prove no runtime behaviour changed.
- Scan changed files for apply triggers outside `workflow_dispatch`, Bedrock invocation commands, account IDs, role ARNs, backend names, credentials, raw prompts, raw responses, and Terraform plan/state artifacts.

## Success Criteria

- A reviewer can see one manual GitHub Actions workflow that safely distinguishes validate, plan, and confirmed apply operations for the same P8b state boundary.
- Apply cannot start without the exact confirmation phrase, protected environment approval, all required environment values, successful OIDC assumption, successful validation, and a fresh plan in the same run.
- The workflow remains scoped to the P8b IAM role, policy, and attachment and performs no Bedrock model call.
- The repository clearly positions P8c as the next, separately designed synthetic model smoke test.
