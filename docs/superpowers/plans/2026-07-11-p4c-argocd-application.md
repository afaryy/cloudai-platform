# P4c Argo CD Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a synthetic-only Argo CD Application pattern for the mock AI API Helm chart.

**Architecture:** P4c extends the existing P4a Helm chart with a GitOps delivery layer. The manifest points to the public Helm chart path, keeps sync manual, uses synthetic labels and annotations, and avoids real cluster URLs, kubeconfig, tokens, or provider credentials.

**Tech Stack:** Argo CD Application CRD YAML, Helm chart, `yq`, `helm template`, Markdown project docs.

## Global Constraints

- Keep the example synthetic-only and mock-first.
- Do not require a real Kubernetes cluster, Argo CD server, AWS account, kubeconfig, token, secret, live endpoint, or Terraform state.
- Do not enable automated sync, prune automation, or namespace creation by default.
- Use labels and annotations to show owner, environment, data scope, cost allocation, and rollback/runbook metadata.
- Validate YAML parsing and Helm rendering locally only.

---

### Task 1: Record Final Local Tooling Status

**Files:**
- Modify: `_private/docs/notes/local-macbook-cloud-platform-tools-2026-07-11.md`

**Interfaces:**
- Consumes: Verified local tool output from Homebrew, Docker, Checkov, Python, Helm, Kubernetes, Terraform, and Argo CD checks.
- Produces: Private reference note for future EKS, Helm, Argo CD, Terraform, Docker, and AWS sandbox work.

- [x] **Step 1: Mark Docker Desktop as verified**

  Add the successful `docker ps` empty-table result and keep AWS CLI v2 as an optional follow-up.

- [x] **Step 2: Confirm the note no longer says Docker is unverified**

  Run: `sed -n '1,220p' _private/docs/notes/local-macbook-cloud-platform-tools-2026-07-11.md`

  Expected: the note includes a `Docker Desktop Check` section with the empty `docker ps` table.

### Task 2: Add Synthetic Argo CD Application

**Files:**
- Delete: `argocd/applications/.gitkeep`
- Create: `argocd/applications/cloudai-api-sandbox.yaml`
- Modify: `argocd/applications/README.md`

**Interfaces:**
- Consumes: Helm chart at `helm/ai-api-service`.
- Produces: Synthetic Argo CD `Application` example for P4c.

- [x] **Step 1: Add application manifest**

  Create `argocd/applications/cloudai-api-sandbox.yaml` with:

  - `repoURL: https://github.com/afaryy/cloudai-platform.git`
  - `targetRevision: main`
  - `path: helm/ai-api-service`
  - `destination.server: https://kubernetes.default.svc`
  - `destination.namespace: cloudai-sandbox`
  - no automated sync block
  - labels for owner, environment, data scope, and cost centre

- [x] **Step 2: Document usage and boundaries**

  Update `argocd/applications/README.md` with local validation commands and public-safe boundaries.

### Task 3: Align P4 Status Docs

**Files:**
- Modify: `docs/ai-release-engineering-on-eks.md`
- Modify: `docs/project/ROADMAP.md`
- Modify: `docs/project/PROGRESS_DASHBOARD.md`
- Modify: `docs/project/BACKLOG.md`
- Modify: `docs/project/status.json`

**Interfaces:**
- Consumes: Existing P4 phase and Track B status.
- Produces: P4 status that reflects P4a Helm and P4c Argo CD examples while keeping real EKS deployment deferred.

- [x] **Step 1: Update P4 current state**

  Mark P4 as `in-progress`, not complete.

- [x] **Step 2: Update Track B progress**

  Reflect that Helm and Argo CD examples exist, while real EKS, live Argo CD, and cloud deployment remain deferred.

### Task 4: Verify

**Files:**
- Validate: `argocd/applications/cloudai-api-sandbox.yaml`
- Validate: `helm/ai-api-service`

**Interfaces:**
- Consumes: Local CLI tools.
- Produces: Evidence that the YAML parses and Helm chart still renders.

- [x] **Step 1: Parse YAML**

  Run:

  ```bash
  yq eval '.' argocd/applications/cloudai-api-sandbox.yaml
  ```

  Expected: YAML prints without parse errors.

- [x] **Step 2: Render Helm chart**

  Run:

  ```bash
  helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox
  ```

  Expected: ConfigMap, ServiceAccount, Service, Deployment, and PodDisruptionBudget render successfully.

- [x] **Step 3: Check git diff**

  Run:

  ```bash
  git diff --stat
  ```

  Expected: only P4c Argo CD docs/manifests, project status docs, and the private tooling note changed.
