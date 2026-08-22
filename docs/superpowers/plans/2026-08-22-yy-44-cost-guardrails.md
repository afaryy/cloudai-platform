# YY-44 Cost Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Terraform-managed, notification-only AWS Budget guardrails that must be live before the bounded EKS GPU/Kueue validation.

**Architecture:** A standalone `cost-guardrails` Terraform environment uses an AWS provider fixed to `us-east-1` and the existing encrypted S3 state backend. It creates a monthly sandbox-total cost budget and a seven-day GPU-POC cost budget, each with direct email notifications. The protected GitHub Actions workflow injects one Environment secret as a sensitive Terraform variable and assumes a dedicated Budget Guardrails OIDC role. The existing general Terraform OIDC role receives no Billing permissions.

**Tech Stack:** Terraform >= 1.6, hashicorp/aws provider ~> 5.0, hashicorp/time provider, AWS Budgets, CloudFormation, GitHub Actions OIDC, Ruby Minitest, cfn-lint.

**Spec:** `docs/superpowers/specs/2026-08-22-yy-44-cost-guardrails-design.md`

## Global Constraints

- Budgets use `us-east-1` because AWS Budgets API is regional for global billing data.
- Create only two monitoring budgets: USD 50 monthly total cost and USD 20 seven-day GPU POC cost.
- Use actual-spend email thresholds only: 15/30/40/50 for the monthly budget and 10/15/20 for the seven-day budget.
- Read the recipient only from protected `aws-sandbox` Environment secret `AWS_BUDGET_ALERT_EMAIL`; mark the Terraform input sensitive and never output it.
- Assume only `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME` for budget workflow plan/apply; it is an Environment variable because a role ARN is not a secret.
- The dedicated role may access only `cost-guardrails/terraform.tfstate` and its S3 lockfile in the existing Terraform backend plus `budgets:ModifyBudget`, `budgets:ViewBudget`, `budgets:TagResource`, `budgets:UntagResource`, `budgets:ListTagsForResource`, `aws-portal:ModifyBilling`, and `aws-portal:ViewBilling`; it does not access the shared DynamoDB lock table and must have no EC2, EKS, Bedrock, or IAM pass-role permission.
- Do not create GPU, EKS, Kueue, CUDA, inference, SNS, Lambda, Budget Actions, automatic IAM deny, or automatic shutdown resources.
- `validate` must not assume AWS credentials; `apply` requires protected-environment approval and the exact confirmation `I_UNDERSTAND_COST_GUARDRAILS_APPLY`.
- Do not add a destroy workflow or expose state, raw plans, email addresses, account IDs, budget ARNs, or account-specific backend values in committed files or CI artifacts.

---

### Task 1: Define and test the standalone Terraform budget contract

**Files:**
- Create: `providers/aws/infra/terraform/modules/cost-guardrails/versions.tf`
- Create: `providers/aws/infra/terraform/modules/cost-guardrails/variables.tf`
- Create: `providers/aws/infra/terraform/modules/cost-guardrails/main.tf`
- Create: `providers/aws/infra/terraform/modules/cost-guardrails/outputs.tf`
- Create: `providers/aws/infra/terraform/modules/cost-guardrails/cost_guardrails.tftest.hcl`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/versions.tf`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/variables.tf`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/main.tf`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/outputs.tf`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/backend.s3.tf`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/backend.tf.example`
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/cost_guardrails.tftest.hcl`

**Interfaces:**
- Consumes: `budget_alert_email` (sensitive string), `project_name` (`cloudai-platform`), `environment` (`cost-guardrails`), `tags` (map(string)), and the provider account identity.
- Produces: two non-sensitive budget names only: `cloudai-platform-sandbox-monthly-cost` and `cloudai-platform-gpu-poc-seven-day-cost`.
- Resource contract: `aws_budgets_budget` resource with `budget_type = "COST"`, `cost_types { include_credit = true; include_refund = true; include_subscription = true; include_support = true; include_tax = true; include_upfront = true; include_recurring = true; use_blended = false; use_amortized = false }`, and individual `notification` blocks containing one `subscriber` with `subscription_type = "EMAIL"`. The seven-day window is created once through `time_static.gpu_poc_budget_start` and `time_offset.gpu_poc_budget_end`, with `offset_days = 7`; it is never recalculated on ordinary applies.

- [ ] **Step 1: Write the failing module test**

Create `providers/aws/infra/terraform/modules/cost-guardrails/cost_guardrails.tftest.hcl`:

```hcl
mock_provider "aws" {}

