# P8c Synthetic Bedrock Smoke-Test Design

## Purpose

Add one manually confirmed, synthetic Bedrock inference call to the existing `terraform-bedrock-sandbox` GitHub Actions workflow. The call proves the P8b IAM boundary and approved-model access without turning the Terraform execution role into a Bedrock runtime identity.

## Execution Identity

P8c adds a `smoke-test` workflow mode. That mode assumes the P8b-created Bedrock smoke-test role directly through GitHub OIDC using the protected `aws-sandbox` environment.

It does not use `AWS_ROLE_TO_ASSUME`, which remains the Terraform execution role for `plan` and `apply`. The Terraform execution role does not receive `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, or `iam:PassRole`.

## Protected Environment Contract

P8c adds these protected `aws-sandbox` environment variables:

| Name | Purpose | Handling rule |
| --- | --- | --- |
| `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME` | P8b-created OIDC role used only by `smoke-test` mode. | Never commit the role ARN. |
| `BEDROCK_MODEL_ID` | Approved direct foundation-model ID matching the P8b IAM policy resource. | Do not log it with account or entitlement details. |

Existing Terraform backend variables remain required only for `plan` and `apply`. The smoke-test mode does not initialise Terraform or read the backend.

## Invocation Boundary

The smoke test uses one non-streaming `aws bedrock-runtime converse` request. It sets:

- `AWS_MAX_ATTEMPTS=1`, preventing SDK retry attempts;
- a very low output-token limit and temperature `0`;
- no tools, guardrails, agents, retrieval, application inference profiles, streaming, or fallback models;
- a synthetic input generated at runtime from the GitHub run context;
- output redirected to a temporary file, with only a structural success check and a sanitized status emitted to logs.

No prompt text, response text, request identifier, account ID, role ARN, state-backend value, or raw AWS CLI output is printed or committed. The temporary response file is removed when the step ends.

## Confirmation and Stop Conditions

The mode requires the exact confirmation value:

```text
I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL
```

The workflow stops without configuring AWS credentials when confirmation or either P8c environment variable is absent. It also stops without fallback when model access, model availability, policy scope, direct-model invocation, quota, or region requirements fail.

If the selected model requires an inference profile, P8c stops and records a sanitized failure. A separate reviewed change is required to change the P8b policy boundary from a foundation-model ARN to an inference-profile boundary.

## Evidence

The workflow emits only a sanitized pass/fail category. The existing P8 evidence template is completed manually with the mode, approved region label, synthetic-data confirmation, result category, and any safe token/cost summary. Raw prompt and response data are excluded.

## Verification

Static workflow tests must confirm:

- `smoke-test` cannot run without its exact confirmation;
- P8c uses `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME`, not `AWS_ROLE_TO_ASSUME`;
- no Terraform command runs for the smoke-test path;
- the Bedrock command is non-streaming and uses one attempt;
- prompt/response output is not printed; and
- `plan` and `apply` retain their existing P8b boundary.
