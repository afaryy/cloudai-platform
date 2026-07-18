# P8b.2 Bedrock IAM Apply Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirmation-gated manual apply mode to the existing Bedrock Terraform workflow without enabling Bedrock invocation or destroy.

**Architecture:** The existing `workflow_dispatch` workflow keeps `validate` and `plan`, and gains `apply` behind the protected `aws-sandbox` environment and the exact confirmation phrase. Apply reuses OIDC and remote-backend setup, runs a fresh unsaved plan, then applies the existing IAM-only stack. Static CI asserts that this boundary cannot drift.

**Tech Stack:** GitHub Actions YAML, Terraform CLI, shell static checks, Markdown.

## Global Constraints

- No automatic trigger, destroy mode, model invocation, Bedrock SDK/CLI, prompt, response, adapter, or runtime change.
- Apply requires `confirm_apply=I_UNDERSTAND_BEDROCK_IAM_APPLY`, `aws-sandbox` approval, all existing P8b environment values, OIDC, validation, and a fresh unsaved plan.
- Keep `contents: read`, `id-token: write`, the existing concurrency group, state key, and remote backend configuration.
- Do not commit account IDs, ARNs, backend identifiers, credentials, state/plan artifacts, raw plan output, prompts, or responses.

---

### Task 1: Add the confirmation-gated apply path

**Files:**
- Modify: `.github/workflows/terraform-bedrock-sandbox.yml:4-100`

- [ ] **Step 1: Establish the failing boundary scan**

Run before changing the workflow:

```bash
rg -n "I_UNDERSTAND_BEDROCK_IAM_APPLY|terraform apply|inputs.mode == 'apply'" .github/workflows/terraform-bedrock-sandbox.yml
```

Expected: no matches.

- [ ] **Step 2: Add the dispatch input and confirmation gate**

Add `apply` to `inputs.mode.options`, then add:

```yaml
      confirm_apply:
        description: "For apply only, type I_UNDERSTAND_BEDROCK_IAM_APPLY"
        required: false
        default: ""
        type: string
```

Add an apply-only shell step before credential configuration that exports `CONFIRM_APPLY: ${{ inputs.confirm_apply }}`, exits unless it exactly equals `I_UNDERSTAND_BEDROCK_IAM_APPLY`, and says no AWS credentials are configured on rejection.

- [ ] **Step 3: Reuse remote-operation setup**

Change the existing `plan` conditions on backend-variable checking, OIDC credential configuration, remote `terraform init`, and remote `terraform validate` to:

```yaml
if: ${{ inputs.mode != 'validate' }}
```

Preserve the existing required-variable list, masked OIDC configuration, and local `validate` path.

- [ ] **Step 4: Add fresh plan then apply**

Keep the plan-only command. Add:

```yaml
      - name: Terraform plan before Bedrock IAM apply
        if: ${{ inputs.mode == 'apply' }}
        run: terraform plan -input=false -no-color

      - name: Terraform apply Bedrock IAM boundary
        if: ${{ inputs.mode == 'apply' }}
        run: |
          echo "Applying only the P8b IAM role, policy, and attachment."
          echo "Do not commit account identifiers, role ARNs, backend values, or raw plan output."
          terraform apply -input=false -auto-approve -no-color
```

Do not add `destroy`, `bedrock:InvokeModel`, `aws bedrock`, or saved plan output.

- [ ] **Step 5: Verify and commit**

Run:

```bash
rg -n "workflow_dispatch|I_UNDERSTAND_BEDROCK_IAM_APPLY|inputs.mode != 'validate'|Terraform plan before Bedrock IAM apply|terraform apply|destroy|InvokeModel|aws bedrock" .github/workflows/terraform-bedrock-sandbox.yml
git add .github/workflows/terraform-bedrock-sandbox.yml
git commit -m "feat: add confirmed bedrock IAM apply workflow"
```

Expected: required apply controls appear; `destroy`, `InvokeModel`, and `aws bedrock` have no matches.

### Task 2: Add static workflow-boundary CI

**Files:**
- Modify: `.github/workflows/terraform-tests.yaml:4-49`

- [ ] **Step 1: Extend path filters**

Add `.github/workflows/terraform-bedrock-sandbox.yml` to both existing `paths` lists.

- [ ] **Step 2: Add a boundary job**