run "creates_the_two_monitoring_budgets" {
  command = plan

  variables {
    project_name      = "cloudai-platform"
    environment       = "cost-guardrails"
    budget_alert_email = "test@example.invalid"
  }

  assert {
    condition     = aws_budgets_budget.sandbox_monthly.limit_amount == "50"
    error_message = "Monthly sandbox budget must remain USD 50."
  }

  assert {
    condition     = aws_budgets_budget.gpu_poc_seven_day.limit_amount == "20"
    error_message = "GPU POC budget must remain USD 20."
  }
}
```

- [ ] **Step 2: Run the module test to verify it fails**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform/modules/cost-guardrails test
```

Expected: failure because the module and resources do not yet exist.

- [ ] **Step 3: Implement the focused module**

Create `versions.tf` with the AWS provider constraint already used in other sandbox modules. In `variables.tf`, validate a non-empty `budget_alert_email`, mark it `sensitive = true`, and set defaults `project_name = "cloudai-platform"` and `environment = "cost-guardrails"`. In `main.tf`, create exactly these resource names and threshold blocks:

```hcl
resource "aws_budgets_budget" "sandbox_monthly" {
  name         = "${var.project_name}-sandbox-monthly-cost"
  budget_type  = "COST"
  limit_amount = "50"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 15
    threshold_type             = "ABSOLUTE_VALUE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
```

Use the same resource shape for the remaining monthly 30/40/50 thresholds and seven-day 10/15/20 thresholds. In the GPU budget, set `time_unit = "CUSTOM"`, `time_period_start = time_static.gpu_poc_budget_start.rfc3339`, and `time_period_end = time_offset.gpu_poc_budget_end.rfc3339`; create the time resources in the module so the seven-day window begins only on first apply. Add default tags `Project`, `Environment`, `ManagedBy = "terraform"`, `CostBoundary = "notification-only"`, and `CloudAISlice = "yy-44-cost-guardrails"`. `outputs.tf` must export only the two names and never the recipient or any ARN.

- [ ] **Step 4: Implement the environment wrapper and environment tests**

Use a provider configured as:

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "cloudai-platform"
      Environment = "cost-guardrails"
      DataScope   = "synthetic-only"
      ManagedBy   = "terraform"
    }
  }
}
```

Make `main.tf` call the module with `budget_alert_email = var.budget_alert_email`. Use `backend "s3" {}` and an example backend file matching other environments. Add environment tests that assert the module input is supplied and the two exported names are stable.

- [ ] **Step 5: Run formatting and focused Terraform tests**

Run:

```bash
terraform fmt -check -recursive providers/aws/infra/terraform/modules/cost-guardrails providers/aws/infra/terraform/envs/cost-guardrails
terraform -chdir=providers/aws/infra/terraform/modules/cost-guardrails init -backend=false -input=false
terraform -chdir=providers/aws/infra/terraform/modules/cost-guardrails test
terraform -chdir=providers/aws/infra/terraform/envs/cost-guardrails init -backend=false -input=false
terraform -chdir=providers/aws/infra/terraform/envs/cost-guardrails test
```

Expected: format check and both mock-provider test suites pass. If provider retrieval is unavailable, record the network failure and run source-only structural tests; do not weaken or remove Terraform tests.

- [ ] **Step 6: Commit the tested Terraform contract**

```bash
git add providers/aws/infra/terraform/modules/cost-guardrails providers/aws/infra/terraform/envs/cost-guardrails
git commit -m "feat: add Terraform cost guardrails"
```

### Task 2: Create the dedicated Budget Guardrails OIDC role and regression tests

**Files:**
- Modify: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml`
- Modify: `providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

**Interfaces:**
- Consumes: existing `GitHubActionsTerraformRole` trusted only by the `afaryy/cloudai-platform` `aws-sandbox` OIDC subject.
- Produces: `GitHubActionsBudgetGuardrailsRole`, trusted by the same protected GitHub OIDC subject, with backend access plus Budgets/Billing-only permissions for names prefixed `cloudai-platform-`.
- Does not produce: Billing permissions on `GitHubActionsTerraformRole`, managed policies, pass-role permissions, EC2/EKS permissions, Budget Actions, or SNS permissions.

- [ ] **Step 1: Write the failing bootstrap policy test**

Add tests which extract the dedicated role and its inline policy. Assert the role name and trust subject match the protected environment. Assert the dedicated policy includes:

```ruby
%w[
  budgets:ModifyBudget budgets:ViewBudget budgets:TagResource
  budgets:UntagResource budgets:ListTagsForResource
  aws-portal:ModifyBilling aws-portal:ViewBilling
].each { |action| assert_includes budget_statement, action }
```

Also assert the statement contains `budget/cloudai-platform-*`, `aws:RequestTag/Project`, and `aws:ResourceTag/Project`; it must not contain `ec2:RunInstances`, `eks:CreateCluster`, `bedrock:InvokeModel`, `iam:PassRole`, or `budgets:CreateBudgetAction`. Add a negative test asserting `GitHubActionsTerraformRole` does not contain `aws-portal:ModifyBilling`.

- [ ] **Step 2: Run the bootstrap test to verify it fails**

Run:

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
```

