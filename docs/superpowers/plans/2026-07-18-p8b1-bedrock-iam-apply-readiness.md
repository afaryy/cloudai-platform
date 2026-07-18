# P8b.1 Bedrock IAM Apply Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public-safe P8b.1 gate that states exactly what must be configured, reviewed, and owned before a separate future workflow can apply the Bedrock IAM boundary.

**Architecture:** This is a documentation-only control gate. A new operator runbook will separate the Terraform execution identity from the later Bedrock smoke-test identity, define protected GitHub environment values and scoped AWS permission families, and block progress when plan, ownership, cost, or evidence requirements are incomplete. Existing P8 documentation will consistently reserve P8c for the later one-prompt smoke test.

**Tech Stack:** Markdown documentation, GitHub Actions YAML wording, Terraform HCL inspection, shell-based documentation and sensitive-content scans.

## Global Constraints

- Do not add `terraform apply`, `terraform destroy`, import, saved plan artifacts, or live AWS inspection.
- Do not change Terraform, CloudFormation, GitHub Actions behaviour, GitHub environment values, IAM permissions, or Bedrock model access.
- Do not add account IDs, role ARNs, OIDC provider ARNs, backend bucket/table names, credentials, Terraform state, plan files, screenshots, raw prompts, or raw responses.
- Retain the mock-first, synthetic-only boundary: no Bedrock invocation, provider adapter, AgentCore, Guardrails, agent runtime, or production deployment.
- Treat `aws-sandbox` as the required protected GitHub environment; long-lived AWS keys remain prohibited.
- Reserve P8c for one later synthetic Bedrock smoke test. P8b.1 is the pre-apply readiness gate, not an apply implementation.

---

## File Structure

- `docs/p8b1-bedrock-iam-apply-readiness.md` becomes the single operator-facing readiness gate: environment contract, permission checklist, reviewers, stop conditions, and handoff.
- `docs/p8a-bedrock-access-readiness.md` retains broad Bedrock access readiness but delegates apply-specific checks to P8b.1 and fixes its P8 sequence.
- `docs/p8-real-bedrock-sandbox-design.md` remains the high-level P8 roadmap and gains the P8b.1 slice in its sequence table.
- `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md` remains the stack-local guide and points to P8b.1 before any future apply work.
- `.github/workflows/terraform-bedrock-sandbox.yml` remains validate/plan-only and points readers to P8b.1 without adding an apply mode.
- `docs/templates/p8a-bedrock-smoke-test-evidence.md` separates IAM apply-readiness/apply evidence from later P8c smoke-test evidence and fixes the P8 label.

### Task 1: Create the P8b.1 Operator Gate

**Files:**
- Create: `docs/p8b1-bedrock-iam-apply-readiness.md`
- Reference: `docs/superpowers/specs/2026-07-18-p8b1-bedrock-iam-apply-readiness-design.md`
- Reference: `.github/workflows/terraform-bedrock-sandbox.yml:25-102`
- Reference: `providers/aws/infra/terraform/envs/bedrock-sandbox/main.tf:1-25`
- Reference: `providers/aws/infra/terraform/modules/bedrock-access/main.tf:1-65`

**Interfaces:**
- Consumes: the current P8b workflow variables `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `TF_BACKEND_BUCKET`, `TF_BACKEND_LOCK_TABLE`, `TF_STATE_KEY_PREFIX`, `AWS_OIDC_PROVIDER_ARN`, and `BEDROCK_ALLOWED_MODEL_ARNS`.
- Produces: the review criteria a later, separately approved apply-workflow design must meet; it does not produce a runnable workflow or an AWS change.

- [ ] **Step 1: Create the runbook boundary and execution sequence**

Create `docs/p8b1-bedrock-iam-apply-readiness.md` with this opening boundary:

```markdown
# P8b.1 Bedrock IAM Apply Readiness

P8b.1 is the documentation-only gate before a separately reviewed workflow may apply the P8b Bedrock IAM boundary. It does not apply Terraform, invoke Bedrock, create credentials, or enable a new GitHub Actions mode.

```text
P8a access readiness
  -> P8b validate/plan-only IAM boundary
  -> P8b.1 apply-readiness gate
  -> separately reviewed manual IAM apply
  -> P8c one synthetic Bedrock smoke test
```
```

State that the Terraform execution role creates the IAM role/policy boundary and the later smoke-test role receives the Bedrock invoke policy. Explicitly state that the execution role does not need Bedrock runtime access for the IAM-only apply.

- [ ] **Step 2: Add the exact GitHub environment contract**

Add a table containing precisely these values and classifications:

| Name | Classification | Rule |
| --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | Secret or protected variable | Never commit the role ARN. |
| `AWS_REGION` | Protected variable | Use only the approved sandbox region. |
| `TF_BACKEND_BUCKET` | Protected variable | Never commit the real bucket name. |
| `TF_BACKEND_LOCK_TABLE` | Protected variable | Never commit the real table name. |
| `TF_STATE_KEY_PREFIX` | Protected variable | Keep the stack prefix generic. |
| `AWS_OIDC_PROVIDER_ARN` | Protected variable | Existing AWS IAM OIDC provider ARN, mapped by the workflow to Terraform's `TF_VAR_github_oidc_provider_arn`. Never commit the provider ARN. |
| `BEDROCK_ALLOWED_MODEL_ARNS` | Secret or protected variable | Store a JSON list of approved model resources only. |

Immediately below the table, document that `TF_STATE_KEY` is derived as `${TF_STATE_KEY_PREFIX}/bedrock-sandbox/terraform.tfstate` and is not separately maintained. Document that `BEDROCK_MODEL_ID` is deferred to P8c and is not an input to P8b IAM apply readiness.

- [ ] **Step 3: Add the scoped AWS permission checklist**

Add separate headings for Terraform backend access, P8b IAM resource management, and explicit exclusions.

Under backend access, list exactly `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, and `dynamodb:DescribeTable`, scoped to the dedicated state resources.

