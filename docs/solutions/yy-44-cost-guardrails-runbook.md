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
| `cloudai-platform-gpu-poc-daily-cost` | USD 20/day | Daily recurring cap during seven-day window | 10, 15, 20 USD |

## Required safety statements

AWS_BUDGET_ALERT_EMAIL is an aws-sandbox Environment secret, not a repository variable.

AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME is an aws-sandbox Environment variable, not a secret.

Budget amounts and notification thresholds are also controlled by the
protected `aws-sandbox` Environment variables below. If absent, the workflow
uses the documented defaults:

| Environment variable | Default |
| --- | ---: |
| `MONTHLY_SANDBOX_BUDGET_USD` | `50` |
| `GPU_DAILY_BUDGET_USD` | `20` |
| `MONTHLY_ALERT_THRESHOLDS_USD` | `15,30,40,50` |
| `GPU_ALERT_THRESHOLDS_USD` | `10,15,20` |

AWS Budgets notification delivery can be delayed and is not an immediate shutdown mechanism.

Apply requires I_UNDERSTAND_COST_GUARDRAILS_APPLY and a protected aws-sandbox approval.

No destroy mode is supplied by terraform-cost-guardrails.

## Separate orphan-role recovery path

The normal `update-aws-bootstrap` workflow remains the only path for changing
the Bootstrap CloudFormation stack. A failed or interrupted stack update may
leave a partial Budget Guardrails role behind; that case is handled by the
separate `recover-budget-guardrails-orphan` workflow.

The recovery workflow has a fixed target role and no role-name input:

`cloudai-platform-aws-sandbox-budget-guardrails`

Run it in this order:

1. Run `mode=inspect` first. An absent role is a successful no-op. A role
   referenced by the configured CloudFormation stack, or any role whose trust,
   tags, inline policy, or attached-policy state differs from the expected
   orphan contract, returns `blocked` and is not changed.
2. Review the protected `aws-sandbox` Environment result. The inspect mode does
   not delete anything and publishes only a status category.
3. Only when the result is a validated orphan, run `mode=recover` with the
   exact confirmation `I_UNDERSTAND_BUDGET_GUARDRAILS_ORPHAN_ROLE_RECOVERY` and
   approve the protected Environment deployment.
4. The recovery mode deletes only the fixed inline policy
   `CostGuardrailsTerraformPolicy` and then the fixed role. It does not create
   a replacement role, change the Bootstrap stack, or alter budgets.

The bootstrap/recovery role needs only the following additional IAM actions for
this separate path: `iam:GetRole`, `iam:ListRolePolicies`,
`iam:ListAttachedRolePolicies`, `iam:ListRoleTags`,
`cloudformation:DescribeStackResources`, and, for the explicitly confirmed
`recover` mode only, `iam:DeleteRolePolicy` and `iam:DeleteRole`. Grant these
through the reviewed IaC bootstrap path; do not attach an inline policy in the
AWS Console. Never record the role ARN, account ID, policy document, or raw
AWS output in repository evidence.

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
5. The workflow uses the scoped S3 lockfile for
   `cost-guardrails/terraform.tfstate`; it does not need access to the shared
   DynamoDB lock table.

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
   two budget resources and no timer resources. The daily GPU cap and the
   separately approved seven-day teardown window together provide the bounded
   demo control.
6. Run `mode=apply` with the exact confirmation phrase. Review GitHub's
   protected Environment approval request before approval.
7. Verify the budgets through sanitized workflow evidence and, after a future
   threshold is crossed, the recipient's notification delivery. Do not record
   the recipient address, account identifier, budget ARN, raw plan, or state.

## Operator checklist

Use this checklist in order. Stop at any failed validation or unexpected
change-set item; do not work around a failed control with local credentials or
AWS console edits.

### A. Prepare protected GitHub Environment values

