# YY-44 Cost Guardrails Design

## Purpose

Add a small, Terraform-managed AWS cost-protection layer before the first
bounded EKS GPU and Kueue validation. The layer provides early cost evidence
and notification; it does not claim to be an immediate runtime shutdown
mechanism.

## Scope

The change creates a standalone `cost-guardrails` Terraform environment and
module. It creates two AWS Budgets resources in `us-east-1`:

| Budget | Period | Limit | Actual-spend notifications |
| --- | --- | ---: | --- |
| Sandbox total cost | Monthly | USD 50 | USD 15, 30, 40, and 50 |
| GPU POC cost | Seven-day custom period | USD 20 | USD 10, 15, and 20 |

Both budgets notify a single email address supplied only through the protected
GitHub `aws-sandbox` environment secret `AWS_BUDGET_ALERT_EMAIL`. The Terraform
input is marked sensitive and is never exported as an output.

The Terraform environment is independent from a particular EKS, AgentCore, or
GPU workload environment. A later workload can depend on the guardrails only
after the guardrail workflow has created and verified the budgets.

## Non-goals

- Creating an EKS cluster, GPU node, Kueue queue, CUDA job, or inference
  workload.
- Sending customer data, model prompts, account identifiers, Terraform state,
  or raw workflow logs to the repository.
- An automatic IAM-deny action or automatic resource shutdown. AWS Budgets
  billing data is delayed, so the first POC retains its existing capacity cap,
  protected GitHub environment, short run window, and explicit `stop` action
  as the runtime safety controls.
- Replacing a future CloudWatch, DCGM, Prometheus, or Grafana observability
  implementation.

## Components and boundaries

```text
GitHub aws-sandbox Environment
  variable: AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME
  secret:   AWS_BUDGET_ALERT_EMAIL
              |
              v
terraform-cost-guardrails workflow
  protected environment approval + dedicated OIDC role
              |
              v
Terraform cost-guardrails environment (AWS us-east-1)
              |
              v
AWS Budgets -> direct email notifications
```

The workflow maps the environment secret to the sensitive Terraform input only
for the Terraform process. It does not echo the value. Terraform state remains
in the existing encrypted, private backend at the fixed key
`cost-guardrails/terraform.tfstate`. The separate budget role can list and
read/write only that key; it cannot access another environment's Terraform
state.

The bootstrap CloudFormation stack creates a second GitHub OIDC role named
`cloudai-platform-aws-sandbox-budget-guardrails`. This role is distinct from
the existing general Terraform role. It has access only to the existing
Terraform backend, the named CloudAI budget resources, required budget tag
operations, and the AWS Billing portal permissions required by the Budgets API.
The general Terraform role receives no AWS Billing permissions. The budget role
has no EC2, EKS, Bedrock, IAM pass-role, or shutdown permissions.

The protected GitHub environment stores the budget role ARN as the non-secret
variable `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME`. It stores the recipient only
as the secret `AWS_BUDGET_ALERT_EMAIL`.

The GPU POC uses the AWS provider's required custom-budget timestamp format
`YYYY-MM-DD_hh:mm`. Terraform converts the stable `time_static` and
`time_offset` RFC3339 values before passing them to AWS Budgets.

## Delivery behaviour

The new manually dispatched workflow supports `validate`, `plan`, and `apply`:

- `validate` is source-only and does not assume AWS credentials.
- `plan` and `apply` require the protected `aws-sandbox` environment, the
  dedicated budget-role ARN, and the existing backend inputs.
- `apply` requires a dedicated confirmation phrase, distinct from GPU or EKS
  confirmation phrases.
- `apply` exposes only a sanitised success/failure summary and no plan file or
  Terraform state artifact.

No `destroy` mode is provided in the first slice. Removing a financial control
requires a separately designed and explicitly confirmed change.

## Verification

The implementation must include:

1. Terraform module and environment tests that assert the two budget names,
   periods, limits, notifications, sensitive input, and required tags.
2. Bootstrap policy tests that assert the dedicated budget role has only its
   backend, Budgets, tag, and required Billing portal permissions, while the
   existing general Terraform role has no new Billing permission.
3. Workflow boundary tests that assert protected-environment use, no secret
   echoing, confirmation-gated apply, and source-only validate behaviour.
4. A runbook describing the GitHub Environment secret, notification-confirmation
   email, plan/apply sequence, and the fact that a budget alert is not an
   immediate stop control.

The live acceptance record for this slice is a protected workflow result plus
the AWS Budget notification setup confirmation. It contains no account ID,
budget ARN, email address, raw plan, or state output.

## Operational decision

YY-44 may proceed to a bounded GPU validation only after this guardrails
workflow is live-validated and the budget notifications are confirmed. The
bounded GPU validation must still return capacity to zero with its explicit
`stop` workflow after evidence capture. No deletion is authorised by this
design.
