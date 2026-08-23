# Cost Guardrails Terraform Environment

This environment creates only two AWS Budgets notification guardrails before a
separately approved GPU POC. It creates no EKS, GPU, Kueue, inference,
automatic shutdown, Budget Action, SNS, Lambda, or deletion path.

## Reviewed boundaries

| Budget | Period | Limit | Actual-spend notifications |
| --- | --- | --- | --- |
| `cloudai-platform-sandbox-monthly-cost` | Monthly | USD 50 | USD 15, 30, 40, 50 |
| `cloudai-platform-gpu-poc-daily-cost` | Daily recurring cap during the seven-day demo window | USD 20/day | USD 10, 15, 20 |

AWS Budgets does not support a Terraform `CUSTOM` time unit. The GPU guardrail
therefore uses a supported daily budget and the operator's separately approved
seven-day demo window/teardown plan provides the outer lifecycle boundary. It
is a notification control, not an immediate technical shutdown mechanism.

## Protected delivery only

Use `.github/workflows/terraform-cost-guardrails.yml` through the protected
`aws-sandbox` GitHub Environment. Local Terraform use is limited to formatting,
validation, and tests; do not use local credentials to create, update, or
delete AWS Budgets.

Set the following protected Environment values before a `plan` or `apply`:

- `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME` — CloudFormation output from the
  approved bootstrap update; it is a GitHub Environment variable, not a secret.
- `AWS_BUDGET_ALERT_EMAIL` — recipient for budget notifications; it is a GitHub
  Environment secret.
- Existing backend values: `AWS_REGION` and `TF_BACKEND_BUCKET`. The state key
  is deliberately fixed to `cost-guardrails/terraform.tfstate` so the
  dedicated role cannot access other environment state objects. This
  environment uses a scoped S3 lockfile at the same key with `.tflock`, rather
  than the shared DynamoDB lock table.

Do not commit account IDs, backend values, budget ARNs, recipient email
addresses, raw plans, Terraform state, or tfvars.
