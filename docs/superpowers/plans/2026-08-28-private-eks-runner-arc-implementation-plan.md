# Private EKS Runner and ARC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and sandbox-validate the independently recoverable network, CodeBuild runner, private EKS CPU baseline, and ARC ephemeral runner path.

**Architecture:** One Terraform state owns the private network. A CodeBuild-hosted ephemeral runner outside EKS owns cluster bootstrap and recovery; ARC runner scale sets inside EKS own steady-state Kubernetes delivery. Source checks and runtime checks use different workflow modes and permissions.

**Tech Stack:** Terraform, AWS VPC/EKS/CodeBuild, GitHub Actions OIDC, Actions Runner Controller, Helm, Kubernetes, Node.js contract tests

**Spec:** `docs/superpowers/specs/2026-08-28-ai-workload-platform-roadmap-design.md`

## Global Constraints

- Use a non-`codex/` branch name.
- Do not mutate AWS during source-validation tasks.
- Use `aws-private-eks` for protected runtime operations.
- Use one state owner for VPC, subnets, routes, endpoints and shared security groups.
- Keep the CodeBuild runner outside the EKS failure domain.
- Do not give ARC VPC or EKS control-plane lifecycle permissions.
- Keep private workers and runners without public IP addresses.
- NAT is an explicit bounded exception with budget and teardown gates.
- No runtime claim without sanitised protected-CI evidence.
- Do not execute teardown without a separate exact confirmation.

---

### Task 1: Reconcile status and split source validation from runtime validation

**Files:**
- Modify: `.github/workflows/terraform-eks-gpu-kueue-poc.yml`
- Modify: `.github/workflows/terraform-tests.yaml`
- Modify: `docs/practices/current-status.md`
- Modify: `docs/solutions/eks-gpu-kueue-poc-runbook.md`
- Modify: `providers/aws/app/api/tests/eksGpuKueuePocDocumentation.test.ts`

**Interfaces:**
- Consumes: current `validate`, `preflight`, `plan`, `apply`, and `stop` GPU workflow modes.
- Produces: credential-free `source-validate` and protected `runtime-validate` modes with unambiguous evidence names.

- [x] **Step 1: Write the failing workflow-boundary test**

Add assertions to the `eks_gpu_kueue_poc_workflow_boundary` job:

```bash
grep -q -- '- source-validate' "$workflow"
grep -q -- '- runtime-validate' "$workflow"
grep -q "inputs.mode == 'source-validate'" "$workflow"
grep -q "inputs.mode == 'runtime-validate'" "$workflow"
! grep -A80 "inputs.mode == 'source-validate'" "$workflow" | grep -q 'aws eks update-kubeconfig'
grep -A180 "inputs.mode == 'runtime-validate'" "$workflow" | grep -q 'aws eks update-kubeconfig'
```

- [x] **Step 2: Run the boundary test and verify failure**

Run:

```bash
grep -q -- '- source-validate' .github/workflows/terraform-eks-gpu-kueue-poc.yml
```

Expected: exit 1 because the workflow still exposes only `validate`.

- [x] **Step 3: Split the workflow modes**

Change the dispatch choice to:

```yaml
options:
  - source-validate
  - discover
  - preflight
  - plan
  - apply
  - runtime-validate
  - stop
```

Route Terraform formatting, init with `-backend=false`, validate and test to
`source-validate`. Route AWS credentials, backend init, kubeconfig and `kubectl`
to `runtime-validate`, `discover`, `preflight`, `plan`, `apply`, or `stop` as
their existing contracts require.

- [x] **Step 4: Correct public status language**

Record these exact boundaries:

```text
Private EKS, ARC and GPU/Kueue source: source implemented; runtime validation pending.
The earlier public EKS sandbox was destroyed and is not the private GPU target.
AgentCore RAG is a separate managed-runtime path and is not hosted on EKS.
```

- [x] **Step 5: Run source and documentation tests**

Run:

```bash
cd providers/aws/app/api
pnpm test
```

Expected: all Node tests pass, including the updated workflow/documentation
contract.

- [x] **Step 6: Commit**

