# Private EKS Reference Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a separate private-node EKS reference variant for Enterprise AI and GPU workloads while preserving the existing public-subnet sandbox.

**Architecture:** The new path uses public subnets only for ingress and controlled egress, private subnets for EKS workers and GPU nodes, endpoint-first AWS service access, and a VPC-connected delivery runner for the private EKS API target. The current public sandbox remains a separate low-cost profile.

**Tech Stack:** Terraform, AWS VPC, Amazon EKS, VPC endpoints, IAM OIDC, GitHub Actions, Kubernetes, ECR, Kueue, CloudWatch, OpenTelemetry-compatible evidence.

**Spec:** `docs/superpowers/specs/2026-08-24-private-eks-reference-architecture-design.md`

## Global Constraints

- Do not modify or destroy the existing `cloudai-platform-eks-sandbox` public-subnet environment.
- Use a separate Terraform environment, remote state key, workflow concurrency group, and budget boundary.
- Use Terraform and protected GitHub Actions OIDC only; no clickops resource creation.
- Keep workers and GPU nodes private; public IPs are prohibited for worker capacity.
- Use synthetic data and metadata-safe evidence only.
- Do not add GPU capacity until ordinary private-worker bootstrap and egress validation pass.
- Do not deploy HyperPod, Slurm, a data-centre fabric, or a hyperscale GPU fleet.
- Do not claim implementation until CI evidence proves the relevant runtime path.

---

### Task 1: Finalize topology and cost decision record

**Files:**
- Modify: `docs/superpowers/specs/2026-08-24-private-eks-reference-architecture-design.md`
- Create: `docs/architecture/private-eks-reference-architecture.md`
- Test: documentation contract test covering private-worker and public-sandbox separation

**Interfaces:**
- Consumes: existing EKS sandbox design, YY-47 decision, current cost-guardrail boundaries.
- Produces: approved topology, endpoint matrix, CI reachability model, cost categories and non-goals.

- [ ] **Step 1: Verify the current sandbox boundary**

  Confirm that the current EKS environment remains documented as a low-cost public-subnet sandbox and that its Terraform state key is not reused.

- [ ] **Step 2: Define the private topology**

  Document public ingress/egress subnets, private worker/GPU subnets, endpoint security groups, route tables, private API target, and VPC-connected delivery runner.

- [ ] **Step 3: Define endpoint-first egress**

  Record S3 gateway plus ECR API/DKR, STS, EKS, EC2 and CloudWatch Logs endpoints as the baseline; record NAT as an explicit exception for public dependencies.

- [ ] **Step 4: Define image promotion**

  Require immutable CUDA digest verification and a private ECR mirror when private nodes cannot reach Public ECR through an approved egress path.

- [ ] **Step 5: Define cost gates**

  Separate fixed endpoint/cluster/runner costs from variable node/GPU/transfer/observability costs and require an approved monthly budget before apply.

- [ ] **Step 6: Add a documentation contract test**

  Assert the public-safe documents contain `private`, `controlled egress`, `VPC-connected`, `no public IP`, and `existing public-subnet sandbox` boundaries, and do not claim private runtime completion.

- [ ] **Step 7: Run tests**

  ```bash
  corepack pnpm@11.7.0 --dir providers/aws/app/api test
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add docs/superpowers/specs/2026-08-24-private-eks-reference-architecture-design.md docs/architecture/private-eks-reference-architecture.md
  git commit -m "docs: define private EKS reference architecture"
  ```

### Task 2: Build the separate Terraform private network and EKS environment

**Files:**
- Create: `providers/aws/infra/terraform/envs/eks-private-sandbox/`
- Create: `providers/aws/infra/terraform/modules/private-egress/`
- Modify: `providers/aws/infra/terraform/modules/network/` only where its interface cannot express public/private subnet separation
- Test: Terraform native tests for subnet routes, endpoint policies, public-IP prohibition, and isolated names

**Interfaces:**
- Consumes: Task 1 topology and endpoint matrix.
- Produces: isolated private EKS Terraform environment with a separate state key and deterministic outputs.

