# P8b.3 GitHub OIDC Variable Name Fix — Design

## Purpose

Correct the P8b.2 Bedrock Terraform workflow so its GitHub Environment input
uses a name GitHub permits. GitHub reserves the `GITHUB_` prefix for both
configuration variables and secrets, so the existing external input name
cannot be created.

## Scope

This correction changes only configuration naming and documentation. It does
not alter the Terraform module, IAM policy scope, OIDC trust policy semantics,
AWS permissions, backend configuration, confirmation gate, or Bedrock model
invocation boundary.

## Configuration Contract

| Boundary | Name | Purpose |
| --- | --- | --- |
| GitHub `aws-sandbox` Environment | `AWS_OIDC_PROVIDER_ARN` | Existing AWS IAM identity-provider ARN for GitHub Actions OIDC. Store as an environment variable. |
| Workflow runtime | `TF_VAR_github_oidc_provider_arn` | Terraform input populated from `AWS_OIDC_PROVIDER_ARN`. |
| Terraform stack | `github_oidc_provider_arn` | Existing input consumed by the Bedrock access module. |

The workflow must read only `vars.AWS_OIDC_PROVIDER_ARN`; it must not retain a
fallback to the invalid `GITHUB_OIDC_PROVIDER_ARN` name. The provider ARN is an
identifier rather than a credential, but remains protected by the
`aws-sandbox` environment approval boundary.

## Workflow Behaviour

For `plan` and confirmed `apply`, the existing environment-value check keeps
testing `TF_VAR_github_oidc_provider_arn`. That is the runtime value Terraform
actually receives. If `AWS_OIDC_PROVIDER_ARN` is absent, the workflow must
fail closed before AWS credentials are configured.

`validate` remains a code-only operation. This P8b.3 correction must not add
new backend, AWS, or Bedrock requirements to it.

## Documentation

Update all P8b readiness and implementation records that instruct a user to
create `GITHUB_OIDC_PROVIDER_ARN`. Each must instead name
`AWS_OIDC_PROVIDER_ARN` and explicitly explain the mapping to the internal
Terraform runtime variable.

Historical P8b.1 planning records are retained as historical evidence and are
not rewritten. The current readiness runbook and P8b.2 design record describe
the operative configuration contract.

## Verification

1. Parse the workflow YAML.
2. Add a static CI assertion that the workflow references
   `AWS_OIDC_PROVIDER_ARN` and does not reference the invalid GitHub
   configuration name.
3. Run Terraform formatting checks, backend-free init, validation, and the
   Bedrock sandbox Terraform test.
4. Confirm the workflow contains no `bedrock:InvokeModel`, `aws bedrock`, or
   destructive Terraform command.

## Out of Scope

- Creating or changing the AWS IAM OIDC provider.
- Changing GitHub Environment values.
- Applying Terraform.
- Calling a Bedrock model or implementing P8c.