```bash
git add .github/workflows/terraform-eks-gpu-kueue-poc.yml .github/workflows/terraform-tests.yaml docs/practices/current-status.md docs/solutions/eks-gpu-kueue-poc-runbook.md providers/aws/app/api/tests/eksGpuKueuePocDocumentation.test.ts
git commit -m "ci: separate GPU source and runtime validation"
```

### Task 2: Make private EKS consume the single network state

**Files:**
- Modify: `providers/aws/infra/terraform/envs/eks-private-sandbox/main.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-private-sandbox/variables.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-private-sandbox/outputs.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-private-sandbox/eks_private_sandbox.tftest.hcl`
- Modify: `.github/workflows/terraform-eks-private-sandbox.yml`
- Modify: `docs/solutions/eks-private-sandbox-runbook.md`

**Interfaces:**
- Consumes: sensitive outputs from `eks-private-network/terraform.tfstate`.
- Produces: EKS control plane and CPU nodes attached to reviewed subnet and security-group outputs without recreating network resources.

- [x] **Step 1: Write the failing Terraform contract**

Replace assertions that reference `module.network` and `module.egress` with:

```hcl
assert {
  condition     = output.network_state_consumed
  error_message = "Private EKS must consume the reviewed network state."
}

assert {
  condition     = length(module.eks.subnet_ids) == 2
  error_message = "Private EKS must use the two private subnets from network state."
}
```

Add a static workflow-boundary assertion that rejects these module blocks in
the sandbox composition:

```bash
! grep -q 'module "network"' providers/aws/infra/terraform/envs/eks-private-sandbox/main.tf
! grep -q 'module "egress"' providers/aws/infra/terraform/envs/eks-private-sandbox/main.tf
grep -q 'terraform_remote_state.*network' providers/aws/infra/terraform/envs/eks-private-sandbox/main.tf
```

- [x] **Step 2: Run Terraform test and verify failure**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox test
```

Expected: FAIL because `network_state_consumed` and remote-state outputs do not
exist.

- [x] **Step 3: Add the remote-state contract**

Add variables:

```hcl
variable "network_state_bucket" {
  type        = string
  description = "S3 bucket containing the reviewed private-network state."
}

variable "network_state_key" {
  type        = string
  default     = "cloudai-platform/eks-private-network/terraform.tfstate"
  description = "State key owned by the private-network environment."
}

variable "network_state_region" {
  type        = string
  default     = "ap-southeast-2"
  description = "Region of the private-network state bucket."
}
```

Consume it in `main.tf`:

```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = var.network_state_bucket
    key    = var.network_state_key
    region = var.network_state_region
  }
}
```

Remove the sandbox `private-network`, `private-egress`, and duplicate worker-SG
resources. Pass these outputs to EKS and the cluster-SG rule:

```hcl
subnet_ids              = data.terraform_remote_state.network.outputs.private_subnet_ids
node_security_group_ids = [data.terraform_remote_state.network.outputs.worker_security_group_id]
security_groups         = [data.terraform_remote_state.network.outputs.delivery_runner_security_group_id]
```

Expose only a Boolean source category:

```hcl
output "network_state_consumed" {
  value = true
}
```

- [x] **Step 4: Wire protected environment values without publishing IDs**

Set the workflow input from existing non-secret backend variables:

```yaml
TF_VAR_network_state_bucket: ${{ vars.TF_BACKEND_BUCKET }}
TF_VAR_network_state_key: ${{ vars.TF_STATE_KEY_PREFIX }}/eks-private-network/terraform.tfstate
TF_VAR_network_state_region: ${{ vars.AWS_REGION }}
```

Do not print `terraform_remote_state` output values to the summary or artifact.

- [x] **Step 5: Run Terraform and full API contract tests**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox validate
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox test
cd providers/aws/app/api && pnpm test
```

Expected: all commands exit 0.

- [x] **Step 6: Commit**

```bash
git add providers/aws/infra/terraform/envs/eks-private-sandbox .github/workflows/terraform-eks-private-sandbox.yml docs/solutions/eks-private-sandbox-runbook.md .github/workflows/terraform-tests.yaml
git commit -m "refactor: consume private network state from EKS"
```

### Task 3: Add the protected CodeBuild runner lifecycle workflow