Add this job after the Terraform matrix:

```yaml
  bedrock_workflow_boundary:
    name: Bedrock apply workflow boundary
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Check manual Bedrock IAM apply boundary
        run: |
          workflow=.github/workflows/terraform-bedrock-sandbox.yml
          grep -q 'workflow_dispatch:' "$workflow"
          grep -q -- '- apply' "$workflow"
          grep -q 'I_UNDERSTAND_BEDROCK_IAM_APPLY' "$workflow"
          grep -q 'environment: aws-sandbox' "$workflow"
          grep -q 'id-token: write' "$workflow"
          grep -q "inputs.mode == 'apply'" "$workflow"
          grep -q 'Terraform plan before Bedrock IAM apply' "$workflow"
          grep -q 'terraform apply -input=false -auto-approve -no-color' "$workflow"
          ! grep -q 'terraform destroy' "$workflow"
          ! grep -q 'bedrock:InvokeModel' "$workflow"
          ! grep -q 'aws bedrock' "$workflow"
```

- [ ] **Step 3: Verify and commit**

Run:

```bash
yq eval '.' .github/workflows/terraform-tests.yaml >/dev/null
git add .github/workflows/terraform-tests.yaml
git commit -m "test: guard bedrock IAM apply workflow"
```

Expected: YAML parses successfully.

### Task 3: Align P8 documents and evidence

**Files:**
- Modify: `docs/p8b1-bedrock-iam-apply-readiness.md`
- Modify: `docs/p8a-bedrock-access-readiness.md`
- Modify: `docs/p8-real-bedrock-sandbox-design.md`
- Modify: `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md`
- Modify: `docs/templates/p8a-bedrock-smoke-test-evidence.md`

- [ ] **Step 1: Document P8b.2**

State that P8b.2 extends the existing manual workflow, requires `I_UNDERSTAND_BEDROCK_IAM_APPLY`, runs a fresh plan before apply, has no destroy mode, and does not invoke Bedrock.

- [ ] **Step 2: Align the sequence and evidence**

Use this sequence everywhere:

```text
P8a readiness -> P8b plan boundary -> P8b.1 apply readiness -> P8b.2 confirmed IAM apply -> P8c synthetic smoke test
```

Set the evidence-template Run Summary mode options to `readiness`, `plan`, `apply`, or `smoke-test`. Add apply-only checks for confirmation, environment approval, OIDC assumption, fresh plan, and IAM apply; preserve every exclusion.

- [ ] **Step 3: Verify and commit**

Run:

```bash
rg -n "P8b\.2|I_UNDERSTAND_BEDROCK_IAM_APPLY|P8c.*smoke|destroy|InvokeModel|raw plan" docs/p8b1-bedrock-iam-apply-readiness.md docs/p8a-bedrock-access-readiness.md docs/p8-real-bedrock-sandbox-design.md providers/aws/infra/terraform/envs/bedrock-sandbox/README.md docs/templates/p8a-bedrock-smoke-test-evidence.md
git add docs/p8b1-bedrock-iam-apply-readiness.md docs/p8a-bedrock-access-readiness.md docs/p8-real-bedrock-sandbox-design.md providers/aws/infra/terraform/envs/bedrock-sandbox/README.md docs/templates/p8a-bedrock-smoke-test-evidence.md
git commit -m "docs: document confirmed bedrock IAM apply"
```

Expected: P8b.2 and the confirmation phrase are documented; P8c remains the smoke test.

### Task 4: Full verification

- [ ] **Step 1: Run boundary and formatting checks**

```bash
git diff --check HEAD~3..HEAD
rg -n -i "(AKIA[0-9A-Z]{16}|aws_secret_access_key|session_token|arn:aws:iam::[0-9]{12}|[0-9]{12})" .github/workflows/terraform-bedrock-sandbox.yml docs/p8b1-bedrock-iam-apply-readiness.md docs/p8a-bedrock-access-readiness.md docs/p8-real-bedrock-sandbox-design.md providers/aws/infra/terraform/envs/bedrock-sandbox/README.md docs/templates/p8a-bedrock-smoke-test-evidence.md
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox validate
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox test
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

Expected: formatting succeeds, sensitive-content scan has no matches, Terraform validation/tests and all API tests pass, and no local plan/apply runs.
