# Terraform Static Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Terraform-native tests and a cheap CI workflow that validate all current Terraform code without touching AWS.

**Architecture:** Add `.tftest.hcl` files next to the network module, EKS module, and EKS sandbox environment. Use Terraform mock providers and backend-disabled initialization so tests can run in CI without AWS credentials, remote state, or cloud resources.

**Tech Stack:** Terraform test framework, GitHub Actions, HashiCorp setup-terraform, S3 backend block with runtime backend configuration for manual plan.

## Global Constraints

- Do not commit account IDs, ARNs, real backend names, tfvars, Terraform state, Terraform plans, kubeconfig, live endpoints, credentials, or tokens.
- Terraform tests must not require AWS credentials.
- CI checks must avoid cloud resource creation.
- Keep real `apply` and `destroy` in the manual sandbox workflow disabled until a later approved slice.

---

### Task 1: Add Terraform Module And Environment Tests

**Files:**
- Create: `providers/aws/infra/terraform/modules/network/network.tftest.hcl`
- Create: `providers/aws/infra/terraform/modules/eks/eks.tftest.hcl`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/eks_sandbox.tftest.hcl`

**Interfaces:**
- Consumes: existing Terraform modules and `eks-sandbox` environment.
- Produces: native Terraform tests runnable with `terraform test`.

- [ ] **Step 1: Add failing tests**

Create tests that assert resource shape, tags, defaults, and variable validation.

- [ ] **Step 2: Run tests and inspect failures**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform/modules/network init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/network test
terraform -chdir=providers/aws/infra/terraform/modules/eks init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/eks test
terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox test
```

Expected initial status: tests may expose syntax issues while test files are being written; fix test syntax, not production resources, unless a test reveals an actual Terraform defect.

- [ ] **Step 3: Make tests pass with minimal changes**

Keep production Terraform shape unchanged unless required for valid testing.

### Task 2: Add Cheap Terraform Static CI

**Files:**
- Create: `.github/workflows/terraform-tests.yaml`
- Modify: `providers/aws/infra/terraform/envs/eks-sandbox/README.md`
- Modify: `docs/current-status.md`

**Interfaces:**
- Consumes: Terraform test files from Task 1.
- Produces: CI that runs on Terraform changes without AWS credentials.

- [ ] **Step 1: Add workflow**

Create a workflow with path filters for Terraform and workflow files. Run `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate`, and `terraform test` for each Terraform root.

- [ ] **Step 2: Verify workflow syntax**

Run:

```bash
yq eval '.' .github/workflows/terraform-tests.yaml
```

Expected: YAML prints successfully.

- [ ] **Step 3: Run local verification**

Run the same Terraform commands locally with backend disabled.

Expected: all checks pass without AWS credentials.