Expected: failure because `GitHubActionsBudgetGuardrailsRole` does not exist.

- [ ] **Step 3: Add the least-privilege bootstrap policy statement**

Create `GitHubActionsBudgetGuardrailsRole` with the same GitHub OIDC trust condition as the existing Terraform role. Give it the existing state bucket and lock-table access. Its inline policy must separate the globally scoped Billing portal actions from the resource-scoped Budgets actions:

```yaml
!Sub "arn:${AWS::Partition}:budgets::${AWS::AccountId}:budget/cloudai-platform-*"
```

Use `aws:RequestTag/Project = cloudai-platform` plus the required request tag keys on create/modify operations, and `aws:ResourceTag/Project = cloudai-platform` on read/update/delete operations. Add the new role ARN as a CloudFormation output named `BudgetGuardrailsRoleArn`. Extend the bootstrap role's narrowly scoped role-management resource list to include only the new role name.

Do not add `budgets:CreateBudgetAction`, Billing permissions to the existing Terraform role, IAM policy attachment, EC2, EKS, SNS, Lambda, or any unrelated permission.

- [ ] **Step 4: Run policy and CloudFormation validation**

Run:

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
pipx run cfn-lint providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml
```

Expected: all Ruby assertions pass and cfn-lint reports no template errors.

- [ ] **Step 5: Commit the bounded IAM change**

```bash
git add providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
git commit -m "feat: permit Terraform budget guardrails"
```

### Task 3: Add the protected Terraform delivery workflow and source-boundary tests

**Files:**
- Create: `.github/workflows/terraform-cost-guardrails.yml`
- Modify: `.github/workflows/terraform-tests.yaml`

**Interfaces:**
- Consumes: protected `aws-sandbox` Environment variable `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME`, `AWS_REGION`, `TF_BACKEND_BUCKET`, and secret `AWS_BUDGET_ALERT_EMAIL`.
- Produces: `validate`, `plan`, and confirmation-gated `apply` operations for the fixed state key `cost-guardrails/terraform.tfstate`.
- Does not produce: workflow artifacts containing plans/state, a `destroy` operation, or an echo of `AWS_BUDGET_ALERT_EMAIL`.

- [ ] **Step 1: Write the failing workflow boundary job**

Add a `cost_guardrails_workflow_boundary` job to `.github/workflows/terraform-tests.yaml` that checks:

```bash
workflow=.github/workflows/terraform-cost-guardrails.yml
grep -q 'environment: aws-sandbox' "$workflow"
grep -q 'I_UNDERSTAND_COST_GUARDRAILS_APPLY' "$workflow"
grep -q 'AWS_BUDGET_ALERT_EMAIL' "$workflow"
grep -q 'terraform init -backend=false' "$workflow"
grep -q 'terraform apply -input=false -auto-approve -no-color' "$workflow"
! grep -q 'terraform destroy' "$workflow"
! grep -q 'echo.*AWS_BUDGET_ALERT_EMAIL' "$workflow"
```

- [ ] **Step 2: Run the boundary job locally to verify it fails**

Run the same shell checks from Task 3 Step 1.

Expected: failure because the workflow file does not exist.

- [ ] **Step 3: Implement the workflow**

Create `.github/workflows/terraform-cost-guardrails.yml` following the established Bedrock sandbox workflow conventions:

```yaml
permissions:
  contents: read
  id-token: write

concurrency:
  group: terraform-cost-guardrails
  cancel-in-progress: false

jobs:
  terraform:
    runs-on: ubuntu-latest
    environment: aws-sandbox
    env:
      AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME: ${{ vars.AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME }}
      AWS_BUDGET_ALERT_EMAIL: ${{ secrets.AWS_BUDGET_ALERT_EMAIL }}
      TF_STATE_KEY: cost-guardrails/terraform.tfstate
      TF_VAR_budget_alert_email: ${{ secrets.AWS_BUDGET_ALERT_EMAIL }}
