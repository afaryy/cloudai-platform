# P8a/P8d Bedrock Smoke Test Evidence Template

Use this template for public-safe notes after a future Bedrock access readiness or smoke-test run.

Do not include account IDs, role ARNs, backend bucket/table names, raw prompts, raw responses, access keys, session tokens, CloudWatch links with account-specific values, screenshots with account details, model entitlement screenshots, personal data, customer data, internal data, or production data.

## Run Summary

| Field | Value |
| --- | --- |
| Date | YYYY-MM-DD |
| Workflow | `bedrock-sandbox` or readiness-only workflow |
| Environment | `aws-sandbox` |
| Mode | `readiness`, `plan`, or `smoke-test` |
| Region | Approved AWS region label |
| Data scope | `synthetic-only` |
| Bedrock invocation | `none` or `one synthetic smoke test` |

## Readiness Evidence

- Manual GitHub environment approval required:
- OIDC role assumption planned:
- Long-lived AWS keys avoided:
- Budget or spending alarm exists:
- Model access confirmed:
- IAM scope reviewed:
- Synthetic prompt confirmed:
- Evidence rules reviewed:

## Terraform Evidence

Use this section only for future P8b/P8c work.

- Backend initialized:
- Terraform validation completed:
- Terraform plan completed:
- Terraform apply completed:
- Resources summarized:
- No private backend/account values committed:

## Smoke Test Evidence

Use this section only for future P8d work.

- Model family label:
- Prompt synthetic:
- Raw prompt committed: no
- Raw response committed: no
- Smoke-test result:
- Token/cost summary:
- Request or trace identifier sanitized:
- Failure reason, if any:

## Follow-Up

- Decision:
- Next task:
- Cleanup needed:
