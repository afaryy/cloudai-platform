# YY-44 Read-Only GPU Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a protected, read-only GitHub Actions discovery mode that identifies the existing EKS sandbox subnets, compares approved GPU instance offerings/quota, and records the reviewed CUDA/Kueue input contract without enabling GPU capacity.

**Architecture:** Extend the existing `terraform-eks-gpu-kueue-poc` workflow with a `discover` mode that requires only the existing AWS OIDC/backend environment boundary, not GPU variables or budget readiness. The mode queries the existing EKS control plane and EC2 metadata, emits only sanitised boolean/category evidence plus a private operator handoff for candidate values, and exits before Terraform backend initialization or any apply/stop path.

**Tech Stack:** GitHub Actions, AWS CLI, OIDC, EKS, EC2 Service Quotas, jq, Terraform workflow boundary tests.

**Spec:** `docs/solutions/eks-gpu-kueue-poc-runbook.md`

## Global Constraints

- Discovery is read-only and must not create, update, scale, stop, or delete AWS resources.
- Discovery must not request quota increases or select a fallback instance type automatically.
- GPU remote operations remain blocked until `GPU_POC_BUDGET_ALERT_CONFIGURED=true` and all reviewed environment values exist.
- Current GPU POC remains attached to the existing public-subnet EKS sandbox; private-subnet runtime migration remains a separate target.
- Do not publish account IDs, ARNs, kubeconfig, endpoints, raw Terraform plans, raw cloud output, or credentials as artifacts.
- Use `feature/yy-44-*` branch naming; merge only after all protected CI checks pass.

---

### Task 1: Add failing workflow-boundary assertions for discovery

**Files:**
- Modify: `.github/workflows/terraform-tests.yaml: GPU Kueue workflow boundary job`

**Interfaces:**
- Consumes: `.github/workflows/terraform-eks-gpu-kueue-poc.yml`
- Produces: static assertions requiring `discover`, no-capacity guardrails, and sanitised evidence.

- [ ] **Step 1: Add assertions that initially fail**

Add checks for:

```bash
grep -q -- '- discover' "$workflow"
grep -q "inputs.mode == 'discover'" "$workflow"
grep -q 'Discovery is read-only' "$workflow"
grep -q 'GPU discovery evidence' "$workflow"
! grep -q 'terraform apply' "$workflow" # within the discovery guard is validated by an explicit no-discover condition
```

- [ ] **Step 2: Run the focused boundary job locally**

Run the equivalent shell assertions against the current workflow. Expected: fail because `discover` does not yet exist.

### Task 2: Implement read-only discovery mode

**Files:**
- Modify: `.github/workflows/terraform-eks-gpu-kueue-poc.yml`

**Interfaces:**
- Consumes: existing `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `EKS_CLUSTER_NAME`, and OIDC environment boundary.
- Produces: `discover` workflow mode and private summary/evidence for operator review.

- [ ] **Step 1: Add `discover` as a workflow choice**

Add `discover` before `preflight` and make the input description explicit that it performs no Terraform or capacity operation.

- [ ] **Step 2: Separate discovery prerequisites from GPU-operation prerequisites**

Require only AWS role and region for discovery. Keep backend, budget, instance, subnet, image, and Kueue checks for `preflight`, `plan`, `apply`, `validate`, and `stop` as appropriate.

- [ ] **Step 3: Skip Terraform initialization for discovery**

Guard backend initialization and Terraform steps with `inputs.mode != 'validate' && inputs.mode != 'discover'`.

- [ ] **Step 4: Add the read-only discovery step**

Query:

```bash
aws eks describe-cluster --name "$EKS_CLUSTER_NAME"
aws service-quotas list-service-quotas --service-code ec2
aws ec2 describe-subnets --subnet-ids <cluster subnet IDs>
aws ec2 describe-instance-type-offerings --location-type availability-zone --filters "Name=instance-type,Values=g4dn.xlarge,g5.xlarge"
```

The step must:

- verify the EKS cluster is `ACTIVE`;
- identify the existing cluster subnet IDs and AZs;
- compare `g4dn.xlarge` and `g5.xlarge` offerings in every cluster AZ;
- report the selected-family quota value without requesting a quota increase;
- record `kueue_chart_version_recommended=0.11.0` from the repository contract;
- record that the CUDA image must be an official digest-pinned reference, without inventing a digest;
- write a private operator handoff summary containing candidate subnet IDs and availability categories, while uploading only sanitised boolean/category JSON as an artifact;
- never invoke Terraform, Helm, kubectl, node-group scaling, or quota mutation.

- [ ] **Step 5: Add explicit no-capacity guards**

Add a shell assertion that discovery exits before any command containing `terraform init`, `terraform plan`, `terraform apply`, or `terraform destroy` can execute. Keep `apply` and `stop` conditions unchanged for their own modes.

### Task 3: Validate, document, and publish the discovery contract

**Files:**
- Modify: `docs/solutions/eks-gpu-kueue-poc-runbook.md`
- Modify: `docs/solutions/eks-gpu-kueue-poc-implementation-plan.md` (if the workflow mode list is duplicated)

**Interfaces:**
- Consumes: discovery workflow output and existing GPU POC runbook boundaries.
- Produces: operator instructions for discovery-before-variable-configuration.

- [ ] **Step 1: Document the sequence**

Document:

```text
discover → review subnet/offering/quota evidence → set protected variables → preflight → plan → apply → validate → stop
```

State explicitly that discovery does not configure variables automatically and does not enable GPU capacity.

- [ ] **Step 2: Run local validation**

Run:

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/terraform-eks-gpu-kueue-poc.yml"); YAML.load_file(".github/workflows/terraform-tests.yaml")'
git diff --check
```

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/terraform-eks-gpu-kueue-poc.yml .github/workflows/terraform-tests.yaml docs/solutions/eks-gpu-kueue-poc-runbook.md docs/solutions/eks-gpu-kueue-poc-implementation-plan.md docs/superpowers/plans/2026-08-24-yy-44-gpu-discovery.md
git commit -m "feat: add read-only GPU environment discovery"
git push -u origin feature/yy-44-gpu-discovery
```

- [ ] **Step 4: Open PR and wait for all checks**

Open a PR against `main`, inspect all workflow-boundary and Terraform tests, and merge only after they are green.

- [ ] **Step 5: Run discovery from `main`**

Dispatch `terraform-eks-gpu-kueue-poc` with `mode=discover`. Review the private handoff and sanitised evidence. Do not set environment variables until the subnet, offering, quota, image, and chart decisions are explicitly reviewed.
