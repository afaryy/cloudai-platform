# Bounded EKS GPU + Kueue POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use \`superpowers:subagent-driven-development\` (recommended) or \`superpowers:executing-plans\` to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Build a Terraform- and GitHub Actions-managed one-node synthetic CUDA proof of concept that demonstrates EKS GPU allocation and Kueue admission without deploying it through ordinary CI.

**Architecture:** A separate Terraform environment reads the existing EKS sandbox by name and manages only a dedicated GPU node group plus Kueue and Kubernetes resources. A protected manual workflow supports read-only discovery and preflight, plan, explicit apply, validation, and explicit scale-to-zero. It includes no destroy mode.

**Tech Stack:** Terraform 1.6+, AWS provider 5.x, Helm provider, Kubernetes provider, Amazon EKS 1.31, NVIDIA Kubernetes device plugin, Kueue, Kubernetes \`batch/v1\` Job, GitHub Actions OIDC, Node built-in test runner.

**Spec:** \`docs/solutions/eks-gpu-kueue-poc-design.md\`

## Global Constraints

- Use \`ap-southeast-2\`. Never commit account IDs, ARNs, Terraform state, endpoints, kubeconfig, credentials, or raw cloud logs.
- EKS 1.31 uses the NVIDIA device plugin only. Do not install DRA on a GPU node. The GPU workflow attaches only to an existing \`ACTIVE\` EKS sandbox; a missing cluster is a separate EKS recovery operation, never an implicit GPU POC action.
- All mutations use Terraform through protected \`aws-sandbox\` GitHub Actions OIDC. No clickops or \`kubectl apply\`.
- GPU capacity is on-demand, \`min=0\`, \`desired=0\` outside an approved run, and \`max=1\`. A confirmed apply sets desired capacity to \`1\` for the smoke-test window because Kueue alone does not scale an EKS managed node group; a distinct confirmed stop restores it to \`0\`.
- The Job is synthetic-only, immutable-image-by-digest, requests and limits one GPU, has \`backoffLimit: 0\`, and \`activeDeadlineSeconds: 300\`.
- AUD 75 is an alert threshold, not a hard cap. Billing is a human IAM responsibility outside GitHub OIDC.
- Apply, stop, and teardown require separate confirmations. This plan creates no teardown workflow.

## File Structure

| Path | Responsibility |
| --- | --- |
| \`providers/aws/infra/terraform/modules/eks-gpu-kueue/\` | GPU node group, device plugin, Kueue queue resources, and suspended synthetic Job. |
| \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/\` | Existing EKS lookup, provider setup, isolated state shape, and environment tests. |
| \`.github/workflows/terraform-eks-gpu-kueue-poc.yml\` | Manual read-only discovery and protected preflight, plan, apply, validate, and stop operations. |
| \`.github/workflows/terraform-tests.yaml\` | Terraform test matrix and protected-workflow static checks. |
| \`providers/aws/app/api/tests/eksGpuKueuePocDocumentation.test.ts\` | Public documentation and operational-boundary tests. |
| \`docs/solutions/eks-gpu-kueue-poc-runbook.md\` | Human operator sequence and sanitised evidence fields. |

---

### Task 1: Establish public-safe POC documentation and failing tests

**Files:**
- Create: \`providers/aws/app/api/tests/eksGpuKueuePocDocumentation.test.ts\`
- Create: \`docs/solutions/eks-gpu-kueue-poc-runbook.md\`
- Modify: \`docs/practices/current-status.md\`
- Modify: \`docs/architecture/README.md\`

**Interfaces:**
- Consumes: \`docs/solutions/eks-gpu-kueue-poc-design.md\`.
- Produces: documentation test coverage for the one-node, synthetic, no-destroy contract.

- [ ] **Step 1: Write the failing documentation test**

\`\`\`ts
test("GPU Kueue POC runbook preserves no-destroy and bounded-runtime controls", async () => {
  const runbook = await readFile(RUNBOOK, "utf8");
  assert.match(runbook, /min=0.*desired=0.*max=1/is);
  assert.match(runbook, /activeDeadlineSeconds: 300/);
  assert.match(runbook, /AUD 75.*not a hard cap/is);
  assert.match(runbook, /does not provide a destroy mode/is);
  assert.match(runbook, /NVIDIA device plugin.*not DRA/is);
});
\`\`\`

- [ ] **Step 2: Verify the test fails**

Run:

\`\`\`bash
pnpm --dir providers/aws/app/api test -- eksGpuKueuePocDocumentation.test.ts
\`\`\`

Expected: failure because the test and runbook are absent.

- [ ] **Step 3: Implement the runbook and navigation**

Document the exact path \`discover -> review -> configure protected variables -> preflight -> plan -> apply -> validate -> stop\`. Specify that discovery is read-only and does not configure variables or capacity; apply needs protected-environment approval and the GPU-specific confirmation; list only sanitised evidence; state that a failed stage does not retry capacity; and state that source implementation does not equal a deployed GPU POC.

- [ ] **Step 4: Verify the focused test passes**

Run the command from Step 2. Expected: the test file passes with zero failures.

- [ ] **Step 5: Commit**

\`\`\`bash
git add providers/aws/app/api/tests/eksGpuKueuePocDocumentation.test.ts docs/solutions/eks-gpu-kueue-poc-runbook.md docs/practices/current-status.md docs/architecture/README.md
git commit -m "test: define GPU Kueue POC boundaries"
\`\`\`

### Task 2: Build the isolated GPU + Kueue Terraform module

**Files:**
- Create: \`providers/aws/infra/terraform/modules/eks-gpu-kueue/main.tf\`
- Create: \`providers/aws/infra/terraform/modules/eks-gpu-kueue/variables.tf\`
- Create: \`providers/aws/infra/terraform/modules/eks-gpu-kueue/outputs.tf\`
- Create: \`providers/aws/infra/terraform/modules/eks-gpu-kueue/versions.tf\`
- Create: \`providers/aws/infra/terraform/modules/eks-gpu-kueue/eks_gpu_kueue.tftest.hcl\`

**Interfaces:**
- Consumes: existing cluster name, subnet IDs, dedicated GPU node role ARN, \`gpu_instance_type\`, \`cuda_smoke_image\`, \`kueue_chart_version\`, and provider authentication from Task 3.
- Produces: one GPU managed node group, device-plugin and Kueue Helm releases, \`gpu-poc\` queue objects, and a suspended Kueue-managed Job.

- [ ] **Step 1: Write failing Terraform contract tests**

\`\`\`hcl
run "keeps_gpu_capacity_and_image_immutable" {
  command = plan

  assert {
    condition     = var.gpu_min_size == 0 && var.gpu_desired_size == 0 && var.gpu_max_size == 1
    error_message = "GPU POC capacity must be 0/0/1 before an approved run."
  }

  assert {
    condition     = can(regex("@sha256:[a-f0-9]{64}$", var.cuda_smoke_image))
    error_message = "The CUDA smoke image must be immutable by digest."
  }
}
\`\`\`

- [ ] **Step 2: Verify the module test fails**

\`\`\`bash
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-kueue init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-kueue test
\`\`\`

Expected: failure because the module is absent.

- [ ] **Step 3: Implement bounded resource definitions**

Define validated variables for \`cluster_name\`, \`subnet_ids\`, \`gpu_node_role_arn\`, \`gpu_instance_type\`, \`gpu_min_size\`, \`gpu_desired_size\`, \`gpu_max_size\`, \`cuda_smoke_image\`, \`kueue_chart_version\`, and tags. Create \`aws_eks_node_group.gpu_poc\` with accelerated AMI, \`ON_DEMAND\`, label \`cloudai.platform/workload-class=gpu-poc\`, and taint \`gpu-poc=true:NoSchedule\`.

Install NVIDIA device plugin and Kueue through pinned Terraform \`helm_release\` resources. Create the \`gpu-poc\` namespace, \`gpu-poc-on-demand\` ResourceFlavor, \`gpu-poc-cluster\` ClusterQueue, and \`gpu-poc\` LocalQueue. Configure one nominal \`nvidia.com/gpu\`, bounded CPU/memory, no borrowing, and \`preemption.withinClusterQueue = Never\`.

Create a Job with \`kueue.x-k8s.io/queue-name=gpu-poc\`, one GPU request and limit, matching node selector/toleration, and exactly:

\`\`\`yaml
restartPolicy: Never
backoffLimit: 0
activeDeadlineSeconds: 300
ttlSecondsAfterFinished: 900
\`\`\`

- [ ] **Step 4: Verify local Terraform checks**

\`\`\`bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-kueue init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-kueue validate
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-kueue test
\`\`\`

Expected: all checks exit zero without AWS credentials.

- [ ] **Step 5: Commit**

\`\`\`bash
git add providers/aws/infra/terraform/modules/eks-gpu-kueue
git commit -m "feat: add bounded EKS GPU Kueue module"
\`\`\`

### Task 3: Wire a separate GPU POC environment and state boundary

**Files:**
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/backend.s3.tf\`
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/backend.tf.example\`
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/main.tf\`
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/variables.tf\`
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/outputs.tf\`
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/versions.tf\`
- Create: \`providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/eks_gpu_kueue_poc.tftest.hcl\`

**Interfaces:**
- Consumes: \`cloudai-platform-eks-sandbox\` and Task 2 module inputs.
- Produces: remote state key \`cloudai-platform/eks-gpu-kueue-poc/terraform.tfstate\` and no second EKS control plane.

- [ ] **Step 1: Write a failing environment test**

\`\`\`hcl
run "attaches_to_existing_cluster_with_one_node_boundary" {
  command = plan

  assert {
    condition     = var.eks_cluster_name == "cloudai-platform-eks-sandbox"
    error_message = "The POC must attach to the existing EKS sandbox."
  }

  assert {
    condition     = var.gpu_min_size == 0 && var.gpu_desired_size == 0 && var.gpu_max_size == 1
    error_message = "The POC environment must retain the one-node boundary."
  }
}
\`\`\`

- [ ] **Step 2: Verify the environment test fails**

\`\`\`bash
terraform -chdir=providers/aws/infra/terraform/envs/eks-gpu-kueue-poc init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/eks-gpu-kueue-poc test
\`\`\`

Expected: failure because the environment is absent.

- [ ] **Step 3: Implement provider and IAM wiring**

Use \`data "aws_eks_cluster"\` and \`data "aws_eks_cluster_auth"\` for the existing cluster. Configure Helm and Kubernetes providers with cluster endpoint, decoded CA, and token. Define a dedicated GPU node role with only EKS worker, CNI, and ECR read policies. Validate explicitly supplied, reviewed GPU subnet IDs against the existing cluster VPC; do not duplicate the network or EKS cluster or automatically select every VPC subnet. The workflow preflight, not Terraform resource creation, verifies that the named cluster is \`ACTIVE\` before it can plan an apply.

Require GitHub environment variables \`TF_VAR_gpu_instance_type\`, \`TF_VAR_cuda_smoke_image\`, and \`TF_VAR_kueue_chart_version\`. Do not define an image-tag fallback. Mark endpoint and certificate outputs sensitive.

- [ ] **Step 4: Verify Terraform checks**

\`\`\`bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
terraform -chdir=providers/aws/infra/terraform/envs/eks-gpu-kueue-poc init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/eks-gpu-kueue-poc validate
terraform -chdir=providers/aws/infra/terraform/envs/eks-gpu-kueue-poc test
\`\`\`

Expected: tests pass with mocked providers, no backend, and no AWS credentials.

- [ ] **Step 5: Commit**

\`\`\`bash
git add providers/aws/infra/terraform/envs/eks-gpu-kueue-poc
git commit -m "feat: add isolated EKS GPU Kueue environment"
\`\`\`

### Task 4: Add the protected manual workflow and CI coverage

**Files:**
- Create: \`.github/workflows/terraform-eks-gpu-kueue-poc.yml\`
- Modify: \`.github/workflows/terraform-tests.yaml\`

**Interfaces:**
- Consumes: private environment values \`AWS_ROLE_TO_ASSUME\`, \`AWS_REGION\`, \`TF_BACKEND_BUCKET\`, \`TF_BACKEND_LOCK_TABLE\`, \`TF_STATE_KEY_PREFIX\`, \`TF_VAR_GPU_INSTANCE_TYPE\`, \`TF_VAR_GPU_POC_SUBNET_IDS\`, \`TF_VAR_CUDA_SMOKE_IMAGE\`, \`TF_VAR_KUEUE_CHART_VERSION\`, and \`GPU_POC_BUDGET_ALERT_CONFIGURED\`.
- Produces: manual \`discover\`, \`preflight\`, \`plan\`, \`apply\`, \`validate\`, and \`stop\` modes plus sanitised evidence artifacts.

- [ ] **Step 1: Add failing static workflow assertions**

\`\`\`bash
workflow=.github/workflows/terraform-eks-gpu-kueue-poc.yml
grep -q 'workflow_dispatch:' "$workflow"
grep -q 'environment: aws-sandbox' "$workflow"
grep -q 'id-token: write' "$workflow"
grep -q 'I_UNDERSTAND_EKS_GPU_KUEUE_POC_APPLY' "$workflow"
grep -q 'I_UNDERSTAND_EKS_GPU_KUEUE_POC_STOP' "$workflow"
grep -q -- '- discover' "$workflow"
grep -q "inputs.mode == 'discover'" "$workflow"
grep -q 'Discovery is read-only' "$workflow"
! grep -q 'terraform destroy' "$workflow"
! grep -q '^  schedule:' "$workflow"
\`\`\`

- [ ] **Step 2: Verify the assertions fail**

Run the exact block from Step 1. Expected: failure because the workflow is absent.

- [ ] **Step 3: Implement fail-closed lifecycle modes**

Use \`discover\`, \`preflight\`, \`plan\`, \`apply\`, \`validate\`, and \`stop\` workflow choices; \`contents: read\`, \`id-token: write\`, \`environment: aws-sandbox\`, and the existing non-cancelling EKS concurrency group. \`discover\` is read-only and requires only the existing AWS OIDC boundary; it must not initialise Terraform or configure GPU capacity.

Discovery identifies the existing cluster subnet IDs and Availability Zones, compares \`g4dn.xlarge\` and \`g5.xlarge\` offerings, reports the selected-family Service Quota, resolves an official digest-pinned CUDA image candidate, and records the reviewed Kueue chart version. It writes a private operator handoff but uploads only category/boolean JSON. Preflight checks required values, \`GPU_POC_BUDGET_ALERT_CONFIGURED=true\`, selected-family Service Quota, eligible EC2 offering, cluster version, and image digest.

Apply requires \`I_UNDERSTAND_EKS_GPU_KUEUE_POC_APPLY\`, first verifies the named EKS cluster is \`ACTIVE\`, selected-subnet availability zones offer the approved type, sets \`TF_VAR_gpu_desired_size=1\`, runs a fresh plan, then applies. Stop requires \`I_UNDERSTAND_EKS_GPU_KUEUE_POC_STOP\`, sets only \`TF_VAR_gpu_desired_size=0\`, and applies. Validate uses temporary runner kubeconfig and checks one Ready GPU node, exactly one allocatable GPU, the owned CUDA workload's quota reservation and admission, the assigned `gpu-poc-on-demand` flavor, and Job completion. No mode creates an EKS cluster, retries capacity, changes quota, changes instance type, or invokes destroy.

- [ ] **Step 4: Verify source checks**

\`\`\`bash
pnpm --dir providers/aws/app/api test
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
git diff --check
\`\`\`

Expected: all checks pass and no AWS resource is touched.

- [ ] **Step 5: Commit**

\`\`\`bash
git add .github/workflows/terraform-eks-gpu-kueue-poc.yml .github/workflows/terraform-tests.yaml
git commit -m "ci: add protected GPU Kueue POC workflow"
\`\`\`

### Task 5: Reconcile architecture documentation and verify the complete source path

**Files:**
- Modify: \`README.md\`
- Modify: \`docs/solutions/featured-solutions.md\`
- Modify: \`docs/architecture/ai-factory-gpu-workload-readiness.md\`
- Modify: \`docs/architecture/ai-factory-workload-placement-comparison.md\`
- Modify: \`providers/aws/app/api/tests/aiFactoryPracticeDocumentation.test.ts\`

**Interfaces:**
- Consumes: implementation boundaries from Tasks 1–4.
- Produces: clear public language: source path implemented, live GPU POC still undeployed until separately approved.

- [ ] **Step 1: Extend the failing AI Factory practice test**

\`\`\`ts
assert.match(readiness, /EKS GPU \+ Kueue POC design/);
assert.match(readiness, /source implementation is not a deployed GPU runtime/i);
assert.match(placement, /one-node.*Kueue.*proof of concept/is);
assert.doesNotMatch(readme, /Implemented — GPU cluster/);
\`\`\`

- [ ] **Step 2: Verify the focused test fails**

\`\`\`bash
pnpm --dir providers/aws/app/api test -- aiFactoryPracticeDocumentation.test.ts
\`\`\`

Expected: failure until the navigation wording is updated.

- [ ] **Step 3: Update status and navigation**

Link the design and runbook. Preserve the HyperPod, Slurm, and data-centre non-goals. State that the code and workflow path can be implemented without implying a live GPU deployment.

- [ ] **Step 4: Run full fresh verification**

\`\`\`bash
pnpm --dir providers/aws/app/api test
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
for dir in providers/aws/infra/terraform/modules/eks-gpu-kueue providers/aws/infra/terraform/envs/eks-gpu-kueue-poc; do
  terraform -chdir="$dir" init -backend=false
  terraform -chdir="$dir" validate
  terraform -chdir="$dir" test
done
git diff --check
\`\`\`

Expected: all local checks pass; no remote backend, AWS apply, or deletion occurs.

- [ ] **Step 5: Commit**

\`\`\`bash
git add README.md docs/solutions/featured-solutions.md docs/architecture/ai-factory-gpu-workload-readiness.md docs/architecture/ai-factory-workload-placement-comparison.md providers/aws/app/api/tests/aiFactoryPracticeDocumentation.test.ts
git commit -m "docs: record EKS GPU Kueue POC path"
\`\`\`

### Task 6: Review and publish source implementation without deploying

**Files:**
- Modify: \`docs/solutions/eks-gpu-kueue-poc-runbook.md\` only if a verified review finding requires it.

**Interfaces:**
- Consumes: clean commits and fresh checks from Tasks 1–5.
- Produces: a reviewable branch and Linear update; it does not produce a live GPU deployment.

- [ ] **Step 1: Inspect scope**

\`\`\`bash
git status --short
git diff main...HEAD --check
git log --oneline main..HEAD
\`\`\`

Expected: only intended GPU POC source, tests, workflow, and docs are present.

- [ ] **Step 2: Repeat the complete fresh verification**

Run the full command block from Task 5 Step 4. Expected: zero failures.

- [ ] **Step 3: Request independent review**

Check scope against the design, OIDC and IAM separation, confirmation gates, no-destroy boundary, digest enforcement, and public-safe evidence handling. Address verified findings in focused commits.

- [ ] **Step 4: Push and create a draft PR**

\`\`\`bash
git push -u origin feature/eks-gpu-kueue-poc-plan
gh pr create --draft --base main --head feature/eks-gpu-kueue-poc-plan --title "feat: add bounded EKS GPU Kueue POC path" --body "Implements YY-38 source and CI boundaries only. No AWS resources are deployed by this pull request."
\`\`\`

- [ ] **Step 5: Update Linear YY-38**

Comment with the pull request URL and verification evidence: “YY-38 implements and reviews the source path. A live GPU apply remains a separate explicitly approved operational action.” Keep YY-11 open until the later live evidence has been reviewed.

## Spec Coverage Review

- Synthetic CUDA workload: Tasks 2–3.
- GPU selection, device plugin, Kueue objects, and admission evidence: Tasks 2–4.
- Terraform plus protected GitHub Actions OIDC: Tasks 3–4.
- Cost, quota, stop, observability, and rollback: Tasks 1 and 4.
- Future teardown boundary: Tasks 1, 4, and 6; no delete workflow is added.
- Region, permissions, and stop conditions: Tasks 1, 3, and 4.

No task authorises AWS resource mutation until the source implementation is reviewed, merged, and the user separately approves a protected live operation.