**Files:**
- Create: `.github/workflows/terraform-eks-private-runner.yml`
- Modify: `providers/aws/infra/terraform/envs/eks-private-runner/main.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-private-runner/variables.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-private-runner/eks_private_runner.tftest.hcl`
- Modify: `.github/workflows/terraform-tests.yaml`
- Create: `docs/solutions/vpc-connected-runner-runbook.md`

**Interfaces:**
- Consumes: private-network remote-state outputs and the dedicated runner OIDC role.
- Produces: CodeBuild project label `codebuild-<project>-${{ github.run_id }}-${{ github.run_attempt }}` and sanitised lifecycle evidence.

- [x] **Step 1: Add failing workflow-boundary checks**

```bash
workflow=.github/workflows/terraform-eks-private-runner.yml
test -f "$workflow"
grep -q 'source-validate' "$workflow"
grep -q 'plan' "$workflow"
grep -q 'apply' "$workflow"
grep -q 'runtime-validate' "$workflow"
grep -q 'I_UNDERSTAND_PRIVATE_EKS_RUNNER_APPLY' "$workflow"
grep -q 'environment: aws-private-eks' "$workflow"
grep -q 'id-token: write' "$workflow"
! grep -q 'terraform destroy' "$workflow"
```

- [x] **Step 2: Verify the new boundary test fails**

Run:

```bash
test -f .github/workflows/terraform-eks-private-runner.yml
```

Expected: exit 1.

- [x] **Step 3: Make the runner environment consume network remote state**

Use the same `network_state_bucket`, `network_state_key`, and
`network_state_region` interface from Task 2. Replace direct VPC/subnet/SG
variables with:

```hcl
vpc_id             = data.terraform_remote_state.network.outputs.vpc_id
private_subnet_ids = data.terraform_remote_state.network.outputs.private_subnet_ids
security_group_ids = [data.terraform_remote_state.network.outputs.delivery_runner_security_group_id]
```

Keep all three outputs sensitive at the network boundary.

- [x] **Step 4: Create the workflow**

The dispatch contract is:

```yaml
mode:
  type: choice
  options: [source-validate, plan, apply, runtime-validate]
confirmation:
  type: string
  required: false
```

Use GitHub-hosted `ubuntu-latest` because this workflow creates the runner
through AWS APIs. Configure AWS credentials only outside `source-validate`.
Require this exact apply gate:

```bash
test "$CONFIRMATION" = "I_UNDERSTAND_PRIVATE_EKS_RUNNER_APPLY"
```

Runtime validation must query CodeBuild project configuration and emit only:

```json
{"runner_project_present":true,"vpc_attached":true,"private_subnets_configured":true,"logs_configured":true}
```

- [x] **Step 5: Run Terraform and workflow tests**

```bash
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-runner init -backend=false
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-runner validate
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-runner test
cd providers/aws/app/api && pnpm test
```

Expected: all commands exit 0.

- [x] **Step 6: Commit**

```bash
git add .github/workflows/terraform-eks-private-runner.yml .github/workflows/terraform-tests.yaml providers/aws/infra/terraform/envs/eks-private-runner docs/solutions/vpc-connected-runner-runbook.md
git commit -m "ci: add private EKS runner lifecycle"
```

### Task 4: Define layered teardown and fail-closed refusal tests

**Files:**
- Create: `scripts/validate-private-eks-teardown-readiness.sh`
- Create: `scripts/tests/test-private-eks-teardown-readiness.sh`
- Create: `.github/workflows/private-eks-teardown-plan.yml`
- Create: `docs/solutions/private-eks-layered-teardown-runbook.md`
- Modify: `.github/workflows/terraform-tests.yaml`

**Interfaces:**
- Consumes: sanitised state-presence categories for workload, GPU, ARC, EKS, runner and network layers.
- Produces: ordered `teardown-plan` evidence; no deletion capability.

- [ ] **Step 1: Write the failing shell tests**

Cover these cases:

```bash
assert_fails "network cannot precede runner" \
  env LAYERS='network,runner,eks' bash scripts/validate-private-eks-teardown-readiness.sh
assert_fails "eks cannot precede arc" \
  env LAYERS='eks,arc,workloads' bash scripts/validate-private-eks-teardown-readiness.sh
assert_passes "approved order" \
  env LAYERS='workloads,gpu-platform,gpu-node,arc,eks,runner,network' bash scripts/validate-private-eks-teardown-readiness.sh
```