- [ ] **Step 1: Create the environment skeleton**

  Add `backend.s3.tf`, `versions.tf`, `providers.tf`, `variables.tf`, `locals.tf`, `main.tf`, `outputs.tf`, `README.md`, and native `.tftest.hcl` files under `envs/eks-private-sandbox`.

- [ ] **Step 2: Define isolated naming and state**

  Use `${TF_STATE_KEY_PREFIX}/eks-private-sandbox/terraform.tfstate` and a name prefix that cannot collide with `eks-sandbox`.

- [ ] **Step 3: Define subnet and route intent**

  Define at least two Availability Zones, public ingress/egress subnet CIDRs, private worker subnet CIDRs, private GPU subnet intent, and private route tables without embedding live account values.

- [ ] **Step 4: Add endpoint controls**

  Create S3 gateway, ECR API/DKR, STS, EKS, EC2 and CloudWatch Logs interface endpoints with endpoint security groups and endpoint policies.

- [ ] **Step 5: Prohibit public worker IPs**

  Add Terraform tests that fail if worker subnets are public or if the node group is configured to assign public IPs.

- [ ] **Step 6: Define private API delivery**

  Configure the private API target and document the VPC-connected runner requirement. Expose only metadata-safe outputs.

- [ ] **Step 7: Run source validation**

  ```bash
  terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox init -backend=false
  terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox fmt -check -recursive
  terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox validate
  terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox test
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add providers/aws/infra/terraform/envs/eks-private-sandbox providers/aws/infra/terraform/modules/private-egress
  git commit -m "feat: add private EKS Terraform environment"
  ```

### Task 3: Add protected CI plan and VPC-connected delivery path

**Files:**
- Create: `.github/workflows/terraform-eks-private-sandbox.yml`
- Create: `.github/workflows/terraform-private-sandbox-tests.yml` when the existing test workflow cannot cover the environment cleanly
- Create: `docs/solutions/eks-private-sandbox-runbook.md`
- Test: workflow contract tests

**Interfaces:**
- Consumes: isolated Terraform environment from Task 2.
- Produces: plan-only CI, protected apply boundary, VPC-connected runner contract, and sanitised evidence.

- [ ] **Step 1: Define modes**

  Support `validate`, `plan`, `preflight`, `apply`, and `stop`; do not add an unreviewed destroy mode.

- [ ] **Step 2: Define protected inputs**

  Require dedicated backend values, role ARN, private-variant budget readiness, runner readiness, endpoint-policy readiness, and exact apply/stop confirmations.

- [ ] **Step 3: Enforce network reachability**

  Run Kubernetes API operations on a VPC-connected self-hosted runner or explicitly documented in-VPC build job. Do not assume GitHub-hosted runner reachability to a private EKS endpoint.

- [ ] **Step 4: Add sanitised evidence**

  Publish only status categories, resource-class labels, route/endpoint checks, bootstrap result, and operator outcome; never publish account IDs, ARNs, endpoints, kubeconfig, state, plans, or raw logs.

- [ ] **Step 5: Validate workflow source**

  Run the repository workflow contract tests and confirm the workflow contains separate state, OIDC, environment protection, no public worker IP, and no raw-output publication checks.

- [ ] **Step 6: Commit**

  ```bash
  git add .github/workflows/terraform-eks-private-sandbox.yml docs/solutions/eks-private-sandbox-runbook.md
  git commit -m "ci: protect private EKS delivery path"
  ```

### Task 4: Validate ordinary private-worker bootstrap before GPU

**Files:**
- Modify: `.github/workflows/terraform-eks-private-sandbox.yml`
- Create: `docs/evidence/templates/eks-private-sandbox-evidence.md`
- Test: CI preflight and metadata-safe validation

**Interfaces:**
- Consumes: Task 3 protected workflow and Task 2 Terraform environment.
- Produces: evidence that private workers bootstrap, pull approved images, and reach required AWS services through the approved egress path.

- [ ] **Step 1: Add preflight checks**

  Check VPC/subnet relationship, private route tables, endpoint state, DNS, role trust, budget readiness, and runner reachability.

