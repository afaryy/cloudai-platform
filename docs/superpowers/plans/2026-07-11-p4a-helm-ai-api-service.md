# P4a Helm AI API Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a synthetic-only Helm chart that packages the mock AI API service for Kubernetes release-engineering evidence without requiring AWS or a live EKS cluster.

**Architecture:** The chart models a Kubernetes Deployment, Service, ConfigMap, and optional PodDisruptionBudget for the mock API. It uses values-driven labels and configuration to demonstrate platform ownership, data scope, cost metadata, probes, resource boundaries, and rollback-friendly release settings.

**Tech Stack:** Helm chart YAML/templates, Kubernetes Deployment/Service/ConfigMap/PodDisruptionBudget, Markdown docs, local static checks.

## Global Constraints

- No real AWS account, EKS cluster, kubeconfig, image pull secret, live endpoint, provider credential, or production workload is required.
- The chart defaults to synthetic-only mock mode.
- The chart must not add Kubernetes Secrets.
- The chart must include readiness and liveness probes on `/health`.
- The chart must include resource requests and limits.
- Helm CLI is not available in the current local environment, so static validation is required and Helm validation is documented for local/CI use when installed.

---

### Task 1: Chart Skeleton

**Files:**
- Create: `helm/ai-api-service/Chart.yaml`
- Create: `helm/ai-api-service/values.yaml`
- Create: `helm/ai-api-service/templates/_helpers.tpl`

**Interfaces:**
- Consumes: existing `helm/ai-api-service/README.md`.
- Produces: chart metadata, values API, and helper names used by all chart templates.

- [ ] **Step 1: Add chart metadata**
- [ ] **Step 2: Add values for image, service, probes, resources, labels, config, and PDB**
- [ ] **Step 3: Add helper template names for chart labels and fullname**

### Task 2: Kubernetes Templates

**Files:**
- Create: `helm/ai-api-service/templates/configmap.yaml`
- Create: `helm/ai-api-service/templates/deployment.yaml`
- Create: `helm/ai-api-service/templates/service.yaml`
- Create: `helm/ai-api-service/templates/pdb.yaml`

**Interfaces:**
- Consumes: values and helpers from Task 1.
- Produces: Kubernetes release manifests for mock API service.

- [ ] **Step 1: Add ConfigMap with mock-mode environment**
- [ ] **Step 2: Add Deployment with labels, probes, resources, security context, and config env**
- [ ] **Step 3: Add Service for port 3000**
- [ ] **Step 4: Add optional PDB gated by values**

### Task 3: Documentation

**Files:**
- Modify: `helm/ai-api-service/README.md`
- Modify: `docs/ai-release-engineering-on-eks.md`
- Modify: `docs/current-status.md`

**Interfaces:**
- Consumes: chart files and P4a roadmap.
- Produces: portfolio explanation and next-step boundaries.

- [ ] **Step 1: Document chart contents and commands**
- [ ] **Step 2: Fix remaining P4 table wording to synthetic-only**
- [ ] **Step 3: Update current status to say P4a chart exists**

### Task 4: Verification

**Files:**
- All changed files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verified PR branch.

- [ ] **Step 1: Run static YAML and text checks**
- [ ] **Step 2: Run Python RAG tests**
- [ ] **Step 3: Run API tests**
- [ ] **Step 4: Note that Helm CLI is unavailable if `helm lint` cannot run**
