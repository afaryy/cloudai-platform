# P4d Release Gates and Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document a synthetic-only release gates and rollback pattern for the EKS release-engineering track.

**Architecture:** P4d connects the existing Helm chart and Argo CD Application examples to a governed release workflow. The pattern covers pre-deploy gates, rollout observation, rollback choices, failure modes, and audit evidence without requiring a live Kubernetes cluster, AWS account, Argo CD server, or container registry.

**Tech Stack:** Markdown documentation, Helm validation commands, Argo CD concepts, Kubernetes rollout concepts.

## Global Constraints

- Keep the work documentation-only and synthetic-first.
- Do not add a real cluster URL, kubeconfig, Argo CD token, AWS account ID, role ARN, image registry credential, Terraform state, or live endpoint.
- Treat GitHub Actions, Argo CD, Helm, and Kubernetes commands as future sandbox commands unless explicitly marked as local render/lint validation.
- Preserve the distinction between portfolio evidence and later personal AWS sandbox evidence.

---

### Task 1: Add Release Gates and Rollback Doc

**Files:**
- Create: `docs/eks-release-gates-and-rollback.md`

**Interfaces:**
- Consumes: P4a Helm chart and P4c Argo CD Application documentation.
- Produces: A release-engineering runbook for gates, rollout observation, rollback, and failure modes.

- [x] **Step 1: Document gates**

  Include pre-deploy gates for scope, security, policy, cost, and validation.

- [x] **Step 2: Document rollout and rollback**

  Include Argo CD sync, Kubernetes readiness, Helm rollback, Git revert, and teardown boundaries.

### Task 2: Link Existing Docs

**Files:**
- Modify: `docs/ai-release-engineering-on-eks.md`
- Modify: `docs/operations-runbook.md`

**Interfaces:**
- Consumes: New release gates doc.
- Produces: Discoverable P4d references from existing release and operations docs.

- [x] **Step 1: Add the P4d evidence to the EKS release doc**

  Link the release gates and rollback doc from the P4 current state.

- [x] **Step 2: Add release engineering to the operations runbook**

  Point future operators to the P4d doc for Kubernetes/EKS release gates.

### Task 3: Verify

**Files:**
- Validate: `docs/eks-release-gates-and-rollback.md`
- Validate: `docs/ai-release-engineering-on-eks.md`
- Validate: `docs/operations-runbook.md`

**Interfaces:**
- Consumes: Local repo docs and existing tooling.
- Produces: Evidence that docs are linked and existing Helm/API checks still pass.

- [x] **Step 1: Check links and references**

  Run:

  ```bash
  rg -n "eks-release-gates-and-rollback|Release Gates|rollback" docs/eks-release-gates-and-rollback.md docs/ai-release-engineering-on-eks.md docs/operations-runbook.md
  ```

- [x] **Step 2: Re-run P4 validation**

  Run:

  ```bash
  yq eval '.' argocd/applications/cloudai-api-sandbox.yaml
  helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox
  helm lint helm/ai-api-service
  ```

- [x] **Step 3: Re-run API test suite**

  Run:

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  ```

- [x] **Step 4: Check git diff**

  Run:

  ```bash
  git diff --stat
  ```