Under IAM resource management, state that the current module creates one IAM role, one customer-managed policy, and one role-policy attachment. List the required action families:

```text
iam:CreateRole
iam:GetRole
iam:UpdateAssumeRolePolicy
iam:DeleteRole
iam:ListRoleTags
iam:TagRole
iam:UntagRole
iam:CreatePolicy
iam:GetPolicy
iam:GetPolicyVersion
iam:CreatePolicyVersion
iam:SetDefaultPolicyVersion
iam:DeletePolicyVersion
iam:DeletePolicy
iam:ListPolicyTags
iam:TagPolicy
iam:UntagPolicy
iam:AttachRolePolicy
iam:DetachRolePolicy
iam:ListAttachedRolePolicies
```

Require mutating IAM actions to be scoped to the P8b naming boundary. Permit only documented, reviewed resource-scoping exceptions; do not accept `Resource: "*"` for P8b IAM mutation by default.

Under explicit exclusions, state that the execution identity must not receive `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, Bedrock administration, `iam:PassRole`, unrelated AWS-service permissions, static AWS credentials, or generic account-administrator access.

- [ ] **Step 4: Add apply gates, stop conditions, and evidence handoff**

Require all of the following before an apply-workflow change can be proposed: P8a complete; protected `aws-sandbox` approval; reviewed GitHub OIDC subject; reviewed fresh plan limited to one role, one policy, and one attachment; named apply and teardown owners; cost boundary; sanitized evidence template; and a future workflow design with confirmation input, concurrency protection, `id-token: write`, least-privilege permissions, and no saved plan artifact.

Add these stop conditions verbatim in meaning: missing/unprotected environment value; unverifiable OIDC identity; unexpected plan resource; broad IAM or `iam:PassRole` requirement; unknown model resource scope; missing cost/evidence/teardown owner; or evidence requiring private values. State that a failure produces only a sanitized readiness record and a narrow correction—never broad IAM grants.

- [ ] **Step 5: Verify the new runbook is internally complete**

Run:

```bash
rg -n "AWS_ROLE_TO_ASSUME|AWS_REGION|TF_BACKEND_BUCKET|TF_BACKEND_LOCK_TABLE|TF_STATE_KEY_PREFIX|AWS_OIDC_PROVIDER_ARN|BEDROCK_ALLOWED_MODEL_ARNS|iam:PassRole|InvokeModel|P8c" docs/p8b1-bedrock-iam-apply-readiness.md
```

Expected: every required environment value appears; the execution role explicitly excludes `iam:PassRole` and Bedrock invoke actions; P8c appears only as the later smoke test.

- [ ] **Step 6: Commit the operator gate**

```bash
git add docs/p8b1-bedrock-iam-apply-readiness.md
git commit -m "docs: add bedrock IAM apply readiness gate"
```

### Task 2: Align P8 Navigation and Evidence Labels

**Files:**
- Modify: `docs/p8a-bedrock-access-readiness.md:45-196`
- Modify: `docs/p8-real-bedrock-sandbox-design.md:55-60`
- Modify: `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md:7-14`
- Modify: `.github/workflows/terraform-bedrock-sandbox.yml:48-52`
- Modify: `docs/templates/p8a-bedrock-smoke-test-evidence.md:1-44`
- Reference: `docs/p8b1-bedrock-iam-apply-readiness.md`

**Interfaces:**
- Consumes: the P8b.1 runbook created in Task 1.
- Produces: one consistent public sequence: P8a readiness → P8b plan-only boundary → P8b.1 apply readiness → separately reviewed apply → P8c smoke test → P8d gateway adapter.

- [ ] **Step 1: Correct P8 terminology in the P8a readiness runbook**

In `docs/p8a-bedrock-access-readiness.md`, replace references that imply P8c is a Terraform apply or P8d is the smoke test. Make the readiness table say “Before P8b/P8b.1/P8c”. Change the evidence-template reference to “when P8c eventually runs a smoke test”. Replace the next-sequence block with:

```text
P8a readiness
  -> P8b Terraform plan for Bedrock IAM boundary
  -> P8b.1 IAM apply-readiness gate
  -> separately reviewed Terraform apply for the IAM boundary
  -> P8c one synthetic Bedrock smoke test
  -> P8d optional gateway adapter
  -> P8e optional Guardrails mapping