```

Require `mode` values `validate`, `plan`, and `apply`. For `apply`, validate the exact confirmation phrase before configuring AWS credentials. For `plan` and `apply`, require each backend input, `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME`, and `AWS_BUDGET_ALERT_EMAIL` to be non-empty; configure OIDC with the dedicated role and masked account ID, initialise the S3 backend, and run Terraform. Run `validate` with `terraform init -backend=false` and no AWS credential step. Print only fixed sanitized messages after apply; do not invoke `terraform show`, write a plan artifact, or echo secrets.

- [ ] **Step 4: Run workflow boundary checks and repository CI tests**

Run:

```bash
bash -n .github/workflows/terraform-cost-guardrails.yml
terraform -chdir=providers/aws/infra/terraform/envs/cost-guardrails validate
git diff --check
```

Run the exact grep assertions from Task 3 Step 1. Then run the repository workflow-equivalent Terraform test script if it is executable:

```bash
sed -n '1,220p' .github/workflows/terraform-tests.yaml
```

Expected: source-boundary checks pass; no secret, plan, state, or destroy path exists.

- [ ] **Step 5: Commit the delivery path**

```bash
git add .github/workflows/terraform-cost-guardrails.yml .github/workflows/terraform-tests.yaml
git commit -m "ci: add cost guardrails workflow"
```

### Task 4: Document operator setup and live acceptance evidence

**Files:**
- Create: `providers/aws/infra/terraform/envs/cost-guardrails/README.md`
- Create: `docs/solutions/yy-44-cost-guardrails-runbook.md`
- Modify: `docs/practices/current-status.md`

**Interfaces:**
- Consumes: GitHub `aws-sandbox` Environment secret `AWS_BUDGET_ALERT_EMAIL`, Environment variable `AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME`, existing backend variables, and the workflow from Task 3.
- Produces: a public-safe setup/runbook and a clearly marked `planned` status until protected live evidence exists.

- [ ] **Step 1: Write the documentation assertions as a checklist**

The runbook must contain these exact operational statements:

```text
AWS_BUDGET_ALERT_EMAIL is an aws-sandbox Environment secret, not a repository variable.
AWS_BUDGET_GUARDRAILS_ROLE_TO_ASSUME is an aws-sandbox Environment variable, not a secret.
AWS Budgets notification delivery can be delayed and is not an immediate shutdown mechanism.
Apply requires I_UNDERSTAND_COST_GUARDRAILS_APPLY and a protected aws-sandbox approval.
No destroy mode is supplied by terraform-cost-guardrails.
```

- [ ] **Step 2: Document the exact manual steps**

Document: root-only Billing IAM Access prerequisite already completed; GitHub Environment secret and variable creation; validate → bootstrap change-set plan/apply → cost-guardrails plan/apply; notification-delivery verification; redacted evidence capture; and the separate GPU `stop` responsibility.

The README must state that no account ID, backend value, budget ARN, recipient email, raw plan, or state is committed.

- [ ] **Step 3: Update current status without claiming a live deployment**

Add a YY-44 row marked `source implementation planned` until both the bootstrap change set and cost-guardrails workflow complete with protected evidence. Do not claim live budgets, working email delivery, or GPU deployment before that evidence exists.

- [ ] **Step 4: Review the documentation and run repository hygiene checks**

Run:

```bash
rg -n 'yvonne\.yao278@gmail\.com|AWS_BUDGET_ALERT_EMAIL=' .github providers docs || true
git diff --check
git status --short
```

Expected: the real email does not appear in committed source; the secret name appears only where necessary; the working tree shows only intended files.

- [ ] **Step 5: Commit docs and create the review PR**

```bash
git add providers/aws/infra/terraform/envs/cost-guardrails/README.md docs/solutions/yy-44-cost-guardrails-runbook.md docs/practices/current-status.md
git commit -m "docs: add YY-44 cost guardrails runbook"
git push -u origin feature/yy-44-cost-guardrails
gh pr create --base main --head feature/yy-44-cost-guardrails --title "YY-44: add cost guardrails" --body "## Summary\n- Terraform-managed AWS Budgets notification guardrails\n- least-privilege bootstrap permissions\n- protected GitHub Actions delivery path\n\n## Safety\n- no GPU/EKS resources\n- no Budget Actions or automatic deny\n- no destroy mode\n- recipient read only from aws-sandbox Environment secret"
```

## Plan self-review

- **Spec coverage:** Tasks 1–4 cover the two budgets, sensitive email boundary, independent environment, least-privilege bootstrap change, protected workflow, no-destroy/no-action constraints, tests, runbook, and evidence boundary.
- **Scope check:** This plan creates the financial-control foundation only. GPU capacity, Kueue, DCGM, Grafana, inference, and public repository work remain separate Linear tasks.
- **Placeholder scan:** Every task identifies exact paths, commands, resource names, thresholds, and confirmation behaviour; no unfinished markers remain.
- **Consistency:** `AWS_BUDGET_ALERT_EMAIL`, `budget_alert_email`, `cost-guardrails`, `cloudai-platform-sandbox-monthly-cost`, `cloudai-platform-gpu-poc-seven-day-cost`, and `I_UNDERSTAND_COST_GUARDRAILS_APPLY` are used consistently throughout.