- [ ] **Step 2: Run the test and verify failure**

```bash
bash scripts/tests/test-private-eks-teardown-readiness.sh
```

Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement the exact layer-order validator**

The script accepts only:

```text
workloads,gpu-platform,gpu-node,arc,eks,runner,network
```

It rejects missing, duplicated, unknown, or reordered layers and writes no cloud
identifiers.

- [ ] **Step 4: Add a plan-only workflow**

Expose only `inspect` and `teardown-plan`. Require:

```text
I_UNDERSTAND_PRIVATE_EKS_LAYERED_TEARDOWN_PLAN_ONLY
```

The workflow may run read-only state inventory and `terraform plan -destroy`
inside each layer solely to produce Boolean sanitised categories. It must not
contain `terraform destroy`, `terraform apply`, AWS delete calls, or `kubectl
delete`.

- [ ] **Step 5: Run refusal and repository tests**

```bash
bash scripts/tests/test-private-eks-teardown-readiness.sh
cd providers/aws/app/api && pnpm test
```

Expected: all tests pass and workflow boundary checks prove no mutation path.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-private-eks-teardown-readiness.sh scripts/tests/test-private-eks-teardown-readiness.sh .github/workflows/private-eks-teardown-plan.yml .github/workflows/terraform-tests.yaml docs/solutions/private-eks-layered-teardown-runbook.md
git commit -m "feat: add private EKS teardown planning gate"
```

### Task 5: Sandbox-validate the network and CodeBuild runner

**Files:**
- Modify after run: `docs/solutions/vpc-connected-runner-runbook.md`
- Create locally: `_private/docs/notes/private-eks-runner-runtime-record-2026-08-28.md`

**Interfaces:**
- Consumes: Tasks 1–4, protected environment values, approved budget, and exact runtime confirmations.
- Produces: sanitised network and CodeBuild runtime evidence.

- [ ] **Step 1: Run protected network plan**

Dispatch `terraform-eks-private-network.yml` in plan mode. Expected: one network
state owner, explicit NAT choice, no unreviewed delete actions.

- [ ] **Step 2: Review cost and same-run plan**

Record expected hourly cost, maximum exercise duration and stop owner in the
private runtime record. Do not copy resource identifiers.

- [ ] **Step 3: Apply only after a new exact confirmation**

Use `I_UNDERSTAND_PRIVATE_EKS_NETWORK_APPLY`. Expected: sanitised evidence
reports VPC, private subnet, endpoint and cost-boundary readiness.

- [ ] **Step 4: Apply and validate the runner foundation**

Dispatch `.github/workflows/terraform-eks-private-runner.yml` with:

```text
I_UNDERSTAND_PRIVATE_EKS_RUNNER_APPLY
```

Then run `runtime-validate`. Expected: the project is VPC-attached, log delivery
is configured, an ephemeral runner job can start and terminate, and no EKS
resource exists yet.

- [ ] **Step 5: Record evidence and commit public status only**

```bash
git add docs/solutions/vpc-connected-runner-runbook.md docs/practices/current-status.md
git commit -m "docs: record private runner runtime validation"
```

Do not add the private runtime note.

### Task 6: Sandbox-validate the private EKS CPU baseline

**Files:**
- Modify: `.github/workflows/terraform-eks-private-sandbox.yml`
- Modify: `docs/solutions/eks-private-sandbox-runbook.md`
- Modify: `docs/practices/current-status.md`
- Create locally: `_private/docs/notes/private-eks-cpu-runtime-record-2026-08-28.md`

**Interfaces:**
- Consumes: sandbox-validated CodeBuild runner and private-network state.
- Produces: ACTIVE private-only EKS API, one CPU system node, successful private image pull and non-GPU Job evidence.

- [ ] **Step 1: Add a CPU acceptance script to the workflow**

The runtime mode must verify:

```bash
kubectl wait --for=condition=Ready nodes --all --timeout=10m
test "$(kubectl get nodes -o json | jq '[.items[] | select(.status.allocatable["nvidia.com/gpu"] != null)] | length')" = "0"
kubectl create job private-cpu-smoke --image="$CPU_SMOKE_IMAGE" -- /bin/sh -ec 'printf cloudai-private-cpu-ok'
kubectl wait --for=condition=complete job/private-cpu-smoke --timeout=3m
```

Use an approved digest-pinned private ECR image. Delete the smoke Job after
capturing only completion status.

- [ ] **Step 2: Run source tests before protected CI**

```bash
terraform -chdir=providers/aws/infra/terraform/envs/eks-private-sandbox test
cd providers/aws/app/api && pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Run protected plan and review the fresh result**

