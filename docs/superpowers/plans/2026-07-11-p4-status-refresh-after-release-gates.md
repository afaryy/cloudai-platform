# P4 Status Refresh After Release Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh tracked public status docs after P4d release gates and rollback documentation merged.

**Architecture:** This is a documentation alignment slice. It updates public readme/status wording so P4a Helm, P4c Argo CD, and P4d release gates are represented as current evidence while P4b real EKS sandbox remains explicitly deferred.

**Tech Stack:** Markdown documentation, existing Helm/Argo validation commands, existing TypeScript mock API tests.

## Global Constraints

- Do not add cloud deployment, live provider calls, kubeconfig, secrets, account IDs, role ARNs, Terraform state, plans, or `.tfvars`.
- Keep P4 real EKS sandbox work explicitly opt-in.
- Keep the validation command aligned with the package-pinned pnpm version: `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

---

### Task 1: Refresh README P4 Status

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: P4a/P4c/P4d tracked docs and manifests.
- Produces: Accurate Track B summary for repo visitors.

- [x] **Step 1: Replace placeholder wording**

  Update Track B current scope so it lists the Helm chart, Argo CD Application, release gates/rollback pattern, and deferred EKS sandbox.

### Task 2: Refresh Current Status

**Files:**
- Modify: `docs/current-status.md`

**Interfaces:**
- Consumes: Current P4 docs.
- Produces: Accurate current status and recommended next-slice wording.

- [x] **Step 1: Add P4 evidence**

  Add P4a, P4c, and P4d to the current evidence list and completed table.

- [x] **Step 2: Update recommended next slice**

  Make P4b optional personal EKS sandbox and P5 AI-assisted DevSecOps the next choices; remove stale "Later P4d" wording.

### Task 3: Verify

**Files:**
- Validate: `README.md`
- Validate: `docs/current-status.md`

**Interfaces:**
- Consumes: Local validation tools.
- Produces: Evidence that docs reference the current P4 artifacts and existing validations still pass.

- [x] **Step 1: Check updated references**

  Run:

  ```bash
  rg -n "P4a|P4b|P4c|P4d|eks-release-gates-and-rollback|corepack pnpm@11.7.0" README.md docs/current-status.md
  ```

- [x] **Step 2: Re-run P4 validation**

  Run:

  ```bash
  yq eval '.' argocd/applications/cloudai-api-sandbox.yaml
  helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox
  helm lint helm/ai-api-service
  ```

- [x] **Step 3: Re-run API tests**

  Run:

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  ```
