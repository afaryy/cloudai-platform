# YY-44 Cost Guardrails Runbook

## Purpose and scope

This runbook establishes notification-only AWS Budget controls before the
bounded EKS GPU/Kueue validation. It does not create compute, nodes,
Kubernetes workloads, model endpoints, Budget Actions, automatic access-deny
rules, or automatic shutdown.

The workflow manages exactly two budgets:

| Budget | Limit | Period | Actual-spend notification thresholds |
| --- | ---: | --- | --- |
| `cloudai-platform-sandbox-monthly-cost` | USD 50 | Monthly | 15, 30, 40, 50 USD |
| `cloudai-platform-gpu-poc-seven-day-cost` | USD 20 | Seven-day custom | 10, 15, 20 USD |

## Required safety statements

AWS_BUDGET_ALERT_EMAIL is an aws-sandbox Environment secret, not a repository variable.

AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME is an aws-sandbox Environment variable, not a secret.

AWS Budgets notification delivery can be delayed and is not an immediate shutdown mechanism.

Apply requires I_UNDERSTAND_COST_GUARDRAILS_APPLY and a protected aws-sandbox approval.

No destroy mode is supplied by terraform-cost-guardrails.

## One-time prerequisites

1. The AWS account root user has already enabled IAM access to Billing. Do not
   use root credentials in this workflow.
2. Merge the reviewed bootstrap change that creates the dedicated
   `budget-guardrails` OIDC role. The existing general Terraform role must not
   receive Billing permissions.
3. In the protected `aws-sandbox` Environment, add the bootstrap output role
   ARN as `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME` (Environment variable).
4. Add the approved recipient as `AWS_BUDGET_ALERT_EMAIL` (Environment secret).
   Never store the real address in repository source, a workflow input, or a
   repository-level variable.

## Delivery sequence

1. Run `terraform-cost-guardrails` with `mode=validate`. This is source-only;
   it does not request AWS credentials.
2. Run the existing bootstrap workflow in change-set plan mode. Review the
   change set for only the dedicated role, its backend access, Budgets/Billing
   actions, bootstrap-role resource list change, and role ARN output.
3. Execute the bootstrap change set only after its separate confirmation and
   protected Environment approval. Save only redacted success evidence.
4. Add `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME` from the new CloudFormation
   output to the protected Environment.
5. Run `terraform-cost-guardrails` with `mode=plan`; verify it proposes exactly
   two budget resources plus the short custom-period timer resources.
6. Run `mode=apply` with the exact confirmation phrase. Review GitHub's
   protected Environment approval request before approval.
7. Verify the budgets through sanitized workflow evidence and, after a future
   threshold is crossed, the recipient's notification delivery. Do not record
   the recipient address, account identifier, budget ARN, raw plan, or state.

## Operating rule for GPU work

Budget notifications provide awareness, not a real-time kill switch. The GPU
operator remains responsible for the separate, explicit `stop` workflow that
scales GPU capacity to zero when the short validation finishes. No resource
deletion is implied by this runbook.

## Evidence boundary

Commit only public-safe code, tests, and documentation. Keep change-set links,
workflow run identifiers, timestamps, recipient confirmation, and any
account-specific evidence in private notes. Until both protected applies
succeed, this feature remains source implementation only.
