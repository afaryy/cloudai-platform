# YY-44 Bootstrap Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover safely from a partially created Budget Guardrails IAM role without ClickOps, then provision the role through protected GitHub Actions and CloudFormation.

**Architecture:** Split Bootstrap into a permissions-only CloudFormation stage and a provisioning stage. A separately confirmed recovery mode may delete only the exact orphaned role after verifying its name and sole expected inline policy; it must stop rather than delete when any check differs.

**Tech Stack:** AWS CloudFormation, AWS IAM, GitHub Actions OIDC, AWS CLI, Ruby Minitest, GitHub protected Environments.

**Spec:** `docs/solutions/yy-44-cost-guardrails-runbook.md`

## Global Constraints

- All infrastructure actions use protected GitHub Actions OIDC; no ClickOps or local AWS credentials.
- A normal Bootstrap apply must never silently delete IAM resources.
- Orphan recovery requires its own exact confirmation and `aws-sandbox` Environment approval.
- Delete only `cloudai-platform-aws-sandbox-budget-guardrails`, only after the defined identity and policy checks pass.
- Do not print role ARN, account ID, Terraform state, alert recipient, or raw AWS policy documents into repository artifacts.
- Use a branch prefix other than `codex/`.

---

### Task 1: Parameterise the two safe CloudFormation stages

**Files:**
- Modify: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml`
- Test: `providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

**Interfaces:**
- Consumes: `CreateBudgetGuardrailsRole` CloudFormation parameter string `true|false`.
- Produces: `CreateBudgetGuardrailsRoleCondition` controlling the role and its ARN output.

- [ ] **Step 1: Write failing assertions**

```ruby
assert_includes template, "CreateBudgetGuardrailsRole:"
assert_includes template, "AllowedValues: [\"true\", \"false\"]"
assert_includes budget_role, "Condition: CreateBudgetGuardrailsRoleCondition"
```

- [ ] **Step 2: Run it to verify failure**

Run: `ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

Expected: failure because the parameter and condition do not exist.

- [ ] **Step 3: Implement the minimum conditional path**

```yaml
CreateBudgetGuardrailsRole:
  Type: String
  Default: "true"
  AllowedValues: ["true", "false"]

Conditions:
  CreateBudgetGuardrailsRoleCondition: !Equals [!Ref CreateBudgetGuardrailsRole, "true"]

GitHubActionsBudgetGuardrailsRole:
  Condition: CreateBudgetGuardrailsRoleCondition
```

Apply the same condition to `BudgetGuardrailsRoleArn`. Keep the Bootstrap role's fixed target-role ARN policy outside this condition so permissions-only mode can prepare it.

- [ ] **Step 4: Verify**

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
git diff --check
```

- [ ] **Step 5: Commit**

```bash
git add providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
git commit -m "feat: stage budget guardrails bootstrap"
```

### Task 2: Add guarded orphan-role recovery workflow mode

**Files:**
- Modify: `.github/workflows/update-aws-bootstrap.yml`
- Modify: `.github/workflows/terraform-tests.yaml`

**Interfaces:**
- Consumes: workflow input `mode=recover-budget-guardrails-orphan` and confirmation `I_UNDERSTAND_BUDGET_GUARDRAILS_ORPHAN_ROLE_RECOVERY`.
- Produces: a sanitized GitHub Step Summary stating `absent`, `recovered`, or `blocked`.

- [ ] **Step 1: Write failing workflow-boundary assertions**

```bash
grep -q 'recover-budget-guardrails-orphan' "$workflow"
grep -q 'I_UNDERSTAND_BUDGET_GUARDRAILS_ORPHAN_ROLE_RECOVERY' "$workflow"
grep -q 'CostGuardrailsTerraformPolicy' "$workflow"
grep -q 'Unexpected orphan role state; refusing deletion' "$workflow"
! grep -q 'aws iam delete-role --role-name .*\*' "$workflow"
```

- [ ] **Step 2: Run the boundary assertion block to verify failure.**

- [ ] **Step 3: Implement the fail-closed recovery step**

It runs only in recovery mode, requires the exact confirmation, treats `NoSuchEntity` as a successful no-op, and refuses deletion unless `list-role-policies` returns exactly `CostGuardrailsTerraformPolicy` while `list-attached-role-policies` is empty. It then deletes that exact inline policy and exact role, writing only `absent`, `recovered`, or `blocked` to `$GITHUB_STEP_SUMMARY`.

- [ ] **Step 4: Verify**

```bash
bash -n .github/workflows/update-aws-bootstrap.yml
git diff --check
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/update-aws-bootstrap.yml .github/workflows/terraform-tests.yaml
git commit -m "feat: add guarded budget role recovery"
```

### Task 3: Document and validate the staged operator path

**Files:**
- Modify: `docs/solutions/yy-44-cost-guardrails-runbook.md`
- Modify: `_private/docs/notes/yy44-bootstrap-cfn-lint-debug-2026-08-23.md`

**Interfaces:**
- Consumes: merged Task 1 and Task 2 workflow modes.
- Produces: exact plan/apply/recovery order and separate confirmation phrases.

- [ ] **Step 1: Document the sequence**

```text
plan permissions-only → explicit Bootstrap apply →
separate orphan-recovery approval (only if validated as orphan) →
plan provision → explicit Bootstrap apply → private Role ARN handoff →
Cost Guardrails validate/plan
```

- [ ] **Step 2: Document no-go conditions**

Unknown inline policies, attached policies, missing expected policy, failed stack status, or an unreviewed Change Set block deletion and require diagnosis.

- [ ] **Step 3: Verify public/private record separation**

```bash
rg -n 'AWS_BUDGET_ALERT_EMAIL=|arn:aws:iam::[0-9]{12}' .github providers docs || true
```

- [ ] **Step 4: Commit**

```bash
git add docs/solutions/yy-44-cost-guardrails-runbook.md
git add -f docs/superpowers/plans/2026-08-23-yy-44-bootstrap-recovery.md
git commit -m "docs: add staged bootstrap recovery runbook"
```

## Self-review

- Task 1 prevents the original parallel IAM-policy race.
- Task 2 contains deletion within an exact-name, exact-policy, no-attached-policy boundary.
- Task 3 records all operator actions and confirmation points without tracking secrets.
- No destructive AWS operation is included in source validation or PR CI.

