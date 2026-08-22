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
  secret: AWS_BUDGET_ALERT_EMAIL
              |
              v
terraform-cost-guardrails workflow
  protected environment approval + OIDC
              |
              v
Terraform cost-guardrails environment (AWS us-east-1)
              |
              v
AWS Budgets -> direct email notifications
```

The workflow maps the environment secret to the sensitive Terraform input only
for the Terraform process. It does not echo the value. Terraform state remains
in the existing encrypted, private backend; its access boundary remains the
existing GitHub OIDC Terraform role.

The bootstrap CloudFormation stack receives only the additional AWS Budgets
permissions required by this environment. Permissions are limited to managing
the named CloudAI sandbox-budget resources plus read/describe operations that
the Terraform provider requires. The role does not receive new EC2, EKS, IAM
or shutdown permissions as part of this change.

## Delivery behaviour

The new manually dispatched workflow supports `validate`, `plan`, and `apply`:

- `validate` is source-only and does not assume AWS credentials.
- `plan` and `apply` require the protected `aws-sandbox` environment and the
  existing OIDC role/backend inputs.
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
2. Bootstrap policy tests that assert the budget permissions are present and do
   not broaden unrelated infrastructure permissions.
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