- [ ] **Step 2: Add a non-GPU synthetic workload**

  Use a minimal approved image and metadata-only response; do not install AI models or process real data.

- [ ] **Step 3: Verify image access**

  Verify private ECR pull through ECR/S3 endpoints or record the explicitly approved NAT exception.

- [ ] **Step 4: Verify observability**

  Confirm CloudWatch log delivery and retention without publishing raw logs.

- [ ] **Step 5: Produce evidence**

  Capture node bootstrap, image pull, endpoint reachability, workload completion, stop condition, and operator outcome.

- [ ] **Step 6: Stop at the gate**

  Do not add a GPU node group if any ordinary private-worker criterion fails.

- [ ] **Step 7: Commit**

  ```bash
  git add .github/workflows/terraform-eks-private-sandbox.yml docs/evidence/templates/eks-private-sandbox-evidence.md
  git commit -m "test: validate private worker bootstrap"
  ```

### Task 5: Add private GPU and Kueue extension

**Files:**
- Modify: `providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/` or create a private-specific environment after Task 4 review
- Modify: `.github/workflows/terraform-eks-gpu-kueue-poc.yml`
- Modify: `docs/solutions/eks-gpu-kueue-poc-runbook.md`
- Test: GPU/Kueue contract and protected workflow tests

**Interfaces:**
- Consumes: Task 4 private-worker evidence and existing bounded GPU/Kueue contracts.
- Produces: one-node private GPU path with Kueue admission, immutable image promotion, cost guardrails and scale-to-zero.

- [ ] **Step 1: Require private subnet inputs**

  Validate that GPU subnet IDs belong to the private EKS VPC and do not assign public IPs.

- [ ] **Step 2: Require image promotion**

  Use a verified digest-pinned private ECR image or an explicitly approved NAT path; do not silently pull Public ECR from private nodes.

- [ ] **Step 3: Preserve one-node limits**

  Keep `min=0`, `desired=0` outside an approved run, and `max=1`; preserve the exact apply and stop confirmations.

- [ ] **Step 4: Validate Kueue and CUDA completion**

  Capture Ready GPU node, one allocatable GPU, quota reservation, admission, ResourceFlavor, and synthetic CUDA completion.

- [ ] **Step 5: Commit**

  ```bash
  git add providers/aws/infra/terraform/envs/eks-gpu-kueue-poc .github/workflows/terraform-eks-gpu-kueue-poc.yml docs/solutions/eks-gpu-kueue-poc-runbook.md
  git commit -m "feat: extend private EKS path with bounded GPU Kueue"
  ```

### Task 6: Update public architecture, status and portfolio language

**Files:**
- Modify: `docs/architecture/README.md`
- Modify: `docs/practices/current-status.md`
- Modify: `docs/solutions/eks-gpu-kueue-poc-runbook.md`
- Modify: `README.md` or featured solution navigation where appropriate
- Test: documentation contract tests

**Interfaces:**
- Consumes: Tasks 1–5 evidence and explicit implemented-versus-designed status.
- Produces: accurate public-safe architecture and interview language.

- [ ] **Step 1: Label the public sandbox**

  State that it is a cost-constrained development sandbox and not the production target.

- [ ] **Step 2: Publish the private target**

  Link the private reference architecture and show private workers/GPU nodes, controlled egress, endpoints, workload identity, Kueue, observability and FinOps.

- [ ] **Step 3: Correct subnet wording**

  Distinguish the current public-subnet sandbox from the future private-subnet GPU path.

- [ ] **Step 4: Update resume claims only after evidence**

  Use “designed” for the private target until runtime evidence is complete and “validated” only for completed CI evidence.

- [ ] **Step 5: Run tests**

  Run the repository test command and confirm no public document contains account-specific values, raw endpoints, kubeconfig, state, or credentials.

- [ ] **Step 6: Commit**

  ```bash
  git add README.md docs/architecture docs/practices/current-status.md docs/solutions
  git commit -m "docs: distinguish private target from public sandbox"
  ```
