# P8b.3 GitHub OIDC Variable Name Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the P8b Bedrock workflow consume the GitHub-legal `AWS_OIDC_PROVIDER_ARN` environment variable while preserving Terraform's existing internal input.

**Architecture:** The protected `aws-sandbox` GitHub Environment exposes `AWS_OIDC_PROVIDER_ARN`. The workflow maps it into `TF_VAR_github_oidc_provider_arn`, which is already the Terraform stack's input. Static workflow checks prevent the invalid external `GITHUB_OIDC_PROVIDER_ARN` name from returning.

**Tech Stack:** GitHub Actions YAML, shell-based static CI checks, Terraform, Markdown.

## Global Constraints

- The external GitHub Environment input is exactly `AWS_OIDC_PROVIDER_ARN` and is stored as an environment variable.
- Terraform continues receiving exactly `TF_VAR_github_oidc_provider_arn`; do not rename Terraform variables or module interfaces.
- Plan and apply must fail closed before AWS credential configuration when the mapped runtime variable is empty.
- `validate` remains backend-free and adds no AWS or Bedrock dependency.
- Do not add static AWS credentials, change IAM resources, apply Terraform, invoke Bedrock, add a destroy command, or commit account-specific identifiers.

---

### Task 1: Add a regression check for the legal GitHub configuration name

**Files:**
- Modify: `.github/workflows/terraform-tests.yaml:65-77`

**Interfaces:**
- Consumes: `.github/workflows/terraform-bedrock-sandbox.yml`.
- Produces: CI failure if the workflow lacks `AWS_OIDC_PROVIDER_ARN` or restores the invalid GitHub configuration name.

- [ ] **Step 1: Write the failing static check**

Add these lines to `bedrock_workflow_boundary` after the protected-environment assertion:

```bash
grep -q 'vars.AWS_OIDC_PROVIDER_ARN' "$workflow"
! grep -q 'vars.GITHUB_OIDC_PROVIDER_ARN' "$workflow"
! grep -q 'secrets.GITHUB_OIDC_PROVIDER_ARN' "$workflow"
```

- [ ] **Step 2: Run the static check before changing the workflow**

Run:

```bash
workflow=.github/workflows/terraform-bedrock-sandbox.yml
grep -q 'vars.AWS_OIDC_PROVIDER_ARN' "$workflow"
```

Expected: exit status `1`, proving the current workflow does not yet accept the legal GitHub Environment variable.

- [ ] **Step 3: Commit the failing-check change only if repository policy permits red CI commits**

Do not commit an intentionally failing CI state. Keep the test and implementation in the same final commit if the repository requires green commits.

### Task 2: Map the legal GitHub input to Terraform and update the operative runbooks

**Files:**
- Modify: `.github/workflows/terraform-bedrock-sandbox.yml:42`
- Modify: `docs/p8b1-bedrock-iam-apply-readiness.md:24-35`
- Modify: `docs/superpowers/specs/2026-07-18-p8b2-bedrock-iam-apply-workflow-design.md:57-73`
- Modify: `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md:18-27`

**Interfaces:**
- Consumes: GitHub Environment variable `AWS_OIDC_PROVIDER_ARN`.
- Produces: runtime environment variable `TF_VAR_github_oidc_provider_arn` for Terraform.

- [ ] **Step 1: Replace the workflow's invalid external variable reference**

Replace the current assignment:

```yaml
TF_VAR_github_oidc_provider_arn: ${{ vars.GITHUB_OIDC_PROVIDER_ARN || secrets.GITHUB_OIDC_PROVIDER_ARN }}
```

with:

```yaml
TF_VAR_github_oidc_provider_arn: ${{ vars.AWS_OIDC_PROVIDER_ARN }}
```

Do not change the later required-value loop; it correctly checks Terraform's runtime name.

- [ ] **Step 2: Update current user-facing configuration documentation**

In the P8b.1 environment contract, replace the provider row with:

