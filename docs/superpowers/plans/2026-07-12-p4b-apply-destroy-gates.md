# P4b Apply Destroy Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable manual Terraform apply and destroy for the optional EKS sandbox with explicit confirmation gates, environment approval, remote backend locking, and public-safe evidence guidance.

**Architecture:** The existing `terraform-eks-sandbox` GitHub Actions workflow remains manual-only and bound to the `aws-sandbox` environment. `validate` stays local-backend only, while `plan`, `apply`, and `destroy` use OIDC, the S3 backend, DynamoDB locking, and the same stack state key. Apply and destroy add exact confirmation inputs before AWS credentials are configured.

**Tech Stack:** GitHub Actions, Terraform, AWS OIDC, S3 backend, DynamoDB locking, Markdown evidence docs.

## Global Constraints

- Do not commit account IDs, ARNs, backend names, tfvars, Terraform state, Terraform plans, kubeconfig, live endpoints, credentials, or tokens.
- Keep the workflow manual through `workflow_dispatch`.
- Keep `aws-sandbox` as the GitHub environment name.
- Keep the first apply/destroy slice limited to Terraform-managed EKS sandbox resources.
- Do not add Helm deploy, Argo CD sync, kubectl, Bedrock, or Bedrock AgentCore operations in this slice.

---

### Task 1: Enable Confirmation-Gated Apply And Destroy

**Files:**
- Modify: `.github/workflows/terraform-eks-sandbox.yml`

**Interfaces:**
- Consumes: existing `mode` workflow input, `aws-sandbox` environment, `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `TF_BACKEND_BUCKET`, `TF_BACKEND_LOCK_TABLE`, and `TF_STATE_KEY_PREFIX`.
- Produces: `apply` mode gated by `confirm_apply=I_UNDERSTAND_COST_AND_TEARDOWN`; `destroy` mode gated by `confirm_destroy=I_UNDERSTAND_DESTROY`.

- [x] **Step 1: Add confirmation inputs**

Add `confirm_apply` and `confirm_destroy` string inputs to the workflow.

- [x] **Step 2: Add confirmation gates before AWS credential configuration**

Fail `apply` unless `confirm_apply` exactly equals `I_UNDERSTAND_COST_AND_TEARDOWN`.

Fail `destroy` unless `confirm_destroy` exactly equals `I_UNDERSTAND_DESTROY`.

- [x] **Step 3: Reuse the remote backend flow for plan, apply, and destroy**

Run AWS credential configuration, backend variable checks, remote backend initialization, and validation for every non-`validate` mode.

- [x] **Step 4: Add apply and destroy commands**

Run `terraform apply -input=false -auto-approve -no-color` for `apply`.

Run `terraform destroy -input=false -auto-approve -no-color` for `destroy`.

### Task 2: Add Public-Safe Evidence Template

**Files:**
- Create: `docs/templates/p4b-eks-sandbox-apply-destroy-evidence.md`

**Interfaces:**
- Consumes: existing P4b sandbox safety boundary.
- Produces: a reusable checklist for sanitized apply and teardown evidence.

- [x] **Step 1: Add evidence sections**

Include run summary, pre-apply evidence, apply evidence, teardown evidence, and notes.

- [x] **Step 2: Add safety exclusions**

Explicitly exclude account IDs, ARNs, backend names, kubeconfig, live endpoints, state, raw command output with identifiers, credentials, and billing details.

### Task 3: Update Sandbox Docs

**Files:**
- Modify: `docs/personal-eks-sandbox-readiness.md`
- Modify: `docs/p4b-real-eks-sandbox-design.md`
- Modify: `providers/aws/infra/terraform/envs/eks-sandbox/README.md`

**Interfaces:**
- Consumes: workflow changes from Task 1 and evidence template from Task 2.
- Produces: consistent docs describing manual apply/destroy gates and future deployment boundaries.

- [x] **Step 1: Document apply and destroy flows**

Show workflow dispatch modes and confirmation phrases.

- [x] **Step 2: Document evidence template usage**

Point readers to `docs/templates/p4b-eks-sandbox-apply-destroy-evidence.md`.

- [x] **Step 3: Preserve later-slice boundaries**

Keep Helm, Argo CD, kubectl, Bedrock, and AgentCore out of this slice.

### Task 4: Verify

**Files:**
- Verify workflow and Terraform paths.

**Interfaces:**
- Consumes: changed workflow, docs, and Terraform root.
- Produces: verification evidence for PR.

- [x] **Step 1: Parse workflow YAML**

Run:

```bash
PATH=/Users/yvonne/.local/bin:/opt/homebrew/bin:$PATH yq eval '.' .github/workflows/terraform-eks-sandbox.yml
```

- [x] **Step 2: Check formatting and Terraform syntax**

Run:

```bash
git diff --check
PATH=/Users/yvonne/.local/bin:/opt/homebrew/bin:$PATH terraform fmt -check -recursive providers/aws/infra/terraform
PATH=/Users/yvonne/.local/bin:/opt/homebrew/bin:$PATH terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox validate
```

- [x] **Step 3: Run Terraform tests**

Run:

```bash
PATH=/Users/yvonne/.local/bin:/opt/homebrew/bin:$PATH terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox test
```

- [x] **Step 4: Run safety scan**

Run a repository scan over changed workflow, docs, and Terraform paths for real account IDs, role ARNs, backend names, access keys, and private keys.

Expected: no real account IDs, role ARNs, backend names, access keys, or private keys in committed files.
