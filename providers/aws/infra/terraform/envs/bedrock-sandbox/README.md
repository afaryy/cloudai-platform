# Bedrock Sandbox Terraform Stack

This stack is the P8b plan-only boundary for future real Amazon Bedrock access.

It models a narrow GitHub Actions OIDC role and IAM policy for one later synthetic Bedrock smoke test. It does not invoke Bedrock, create an application runtime, store prompts or responses, or deploy AI services.

## Boundary

Use this stack only after the P8a readiness checklist is complete:

- `docs/p8a-bedrock-access-readiness.md`
- `docs/templates/p8a-bedrock-smoke-test-evidence.md`

The first safe actions are Terraform validation and plan. P8b.2 adds a manually confirmed apply mode after the [P8b.1 IAM apply-readiness gate](../../../../../../docs/p8b1-bedrock-iam-apply-readiness.md). P8c adds the separate model-only smoke mode. P8f adds a separate guarded smoke mode, and P8g adds a direct Guardrail-evaluation mode. Neither is a default CI action; both require a reviewed apply before they can read the Guardrail outputs.

## Required Private Inputs

Provide these through the protected `aws-sandbox` GitHub environment or local, ignored tfvars:

- `TF_VAR_github_oidc_provider_arn` (local, ignored configuration only)
- `TF_VAR_allowed_model_arns`

For GitHub Actions, set `AWS_OIDC_PROVIDER_ARN` in the protected
`aws-sandbox` environment. The workflow maps it to
`TF_VAR_github_oidc_provider_arn` for Terraform. GitHub does not permit
configuration names beginning with `GITHUB_`.

For GitHub Actions, store the model boundary as a JSON list in `BEDROCK_ALLOWED_MODEL_ARNS`, for example:

```text
["arn:aws:bedrock:<region>::foundation-model/<model-id>"]
```

Use the real approved value only in GitHub environment variables or local ignored files.

## P8f Guarded Smoke Boundary

P8f creates a small Terraform-managed Bedrock Guardrail and an explicit version. Its only configured controls are Prompt Attack filtering (high input strength and the Bedrock-required `NONE` response strength) and one standard sensitive-information entity. It is a bounded attachment and IAM-enforcement exercise, not a test of policy quality or real sensitive-content detection.

The separate `guardrail-smoke-test` workflow mode requires:

- the normal Terraform execution role through the protected `aws-sandbox` environment, so it can read the Guardrail ID and version from the existing remote state;
- `AWS_BEDROCK_GUARDRAIL_SMOKE_ROLE_TO_ASSUME` in the same protected environment, set after the reviewed Terraform apply creates the separate role;
- `BEDROCK_MODEL_ID` and the existing model-resource boundary;
- the exact `I_UNDERSTAND_ONE_SYNTHETIC_GUARDED_BEDROCK_CALL` confirmation.

The guarded role permits `bedrock:InvokeModel` only against the approved model resources when the request carries the Terraform-managed Guardrail identifier/version, plus `bedrock:ApplyGuardrail` only for that Terraform-managed Guardrail. The workflow masks the Guardrail ID and version before exposing them to later steps, makes exactly one non-streaming synthetic `Converse` request with tracing disabled, uses one AWS attempt, removes temporary files, and reports only a sanitized pass or failure category. It does not print Guardrail IDs, versions, prompts, outputs, traces, or provider error text.

## P8g Direct Guardrail Evaluation

P8g is a separate manual `ApplyGuardrail` evaluation. It does not invoke a
model and does not replace the P8f guarded `Converse` attachment evidence. It
reuses the protected `aws-sandbox` environment, the normal Terraform role for
remote-state lookup, the separate Guardrail role, and Terraform-managed
Guardrail outputs. It requires no new GitHub environment variables.

Dispatch `terraform-bedrock-sandbox` with `mode=guardrail-evaluation` and the
exact confirmation `I_UNDERSTAND_THREE_SYNTHETIC_GUARDRAIL_EVALUATIONS`. The
workflow evaluates exactly three synthetic categories: safe, PII-shaped, and
prompt-attack-shaped. It emits only opaque category labels, expected/actual
allow-or-block verdicts, an aggregate pass marker, or a sanitized failure
category.

A passing run proves only that this configured Guardrail made the expected
decisions for those three synthetic checks at that time. It is not evidence of
PII-detection accuracy, broad safety coverage, or production certification.

Do not commit account IDs, role ARNs, model entitlement screenshots, backend bucket names, lock-table names, tfvars, tfstate, tfplan files, credentials, raw prompts, or raw responses.

## Remote Backend Key

Use a separate state key from EKS:

```text
cloudai-platform/bedrock-sandbox/terraform.tfstate
```
