# Budget Guardrails Orphan Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale YY-44 draft recovery logic with an isolated, fail-closed GitHub Actions workflow that can inspect and, only after exact confirmation, remove one validated orphan Budget Guardrails IAM role.

**Architecture:** Keep normal Bootstrap plan/apply unchanged. Add a separate workflow with a fixed role name, protected `aws-sandbox` environment, read-only `inspect` mode by default, CloudFormation ownership checks, exact OIDC trust/tag/policy checks, and a separately confirmed `recover` mode. Publish only metadata-safe categories; never accept a caller-supplied role name or use wildcard deletion.

**Tech Stack:** GitHub Actions, AWS CLI through GitHub OIDC, CloudFormation, IAM, jq, YAML contract tests, Markdown runbook.

**Spec:** `docs/solutions/yy-44-cost-guardrails-runbook.md` and the security boundary below.

## Global Constraints

- The workflow must not run a deletion operation in its default mode.
- The only deletion target is the fixed role `cloudai-platform-aws-sandbox-budget-guardrails`.
- A role referenced by the configured CloudFormation stack must never be deleted by this workflow.
- Recovery requires the exact confirmation `I_UNDERSTAND_BUDGET_GUARDRAILS_ORPHAN_ROLE_RECOVERY` and protected `aws-sandbox` approval.
- Trust, tags, inline policies, and attached policies must all match the expected orphan contract; any mismatch fails closed.
- Do not print account IDs, role ARNs, stack IDs, policy documents, credentials, state, or raw AWS output to artifacts or summaries.
- Do not change or destroy live AWS resources while implementing or testing this change.

---

### Task 1: Add the isolated recovery workflow

**Files:**
- Create: `.github/workflows/recover-budget-guardrails-orphan.yml`
- Test: `.github/workflows/terraform-tests.yaml` workflow-boundary job

**Interfaces:**
- Consumes protected `aws-sandbox` variables `AWS_REGION`, `AWS_BOOTSTRAP_ROLE_TO_ASSUME`, and `AWS_BOOTSTRAP_STACK_NAME`.
- Produces inspect/recover workflow modes with metadata-safe summaries and a fixed deletion target.

- [ ] **Step 1: Write the failing boundary assertions**

  Add a `budget_guardrails_orphan_recovery_boundary` job that asserts the workflow contains `workflow_dispatch`, `inspect`, `recover`, the exact confirmation, the fixed role name, CloudFormation ownership checks, IAM trust/tag/policy checks, summary output, and explicit non-wildcard deletion commands. Assert that the workflow does not accept `target_role_name` or contain `AWS_BUDGET_ALERT_EMAIL`.

- [ ] **Step 2: Run the boundary test and verify it fails**

  Run:

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  ```

  Expected result: the new boundary contract fails because the recovery workflow does not yet exist.

- [ ] **Step 3: Implement the workflow contract**

  Define `mode` with `inspect` as the default and `recover` as the only destructive mode. Configure the protected `aws-sandbox` environment and OIDC permissions. Use a fixed shell variable:

  ```bash
  ROLE_NAME="cloudai-platform-aws-sandbox-budget-guardrails"
  EXPECTED_INLINE_POLICY="CostGuardrailsTerraformPolicy"
  ```

  The workflow must:

  1. require the bootstrap role and stack name from protected variables;
  2. inspect CloudFormation resources and refuse recovery when the fixed role is still referenced by the stack;
  3. treat `NoSuchEntity` as an idempotent, no-op `absent` result;
  4. validate the GitHub OIDC subject for `repo:afaryy/cloudai-platform:environment:aws-sandbox`;
  5. require `Project=cloudai-platform`, `Environment=cost-guardrails`, and `ManagedBy=cloudformation` tags;
  6. require exactly one inline policy named `CostGuardrailsTerraformPolicy` and no attached managed policies;
  7. publish only `absent`, `validated`, `blocked`, or `recovered` categories;
  8. require the exact confirmation before `recover` and delete only the fixed role and fixed inline policy.

- [ ] **Step 4: Run the boundary test and verify it passes**

  Run:

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  ```

  Expected result: all existing tests and the new workflow boundary pass.

- [ ] **Step 5: Commit the workflow and boundary**

  ```bash
  git add .github/workflows/recover-budget-guardrails-orphan.yml .github/workflows/terraform-tests.yaml
  git commit -m "feat: add fail-closed Budget Guardrails orphan recovery"
  ```

### Task 2: Document operation and permission boundaries

**Files:**
- Modify: `docs/solutions/yy-44-cost-guardrails-runbook.md`
- Modify: `providers/aws/infra/bootstrap/README.md`

**Interfaces:**
- Consumes the workflow modes and protected inputs from Task 1.
- Produces an operator runbook that separates inspection, recovery approval, and later normal Bootstrap provisioning.

- [ ] **Step 1: Add the inspect-first procedure**

  Document that operators must run `mode=inspect` first, review only the metadata-safe category, and stop when the result is `blocked` or `validated` with any unexpected state.

- [ ] **Step 2: Add the recovery procedure**

  Document the exact confirmation, protected environment review, no-op behavior when the role is absent, and the fact that recovery is not normal Bootstrap apply and does not create a replacement role.

- [ ] **Step 3: Add least-privilege permissions**

  List read permissions needed by inspect (`cloudformation:DescribeStackResources`, `iam:GetRole`, `iam:ListRolePolicies`, `iam:ListAttachedRolePolicies`, `iam:ListRoleTags`) and the two additional delete permissions needed only for recover (`iam:DeleteRolePolicy`, `iam:DeleteRole`). State that permissions must be granted to the dedicated bootstrap/recovery role through the existing reviewed IaC path.

- [ ] **Step 4: Run Markdown and contract tests**

  Run:

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  ```

- [ ] **Step 5: Commit the documentation**

  ```bash
  git add docs/solutions/yy-44-cost-guardrails-runbook.md providers/aws/infra/bootstrap/README.md
  git commit -m "docs: record Budget Guardrails orphan recovery runbook"
  ```

### Task 3: Validate CI and replace the stale draft

**Files:**
- No production files; GitHub PR and Linear YY-44/Cost Guardrails tracking only.

**Interfaces:**
- Consumes the workflow, tests, and runbook from Tasks 1–2.
- Produces a reviewed PR; only after merge may PR #200 be closed as superseded.

- [ ] **Step 1: Run local source checks**

  Run:

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  git diff --check
  ```

- [ ] **Step 2: Push the feature branch and open a PR**

  Use branch `feature/yy-44-orphan-recovery` and explain that the PR replaces, rather than merges, draft #200.

- [ ] **Step 3: Review all GitHub Actions checks**

  Require the workflow-boundary, scope/secret scan, repository, and Terraform checks to pass. Do not dispatch the recovery workflow during CI.

- [ ] **Step 4: Merge only after review**

  Merge the replacement PR into `main` after checks pass. Do not run `mode=recover` as part of merge validation.

- [ ] **Step 5: Close #200 only after the replacement is merged**

  Mark #200 as superseded and close it only after confirming that the new workflow and runbook are present on `main`. Real orphan-role recovery remains a separate future operation requiring the exact confirmation.