```

Link to `docs/p8b1-bedrock-iam-apply-readiness.md` wherever P8a describes readiness before an apply.

- [ ] **Step 2: Add P8b.1 to the high-level P8 design**

In the “Proposed Sub-Slices” table in `docs/p8-real-bedrock-sandbox-design.md`, insert this row between P8b and P8c:

```markdown
| P8b.1: IAM apply readiness | Verify protected environment values, scoped Terraform execution permissions, reviewed plan, owners, evidence, and stop conditions before any apply workflow is introduced. | Public-safe review checklist; no apply and no model invocation. |
```

Leave the P8c smoke-test and P8d gateway-adapter descriptions unchanged.

- [ ] **Step 3: Update stack and workflow guidance without changing behaviour**

In `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md`, replace the P8c apply deferral sentence with a link to P8b.1 and state that apply remains unavailable until a separately reviewed implementation follows the gate.

In `.github/workflows/terraform-bedrock-sandbox.yml`, keep the only options `validate` and `plan`. Replace the last explanatory echo with:

```bash
echo "P8b.1 apply readiness must be complete before any separately reviewed apply workflow is introduced."
```

Do not add an `apply` input, conditional, command, permission, or workflow trigger.

- [ ] **Step 4: Separate evidence labels**

In `docs/templates/p8a-bedrock-smoke-test-evidence.md`:

- change the title to `# P8 Bedrock Apply and Smoke-Test Evidence Template`;
- set Terraform evidence to “Use this section only for future P8b/P8b.1 and separately reviewed IAM apply work”;
- set smoke-test evidence to “Use this section only for future P8c work”;
- preserve the public-safe evidence exclusions and do not add actual values.

- [ ] **Step 5: Verify the sequence and plan-only workflow boundary**

Run:

```bash
rg -n "P8c Terraform apply|P8d.*smoke|P8b\.1|P8c.*smoke" \
  docs/p8a-bedrock-access-readiness.md \
  docs/p8-real-bedrock-sandbox-design.md \
  providers/aws/infra/terraform/envs/bedrock-sandbox/README.md \
  docs/templates/p8a-bedrock-smoke-test-evidence.md

rg -n -- "- apply|terraform apply|mode.*apply" .github/workflows/terraform-bedrock-sandbox.yml
```

Expected: P8b.1 is present in all affected public guides; P8c is only the smoke-test slice; the workflow has no apply mode or apply command.

- [ ] **Step 6: Commit navigation and evidence alignment**

```bash
git add \
  docs/p8a-bedrock-access-readiness.md \
  docs/p8-real-bedrock-sandbox-design.md \
  providers/aws/infra/terraform/envs/bedrock-sandbox/README.md \
  .github/workflows/terraform-bedrock-sandbox.yml \
  docs/templates/p8a-bedrock-smoke-test-evidence.md
git commit -m "docs: align bedrock apply readiness sequence"
```

### Task 3: Run Documentation and Regression Verification

**Files:**
- Verify: `docs/p8b1-bedrock-iam-apply-readiness.md`
- Verify: `docs/p8a-bedrock-access-readiness.md`
- Verify: `docs/p8-real-bedrock-sandbox-design.md`
- Verify: `providers/aws/infra/terraform/envs/bedrock-sandbox/`
- Verify: `.github/workflows/terraform-bedrock-sandbox.yml`

**Interfaces:**
- Consumes: all Task 1 and Task 2 documentation and wording changes.
- Produces: evidence that the readiness gate is documentation-only, references the real P8b variables/resources, and does not regress local validation.

- [ ] **Step 1: Check formatting and private-content boundaries**

Run:

```bash
git diff --check
rg -n -i "(AKIA[0-9A-Z]{16}|aws_secret_access_key|session_token|arn:aws:iam::[0-9]{12}|[0-9]{12})" \
  docs/p8b1-bedrock-iam-apply-readiness.md \
  docs/p8a-bedrock-access-readiness.md \
  docs/p8-real-bedrock-sandbox-design.md \
  providers/aws/infra/terraform/envs/bedrock-sandbox/README.md \
  docs/templates/p8a-bedrock-smoke-test-evidence.md
```

Expected: `git diff --check` exits successfully; the sensitive-content scan emits no matches.

- [ ] **Step 2: Validate the unchanged P8b Terraform boundary**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox validate
terraform -chdir=providers/aws/infra/terraform/envs/bedrock-sandbox test
```

Expected: initialization succeeds without remote state, then Terraform validation and tests pass; no plan or apply is run.

- [ ] **Step 3: Run the API contract regression suite**

Run:

```bash
pnpm --dir providers/aws/app/api test
```

Expected: the existing API contract suite passes with no changed runtime behaviour.

- [ ] **Step 4: Review final scope and commit verification evidence**

Run:

```bash
git status --short
git diff --stat HEAD~2..HEAD
```

Expected: only the P8b.1 runbook and the five planned alignment files are included in the implementation commits; no runtime, Terraform, or apply-workflow code changed.

If a verification command fails, do not create an additional verification commit. Return to the task that owns the failed file, correct that file there, and repeat the relevant verification command before review.