1. Open the repository's **Settings → Environments → aws-sandbox**.
2. Add `AWS_BUDGET_ALERT_EMAIL` as an **Environment secret**. Paste only the
   approved recipient address; do not add it as a repository secret, variable,
   workflow input, or tracked file.
3. Keep `AWS_REGION` and `TF_BACKEND_BUCKET` as the existing protected
   Environment variables. This workflow does not need
   `TF_BACKEND_LOCK_TABLE`.
4. Do not set `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME` yet: it is created by the
   approved bootstrap update in the next section.

### B. Create the dedicated role through the bootstrap workflow

1. Open **Actions → update-aws-bootstrap → Run workflow**.
2. Select its change-set plan mode; do not select execute/apply initially.
3. Review the generated change set. It must show only the new dedicated
   Budget Guardrails role, its exact state/lockfile permissions, AWS Budgets
   and required Billing portal permissions, bootstrap-role management scope,
   and the `BudgetGuardrailsRoleArn` output.
4. Reject the run if it adds EC2, EKS, Bedrock, `iam:PassRole`, a Budget
   Action, general-role Billing permissions, broad S3 object access, or shared
   DynamoDB lock-table access.
5. Only after that review, run the bootstrap execution mode with
   `confirmation=I_UNDERSTAND_AWS_BOOTSTRAP_APPLY` and the exact reviewed
   `cloudai-bootstrap-...` change-set name. Approve the protected
   `aws-sandbox` deployment.
6. In the successful job summary, open **Budget Guardrails Environment
   handoff**. Copy its `BudgetGuardrailsRoleArn` value into the protected
   Environment variable `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME`. This is an
   intentional private handoff; do not copy that value into a repository file,
   issue, public artifact, or chat.

### C. Validate and plan budget guardrails

1. Open **Actions → terraform-cost-guardrails → Run workflow**.
2. Run `mode=validate`. Confirm it finishes without requesting AWS
   credentials.
3. Run `mode=plan`. Confirm it assumes the dedicated role and proposes only:
   two `aws_budgets_budget` resources and the short custom-period timer
   resources. Do not retain or publish the raw Terraform plan.
4. Confirm the budgets and thresholds match the table above. Confirm no
   destroy, GPU, EKS, Budget Action, automated deny, or shutdown action is in
   the workflow or plan.

### D. Apply and capture minimal evidence

1. Run `mode=apply` and enter exactly
   `I_UNDERSTAND_COST_GUARDRAILS_APPLY`.
2. Review and approve the protected `aws-sandbox` Environment prompt.
3. Capture only private, sanitized evidence: workflow URL or run ID, UTC
   timestamp, successful mode, and confirmation that two budget names were
   created. Do not copy state, account IDs, budget ARNs, recipient email, or
   raw plan output into the repository.
4. Record notification delivery only when a threshold is naturally reached or
   when a separately approved safe test exists. Do not intentionally spend to
   trigger an alert.

### E. Hand off to the GPU POC

1. Treat the completed budget apply as a prerequisite, not as a runtime stop
   mechanism.
2. Before any GPU apply, re-check the budget limits, quota, instance cap,
   short run window, and separate explicit `stop` workflow.
3. When the GPU validation ends, run its explicit stop procedure to return
   GPU capacity to zero. Do not delete these Budget guardrails as part of that
   operation.

## Operating rule for GPU work

Budget notifications provide awareness, not a real-time kill switch. The GPU
operator remains responsible for the separate, explicit `stop` workflow that
scales GPU capacity to zero when the short validation finishes. No resource
deletion is implied by this runbook.

## Evidence boundary

Commit only public-safe code, tests, and documentation. Keep change-set links,
workflow run identifiers, timestamps, recipient confirmation, and any
account-specific evidence in private notes. The dedicated-role bootstrap and
Cost Guardrails Terraform apply have completed through protected workflows,
creating exactly two notification-only AWS Budgets. Notification delivery has
not been validated. This evidence does not claim automatic shutdown, real-time
enforcement, GPU deployment, EKS deployment, or deletion capability.
