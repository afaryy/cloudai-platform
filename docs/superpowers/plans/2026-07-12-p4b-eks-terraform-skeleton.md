# P4b EKS Terraform Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validate-only Terraform skeleton for a future personal AWS EKS sandbox.

**Architecture:** The skeleton introduces small `network` and `eks` modules plus an `eks-sandbox` environment that wires them together. It keeps the first cloud implementation EKS-only, excludes Bedrock and Bedrock AgentCore, avoids NAT by default, and leaves real apply/destroy guarded behind explicit future approval. The GitHub Actions workflow exposes `apply` and `destroy` choices but fails safely until private backend, budget, and teardown controls are confirmed.

**Tech Stack:** Terraform, AWS provider, Amazon VPC, Amazon EKS, IAM, GitHub Actions, Markdown.

## Global Constraints

- Do not run Terraform apply or destroy.
- Do not add Bedrock or Bedrock AgentCore resources.
- Do not commit account IDs, ARNs, backend names, tfvars, Terraform state, Terraform plans, kubeconfig, live endpoints, credentials, or tokens.
- Keep the default workflow validate-only unless a later PR explicitly enables real apply/destroy.
- Use synthetic-only tags and portfolio-safe names.

---

### Task 1: Add Network Module

**Files:**
- Create: `providers/aws/infra/terraform/modules/network/main.tf`
- Create: `providers/aws/infra/terraform/modules/network/variables.tf`
- Create: `providers/aws/infra/terraform/modules/network/outputs.tf`

**Interfaces:**
- Consumes: `name_prefix`, `vpc_cidr`, `public_subnet_cidrs`, `availability_zones`, and `tags`.
- Produces: `vpc_id` and `public_subnet_ids`.

- [x] **Step 1: Add VPC and public subnet resources**

  Create a no-NAT VPC module with internet gateway, public route table, and public subnet associations.

- [x] **Step 2: Add variables and outputs**

  Expose only the values required by the EKS environment.

### Task 2: Add EKS Module

**Files:**
- Create: `providers/aws/infra/terraform/modules/eks/main.tf`
- Create: `providers/aws/infra/terraform/modules/eks/variables.tf`
- Create: `providers/aws/infra/terraform/modules/eks/outputs.tf`

**Interfaces:**
- Consumes: `cluster_name`, `subnet_ids`, `kubernetes_version`, node group sizing, endpoint CIDRs, and tags.
- Produces: cluster name, endpoint, certificate authority data, and node group name.

- [x] **Step 1: Add IAM roles and policy attachments**

  Add minimal cluster and node group IAM roles using AWS managed EKS policies.

- [x] **Step 2: Add EKS cluster and managed node group**

  Add a small managed node group with default desired/min/max size of 1.

### Task 3: Wire EKS Sandbox Environment

**Files:**
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/main.tf`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/variables.tf`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/outputs.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-sandbox/versions.tf`

**Interfaces:**
- Consumes: network and EKS modules.
- Produces: a validate-only environment ready for private backend and future plan/apply.

- [x] **Step 1: Add environment locals and module calls**

  Wire the network and EKS modules with safe defaults and synthetic-only tags.

- [x] **Step 2: Parameterize AWS region**

  Use `var.aws_region` in the provider while keeping `ap-southeast-2` as default.

### Task 4: Guard Workflow Apply And Destroy

**Files:**
- Modify: `.github/workflows/terraform-eks-sandbox.yml`

**Interfaces:**
- Consumes: existing manual workflow.
- Produces: visible `apply` and `destroy` modes that fail safely until a later enablement PR.

- [x] **Step 1: Add apply/destroy options**

  Extend `workflow_dispatch.inputs.mode.options` with `apply` and `destroy`.

- [x] **Step 2: Add refusal step**

  Add a step that exits non-zero for `apply` or `destroy` with a clear message explaining the private prerequisites.

### Task 5: Refresh Docs

**Files:**
- Modify: `providers/aws/infra/terraform/envs/eks-sandbox/README.md`
- Modify: `docs/p4b-real-eks-sandbox-design.md`
- Modify: `docs/current-status.md`

**Interfaces:**
- Consumes: Terraform skeleton and workflow changes.
- Produces: documentation that explains validate-only skeleton status and future apply boundary.

- [x] **Step 1: Update environment README**

  Document module layout, validate command, safe defaults, and future enablement gates.

- [x] **Step 2: Update design and status docs**

  Mention that the next implementation skeleton exists while live apply remains deferred.

### Task 6: Verify

**Files:**
- Validate changed Terraform, workflow, and docs.

**Interfaces:**
- Consumes: all changed files.
- Produces: verification evidence for PR review.

- [x] **Step 1: Run Terraform format check**

  Run:

  ```bash
  terraform fmt -check -recursive providers/aws/infra/terraform
  ```

- [x] **Step 2: Run Terraform validate**

  Run:

  ```bash
  terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox init -backend=false
  terraform -chdir=providers/aws/infra/terraform/envs/eks-sandbox validate
  ```

- [x] **Step 3: Validate workflow YAML**

  Run:

  ```bash
  yq eval '.' .github/workflows/terraform-eks-sandbox.yml
  ```

- [x] **Step 4: Run safety scan**

  Run:

  ```bash
  rg -n "arn:aws|[0-9]{12}|AKIA|ASIA|BEGIN .*PRIVATE|kubeconfig|tfstate|tfplan" .github/workflows/terraform-eks-sandbox.yml providers/aws/infra/terraform docs/p4b-real-eks-sandbox-design.md docs/current-status.md
  ```

  Expected: no real secrets, account IDs, ARNs, state, plans, or kubeconfig values. Mentions of forbidden file types are acceptable only as "do not commit" guidance.