```markdown
| `AWS_OIDC_PROVIDER_ARN` | Protected variable | Existing AWS IAM OIDC provider ARN. GitHub forbids names beginning with `GITHUB_`; the workflow maps this value to Terraform's `TF_VAR_github_oidc_provider_arn`. Never commit the provider ARN. |
```

In the P8b.2 design record, add `AWS_OIDC_PROVIDER_ARN` to the environment list and state that it becomes `TF_VAR_github_oidc_provider_arn` at workflow runtime.

In the Terraform environment README, distinguish the local input name from the GitHub configuration name:

```markdown
For GitHub Actions, set `AWS_OIDC_PROVIDER_ARN` in the protected `aws-sandbox` environment. The workflow maps it to `TF_VAR_github_oidc_provider_arn`. For local use only, provide `TF_VAR_github_oidc_provider_arn` through ignored local configuration.
```

- [ ] **Step 3: Run the regression check and workflow parse check**

Run:

```bash
yq eval '.' .github/workflows/terraform-bedrock-sandbox.yml >/dev/null
workflow=.github/workflows/terraform-bedrock-sandbox.yml
grep -q 'vars.AWS_OIDC_PROVIDER_ARN' "$workflow"
! grep -q 'vars.GITHUB_OIDC_PROVIDER_ARN' "$workflow"
! grep -q 'secrets.GITHUB_OIDC_PROVIDER_ARN' "$workflow"
```

Expected: all commands exit `0`.

- [ ] **Step 4: Extend the committed CI boundary check**

Keep the three static assertions from Task 1 in `.github/workflows/terraform-tests.yaml`, alongside the existing protected-environment and no-Bedrock-invocation assertions.

- [ ] **Step 5: Commit the complete correction**

```bash
git add .github/workflows/terraform-bedrock-sandbox.yml \
  .github/workflows/terraform-tests.yaml \
  docs/p8b1-bedrock-iam-apply-readiness.md \
  docs/superpowers/specs/2026-07-18-p8b2-bedrock-iam-apply-workflow-design.md \
  providers/aws/infra/terraform/envs/bedrock-sandbox/README.md
git commit -m "fix: use legal OIDC environment variable name"
```

### Task 3: Verify the unchanged Terraform and safety boundaries

**Files:**
- Verify: `.github/workflows/terraform-bedrock-sandbox.yml`
- Verify: `.github/workflows/terraform-tests.yaml`
- Verify: `providers/aws/infra/terraform/envs/bedrock-sandbox/`

**Interfaces:**
- Consumes: completed workflow, static checks, and unchanged Bedrock Terraform stack.
- Produces: evidence that the naming correction preserves the P8b no-invocation and no-destroy boundary.

- [ ] **Step 1: Run Terraform formatting and stack tests**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox validate
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox test
```

Expected: formatting succeeds and Terraform reports `1 passed, 0 failed`.

- [ ] **Step 2: Run the full static workflow boundary command**

Run the exact `Check manual Bedrock IAM apply boundary` shell block from `.github/workflows/terraform-tests.yaml`, including the new OIDC assertions.

Expected: exit status `0`; no `terraform destroy`, `bedrock:InvokeModel`, or `aws bedrock` string is present.

- [ ] **Step 3: Review changed files for unsafe content**

Run:

```bash
git diff --check main...HEAD
rg -n 'GITHUB_OIDC_PROVIDER_ARN|terraform destroy|bedrock:InvokeModel|aws bedrock' \
  .github/workflows/terraform-bedrock-sandbox.yml \
  .github/workflows/terraform-tests.yaml \
  docs/p8b1-bedrock-iam-apply-readiness.md \
  docs/superpowers/specs/2026-07-18-p8b2-bedrock-iam-apply-workflow-design.md \
  providers/aws/infra/terraform/envs/bedrock-sandbox/README.md
```

Expected: the invalid GitHub configuration name appears nowhere in operative workflow/configuration documentation; forbidden workflow commands produce no matches.

- [ ] **Step 4: Confirm worktree status**

Run:

```bash
git status --short --branch
```

Expected: clean `feature/p8b3-oidc-variable-name-fix` branch after the implementation commit.