Expected: private API only, one bounded CPU node, no GPU node, no public worker
IP, no duplicate network resources, and no deletes outside the EKS state.

- [ ] **Step 4: Apply and runtime-validate after a new exact confirmation**

Expected: cluster ACTIVE, one Ready CPU worker, DNS and private image pull pass,
and the CPU Job completes through the VPC-connected runner.

- [ ] **Step 5: Commit the public validation record**

```bash
git add .github/workflows/terraform-eks-private-sandbox.yml docs/solutions/eks-private-sandbox-runbook.md docs/practices/current-status.md
git commit -m "docs: record private EKS CPU validation"
```

### Task 7: Install ARC and execute a real ephemeral runner smoke

**Files:**
- Modify: `.github/workflows/arc-private-eks-handoff.yml`
- Modify: `docs/solutions/arc-private-eks-handoff-runbook.md`
- Modify: `docs/practices/current-status.md`
- Create: `.github/workflows/arc-private-eks-smoke.yml`
- Create locally: `_private/docs/notes/arc-private-eks-runtime-record-2026-08-28.md`

**Interfaces:**
- Consumes: private EKS CPU baseline, GitHub App credentials, CodeBuild recovery runner.
- Produces: dedicated ARC namespace, ephemeral runner scale set and one completed GitHub Actions job routed to ARC.

- [ ] **Step 1: Add failing ARC smoke boundary assertions**

```bash
workflow=.github/workflows/arc-private-eks-smoke.yml
test -f "$workflow"
grep -q 'runs-on: cloudai-private-eks' "$workflow"
grep -q 'kubectl auth can-i' "$workflow"
! grep -Eq 'terraform (apply|destroy)' "$workflow"
! grep -q 'aws ec2' "$workflow"
```

- [ ] **Step 2: Verify failure**

```bash
test -f .github/workflows/arc-private-eks-smoke.yml
```

Expected: exit 1.

- [ ] **Step 3: Harden ARC values and permissions**

Configure a dedicated namespace, bounded pod requests/limits, Kubernetes RBAC
for the delivery namespace only, and no default AWS permissions. The scale-set
name is exactly:

```text
cloudai-private-eks
```

The workflow identity may read cluster status and apply reviewed namespaced
Helm/Argo resources; it may not manage VPC, EKS control plane, IAM roles or node
groups.

- [ ] **Step 4: Create the smoke workflow**

The job must:

```yaml
runs-on: cloudai-private-eks
steps:
  - uses: actions/checkout@v4
  - run: kubectl auth can-i get configmaps -n cloudai-system
  - run: kubectl auth can-i create namespaces && exit 1 || exit 0
```

Upload only runner class, pod ephemerality and RBAC pass/fail Booleans.

- [ ] **Step 5: Install from the recovery runner and execute smoke**

Run the ARC handoff workflow after a new exact confirmation. Dispatch the smoke
workflow and verify the runner pod terminates after the job. Revoke the GitHub
App installation token and confirm no orphan runner registration remains.

- [ ] **Step 6: Validate uninstall without deleting the cluster**

Run the ARC workflow's reviewed uninstall mode. Expected: scale set and
controller are removed; CodeBuild recovery remains usable; EKS stays ACTIVE.
Reinstall only if the next approved task requires it.

- [ ] **Step 7: Commit the public record**

```bash
git add .github/workflows/arc-private-eks-handoff.yml .github/workflows/arc-private-eks-smoke.yml docs/solutions/arc-private-eks-handoff-runbook.md docs/practices/current-status.md
git commit -m "feat: validate ephemeral ARC delivery"
```
