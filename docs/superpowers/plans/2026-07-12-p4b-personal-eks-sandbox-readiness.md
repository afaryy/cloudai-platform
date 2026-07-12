# P4b Personal EKS Sandbox Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the P4b readiness boundary for an optional personal AWS EKS sandbox without enabling live apply by default.

**Architecture:** This is a documentation and guardrail slice. It connects the existing CloudFormation bootstrap, Terraform backend example, manual GitHub Actions workflow, Helm chart, Argo CD pattern, and release gates into one public-safe sandbox readiness story.

**Tech Stack:** Markdown documentation, `.gitignore`, Terraform placeholder files, GitHub Actions workflow documentation.

## Global Constraints

- Do not add real AWS account IDs, role ARNs, backend bucket names, tfvars, state, plan files, kubeconfig, credentials, or live endpoints.
- Do not add `terraform apply`, `terraform destroy`, Helm deploy, Argo CD sync, kubectl, or real cloud deployment.
- Keep the sandbox optional, synthetic-only, manually approved, budgeted, and teardown-oriented.
- Use GitHub Actions OIDC and GitHub environment approval as the preferred future delivery plane.

---

### Task 1: Add P4b Readiness Pack

**Files:**
- Create: `docs/personal-eks-sandbox-readiness.md`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `docs/ai-release-engineering-on-eks.md`
- Modify: `docs/current-status.md`
- Modify: `docs/cloudai-platform-solution-walkthrough.md`
- Modify: `docs/demo-script.md`
- Modify: `providers/aws/infra/terraform/envs/eks-sandbox/README.md`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/.terraform.lock.hcl`

- [x] **Step 1: Add readiness documentation**

Create a P4b doc covering boundary, architecture, existing evidence, readiness checklist, GitHub Actions flow, budget and cleanup rules, future apply decision, and interview language.

- [x] **Step 2: Strengthen ignored sandbox artifacts**

Add ignore rules for private Terraform backend, tfvars, and kubeconfig files.

- [x] **Step 3: Refresh project navigation and status**

Link P4b from README, release docs, current status, walkthrough, demo script, and Terraform environment README.

- [x] **Step 4: Verify**

Run documentation/reference scans and relevant local validation commands.
