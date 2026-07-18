# Bedrock Sandbox Terraform Stack

This stack is the P8b plan-only boundary for future real Amazon Bedrock access.

It models a narrow GitHub Actions OIDC role and IAM policy for one later synthetic Bedrock smoke test. It does not invoke Bedrock, create an application runtime, store prompts or responses, or deploy AI services.

## Boundary

Use this stack only after the P8a readiness checklist is complete:

- `docs/p8a-bedrock-access-readiness.md`
- `docs/templates/p8a-bedrock-smoke-test-evidence.md`

The first safe actions are Terraform validation and plan. P8b.2 adds a manually confirmed apply mode after the [P8b.1 IAM apply-readiness gate](../../../../../docs/p8b1-bedrock-iam-apply-readiness.md); it still performs no Bedrock invocation or destroy.

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

Do not commit account IDs, role ARNs, model entitlement screenshots, backend bucket names, lock-table names, tfvars, tfstate, tfplan files, credentials, raw prompts, or raw responses.

## Remote Backend Key

Use a separate state key from EKS:

```text
cloudai-platform/bedrock-sandbox/terraform.tfstate
```
