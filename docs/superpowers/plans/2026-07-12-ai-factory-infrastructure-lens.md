# AI Factory Infrastructure Lens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a concise AI Factory infrastructure lens that maps NVIDIA AI infrastructure learning into the CloudAI Platform portfolio without adding live GPU, HyperPod, Bedrock, or EKS deployment.

**Architecture:** Keep the update documentation-only. Add one focused public doc for the AI Factory lens, expand the AWS reference architecture AI Factory section, and link the new doc from the README provider reference guide.

**Tech Stack:** Markdown, AWS reference architecture language, CloudAI Platform docs.

## Global Constraints

- Do not add live cloud deployment resources.
- Do not add HyperPod, GPU cluster, Bedrock, Bedrock AgentCore, or model-training Terraform resources.
- Keep examples synthetic and portfolio-safe.
- Do not commit credentials, account identifiers, backend names, kubeconfig, tfvars, tfstate, tfplan, or live endpoints.
- Keep the wording provider-aware, not vendor-locked.

---

### Task 1: Add AI Factory Infrastructure Lens

**Files:**
- Create: `docs/ai-factory-infrastructure-lens.md`

**Interfaces:**
- Consumes: Existing CloudAI Platform phase language from `README.md` and `docs/aws-reference-architecture.md`.
- Produces: A public docs page that explains AI Factory infrastructure as a platform-engineering lens.

- [ ] **Step 1: Create the doc**

Add a document with sections for the thesis, lifecycle, platform responsibilities, inference scaling pressure, and project boundary.

- [ ] **Step 2: Review for boundary safety**

Check that the document does not imply real GPU, HyperPod, provider, or production deployment.

### Task 2: Expand AWS AI Factory Reference

**Files:**
- Modify: `docs/aws-reference-architecture.md`

**Interfaces:**
- Consumes: The existing `AI Factory Operating Model` section.
- Produces: A stronger `AI Factory Infrastructure Lens` section that keeps CDAO and HyperPod as operating-model references.

- [ ] **Step 1: Replace the current AI Factory section**

Expand role ownership into an infrastructure lens that includes lifecycle, platform mapping, inference scaling pressure, and boundaries.

- [ ] **Step 2: Keep P4b scope intact**

Verify that the EKS sandbox remains the only near-term real-cloud path and that HyperPod remains deferred.

### Task 3: Link From README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Existing documentation guide and Track E language.
- Produces: A discoverable link to the new AI Factory infrastructure lens.

- [ ] **Step 1: Add the doc link**

Add `docs/ai-factory-infrastructure-lens.md` to the provider reference or Track E documentation guide area.

- [ ] **Step 2: Lightly refresh Track E**

Mention inference scaling pressure and AI Factory lifecycle without expanding project scope.

### Task 4: Verify

**Files:**
- Validate: changed Markdown files.

**Interfaces:**
- Consumes: Changed docs.
- Produces: Clean diff with no sensitive data or broken local references.

- [ ] **Step 1: Run whitespace check**

Run `git diff --check`.

- [ ] **Step 2: Run sensitive-value scan**

Scan changed files for account identifiers, ARNs, backend names, kubeconfig, endpoints, and credentials.
