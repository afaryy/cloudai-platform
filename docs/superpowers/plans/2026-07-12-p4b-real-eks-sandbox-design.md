# P4b Real EKS Sandbox Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a design-only real AWS EKS sandbox path that can later become a bounded personal-account deployment.

**Architecture:** This plan documents the real-cloud sequence without deploying anything. It separates the first EKS sandbox from later Bedrock and Bedrock AgentCore work, and keeps private AWS values outside git. Existing readiness and AWS reference docs link to the design as the next real-cloud step.

**Tech Stack:** Markdown, AWS EKS, Terraform, GitHub Actions OIDC, Helm, Argo CD, S3 backend, DynamoDB locking.

## Global Constraints

- Do not run Terraform apply or destroy.
- Do not add account IDs, ARNs, live endpoints, kubeconfig, tfvars, backend files with real names, Terraform state, Terraform plan files, screenshots with account data, credentials, or tokens.
- Keep Bedrock and Bedrock AgentCore out of the first real EKS sandbox slice.
- Keep the first real deployment synthetic-only, manually approved, budgeted, and teardown-friendly.

---

### Task 1: Add Real EKS Sandbox Design

**Files:**
- Create: `docs/p4b-real-eks-sandbox-design.md`

**Interfaces:**
- Consumes: `docs/personal-eks-sandbox-readiness.md` and the existing P4 release-engineering docs.
- Produces: a design reference for the later Terraform and GitHub Actions implementation PR.

- [x] **Step 1: Document deployment sequence**

  Add the sequence:

  ```text
  P4b real EKS sandbox
    -> P4e deploy mock CloudAI API with Helm
    -> P4f optional Argo CD sync and rollback evidence
    -> P2/P6 Bedrock sandbox for governed model access
    -> P6/P7 Bedrock AgentCore exploration
  ```

- [x] **Step 2: Document boundaries**

  Make clear that the first slice is EKS only and excludes Bedrock, AgentCore, real data, long-lived cluster operations, and committed private values.

- [x] **Step 3: Document controls**

  Include GitHub environment approval, private value handling, Terraform shape, cost controls, deployment evidence, teardown evidence, and Bedrock/AgentCore boundaries.

### Task 2: Link Existing Docs

**Files:**
- Modify: `docs/aws-reference-architecture.md`
- Modify: `docs/personal-eks-sandbox-readiness.md`
- Modify: `docs/current-status.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the new `docs/p4b-real-eks-sandbox-design.md`.
- Produces: discoverable navigation from the existing AWS, P4b, current-status, and README docs.

- [x] **Step 1: Add AWS reference link**

  In `docs/aws-reference-architecture.md`, link the real EKS sandbox design from the P4 EKS Sandbox Readiness section.

- [x] **Step 2: Add readiness link**

  In `docs/personal-eks-sandbox-readiness.md`, link the real EKS sandbox design from the Future Apply Decision section.

- [x] **Step 3: Add current status link**

  In `docs/current-status.md`, mention the real EKS design as the next design-only bridge toward a future apply.

- [x] **Step 4: Add README link**

  In `README.md`, add the real EKS sandbox design to the Documentation Guide.

### Task 3: Verify

**Files:**
- Validate Markdown changes with repository checks.

**Interfaces:**
- Consumes: all files changed in this PR.
- Produces: verification evidence before commit and PR.

- [x] **Step 1: Run whitespace check**

  Run:

  ```bash
  git diff --check
  ```

  Expected: no output and exit code 0.

- [x] **Step 2: Search for forbidden private-value examples**

  Run:

  ```bash
  rg -n "arn:aws|[0-9]{12}|AKIA|ASIA|BEGIN .*PRIVATE|kubeconfig|tfstate|tfplan" docs/p4b-real-eks-sandbox-design.md docs/aws-reference-architecture.md docs/personal-eks-sandbox-readiness.md docs/current-status.md README.md
  ```

  Expected: no real secret, account, state, or credential values. Mentions of forbidden file types are acceptable only as "do not commit" guidance.
