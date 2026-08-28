# GPU, Kueue and DCGM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a bounded private-EKS GPU workload through ARC, prove deterministic CUDA computation and Kueue admission behaviour, and correlate the result with DCGM, Prometheus, Grafana, security and cost evidence.

**Architecture:** Terraform owns only the GPU capacity/IAM boundary. ARC and Argo CD deliver pinned Kubernetes platform components and the synthetic workload chart. Kueue owns admission; DCGM Exporter supplies GPU signals; Prometheus/Grafana correlate bounded workload timing with GPU and cost evidence.

**Tech Stack:** EKS, Terraform, GitHub Actions ARC, Argo CD, Helm, Kueue, NVIDIA device plugin, CUDA, DCGM Exporter, Prometheus, Grafana

**Spec:** `docs/superpowers/specs/2026-08-28-ai-workload-platform-roadmap-design.md`

## Global Constraints

- Do not begin until the private EKS CPU and ARC runtime plans are sandbox validated.
- One on-demand GPU node maximum; minimum and idle desired capacity are zero.
- Use private subnets from the private-network state; never the destroyed public EKS sandbox.
- Pin every image by digest and every chart by reviewed exact version.
- Prove `nvidia-smi` first, then a deterministic CUDA computation with known output.
- Use a dedicated service account, disabled token automount, restricted security context and controlled egress.
- Route workloads through Kueue; do not bypass the approved LocalQueue.
- Never use execution ID, trace ID or user identity as Prometheus labels.
- Keep raw logs, cloud identifiers, Terraform state and kubeconfig out of evidence artifacts.
- Stop GPU capacity at the end of the approved exercise; full teardown remains separately confirmed.

---

### Task 1: Separate GPU capacity from in-cluster platform delivery

**Files:**
- Create: `providers/aws/infra/terraform/modules/eks-gpu-node/main.tf`
- Create: `providers/aws/infra/terraform/modules/eks-gpu-node/variables.tf`
- Create: `providers/aws/infra/terraform/modules/eks-gpu-node/outputs.tf`
- Create: `providers/aws/infra/terraform/modules/eks-gpu-node/versions.tf`
- Create: `providers/aws/infra/terraform/modules/eks-gpu-node/eks_gpu_node.tftest.hcl`
- Modify: `providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/main.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/variables.tf`
- Modify: `providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/eks_gpu_kueue_poc.tftest.hcl`
- Modify: `.github/workflows/terraform-tests.yaml`

**Interfaces:**
- Consumes: private EKS cluster name and private-network subnet outputs.
- Produces: one scale-to-zero NVIDIA EKS managed node group; no Helm or Kubernetes resources.

- [ ] **Step 1: Write failing ownership tests**

Add static assertions:

```bash
module=providers/aws/infra/terraform/modules/eks-gpu-node/main.tf
test -f "$module"
grep -q 'resource "aws_eks_node_group" "gpu"' "$module"
! grep -q 'helm_release' "$module"
! grep -q 'kubernetes_manifest' "$module"
! grep -q 'cloudai-platform-eks-sandbox' providers/aws/infra/terraform/envs/eks-gpu-kueue-poc/variables.tf
```

Terraform tests must assert:

```hcl
assert {
  condition     = var.gpu_min_size == 0 && var.gpu_desired_size == 0 && var.gpu_max_size == 1
  error_message = "GPU capacity must default to zero and remain bounded to one node."
}
```

- [ ] **Step 2: Run tests and verify failure**

```bash
test -f providers/aws/infra/terraform/modules/eks-gpu-node/main.tf
```

Expected: exit 1.

- [ ] **Step 3: Move only the node group to the new module**

Use:

```hcl
resource "aws_eks_node_group" "gpu" {
  cluster_name    = var.cluster_name
  node_group_name = "${var.cluster_name}-gpu-poc"
  node_role_arn   = var.gpu_node_role_arn
  subnet_ids      = var.subnet_ids
  ami_type        = "AL2023_x86_64_NVIDIA"
  capacity_type   = "ON_DEMAND"
  instance_types  = [var.gpu_instance_type]

  scaling_config {
    min_size     = var.gpu_min_size
    desired_size = var.gpu_desired_size
    max_size     = var.gpu_max_size
  }

  labels = { "cloudai.platform/workload-class" = "gpu-poc" }
  taint {
    key    = "gpu-poc"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

The environment consumes private cluster/network state or reviewed outputs; its
cluster validation must require the private cluster name category, not a fixed
destroyed sandbox name.

- [ ] **Step 4: Remove Kubernetes resources from Terraform ownership**

Remove `helm_release` and `kubernetes_manifest` resources from the capacity
composition. Keep the old module only until state migration is proven; add
`moved` blocks for the node group if its resource address changes. Do not apply
the refactor until a state-only plan proves no node recreation.

- [ ] **Step 5: Run tests**

```bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-node init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/eks-gpu-node test
terraform -chdir=providers/aws/infra/terraform/envs/eks-gpu-kueue-poc test
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add providers/aws/infra/terraform/modules/eks-gpu-node providers/aws/infra/terraform/envs/eks-gpu-kueue-poc .github/workflows/terraform-tests.yaml
git commit -m "refactor: separate GPU capacity from platform delivery"
```

### Task 2: Create the secure Kueue workload chart

**Files:**
- Create: `helm/gpu-workload-poc/Chart.yaml`
- Create: `helm/gpu-workload-poc/values.yaml`
- Create: `helm/gpu-workload-poc/templates/namespace.yaml`
- Create: `helm/gpu-workload-poc/templates/serviceaccount.yaml`
- Create: `helm/gpu-workload-poc/templates/resourceflavor.yaml`
- Create: `helm/gpu-workload-poc/templates/clusterqueue.yaml`
- Create: `helm/gpu-workload-poc/templates/localqueue.yaml`
- Create: `helm/gpu-workload-poc/templates/networkpolicy.yaml`
- Create: `helm/gpu-workload-poc/templates/job.yaml`
- Create: `providers/aws/app/api/tests/gpuWorkloadHelmAssets.test.ts`

**Interfaces:**
- Consumes: reviewed CUDA image digest, Kueue CRDs and GPU node label/taint.
- Produces: `gpu-poc` namespace, queue objects, secure service account, deny-by-default NetworkPolicy and suspended CUDA Job.

- [ ] **Step 1: Write failing Helm render tests**

Render with:

```bash
helm template cloudai-gpu helm/gpu-workload-poc \
  --set image.repository=example.invalid/cloudai-cuda \
  --set image.digest=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

Assert the render contains:

```text
automountServiceAccountToken: false
runAsNonRoot: true
allowPrivilegeEscalation: false
seccompProfile:
  type: RuntimeDefault
kueue.x-k8s.io/queue-name: gpu-poc
suspend: true
nvidia.com/gpu: 1
policyTypes:
- Ingress
- Egress
```

Reject `latest`, privileged containers, hostPath, hostNetwork and wildcard
egress.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/gpuWorkloadHelmAssets.test.js
```

Expected: FAIL because the chart does not exist.

- [ ] **Step 3: Create the namespace and identity boundary**

The service account is:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cuda-workload
  namespace: gpu-poc
automountServiceAccountToken: false
```

Apply Pod Security labels to the namespace and add only explicit DNS/telemetry
egress required by the Job. The deterministic CUDA Job itself needs no Internet
egress.

- [ ] **Step 4: Create Kueue resources and Job**

Keep resource names from the current POC:

```text
ResourceFlavor: gpu-poc-on-demand
ClusterQueue: gpu-poc-cluster
LocalQueue: gpu-poc
Job: cuda-vector-add
```

The Job uses `serviceAccountName: cuda-workload`, one GPU request/limit,
`backoffLimit: 0`, `activeDeadlineSeconds: 300`, and
`ttlSecondsAfterFinished: 900`.

- [ ] **Step 5: Run and commit**

```bash
helm lint helm/gpu-workload-poc
cd providers/aws/app/api && pnpm test
git add helm/gpu-workload-poc providers/aws/app/api/tests/gpuWorkloadHelmAssets.test.ts
git commit -m "feat: add secure Kueue GPU workload chart"
```

### Task 3: Build an immutable deterministic CUDA vector-add image

**Files:**
- Create: `providers/aws/app/cuda-vector-add/vector_add.cu`
- Create: `providers/aws/app/cuda-vector-add/Dockerfile`
- Create: `providers/aws/app/cuda-vector-add/test-vector-add-contract.sh`
- Create: `.github/workflows/build-cuda-vector-add.yml`
- Modify: `.github/workflows/terraform-tests.yaml`

**Interfaces:**
- Consumes: reviewed digest-pinned CUDA devel and runtime base images.
- Produces: private ECR image digest that prints `VECTOR_ADD_PASS count=4096` only after CPU verification of all GPU results.

- [ ] **Step 1: Write the failing source contract test**

```bash
grep -q '__global__ void vectorAdd' providers/aws/app/cuda-vector-add/vector_add.cu
grep -q 'VECTOR_ADD_PASS count=4096' providers/aws/app/cuda-vector-add/vector_add.cu
grep -q 'ARG CUDA_DEVEL_BASE_IMAGE' providers/aws/app/cuda-vector-add/Dockerfile
grep -q 'ARG CUDA_RUNTIME_BASE_IMAGE' providers/aws/app/cuda-vector-add/Dockerfile
! grep -Eq '^FROM [^@]+:[^ ]+$' providers/aws/app/cuda-vector-add/Dockerfile
```

- [ ] **Step 2: Run and verify failure**

```bash
bash providers/aws/app/cuda-vector-add/test-vector-add-contract.sh
```

Expected: FAIL because the sources are absent.

- [ ] **Step 3: Implement deterministic vector addition**

Allocate three arrays of 4096 `float` values. Initialise `a[i] = i` and
`b[i] = 4096 - i`. Launch the kernel, synchronise, copy the result, and fail if
any `c[i] != 4096`. Check every CUDA API return and print only the bounded pass
line on success.

- [ ] **Step 4: Create the multi-stage Dockerfile**

```dockerfile
ARG CUDA_DEVEL_BASE_IMAGE
FROM ${CUDA_DEVEL_BASE_IMAGE} AS build
WORKDIR /src
COPY vector_add.cu .
RUN nvcc -O2 -o /out/vector-add vector_add.cu

ARG CUDA_RUNTIME_BASE_IMAGE
FROM ${CUDA_RUNTIME_BASE_IMAGE}
COPY --from=build /out/vector-add /usr/local/bin/vector-add
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/vector-add"]
```

The protected workflow rejects either base image unless it ends with
`@sha256:<64 lowercase hex characters>`.

- [ ] **Step 5: Create protected build and publish workflow**

Use GitHub OIDC, the existing private ECR publishing boundary and no local AWS
credentials. Scan the image, push once, resolve the manifest digest, and publish
only:

```json
{"image_built":true,"scan_gate_passed":true,"digest_resolved":true}
```

The private handoff may record the digest; the public artifact may not.

- [ ] **Step 6: Run source tests and commit**

```bash
bash providers/aws/app/cuda-vector-add/test-vector-add-contract.sh
cd providers/aws/app/api && pnpm test
git add providers/aws/app/cuda-vector-add .github/workflows/build-cuda-vector-add.yml .github/workflows/terraform-tests.yaml
git commit -m "feat: add deterministic CUDA validation image"
```

### Task 4: Deliver Kueue, device plugin and workload through ARC/Argo CD

**Files:**
- Create: `argocd/applications/nvidia-device-plugin-sandbox.yaml`
- Create: `argocd/applications/kueue-sandbox.yaml`
- Create: `argocd/applications/gpu-workload-poc.yaml`
- Create: `.github/workflows/arc-gpu-platform-delivery.yml`
- Modify: `scripts/validate-argocd-gitops.sh`
- Modify: `docs/solutions/eks-gpu-kueue-poc-runbook.md`

**Interfaces:**
- Consumes: ARC runner scale set, Argo CD, reviewed chart versions and CUDA image digest.
- Produces: ordered, GitOps-reconciled device plugin, Kueue control plane and suspended GPU workload.

- [ ] **Step 1: Add failing GitOps validation**

```bash
for app in nvidia-device-plugin-sandbox kueue-sandbox gpu-workload-poc; do
  test -f "argocd/applications/${app}.yaml"
done
grep -q 'targetRevision: 0.17.0' argocd/applications/nvidia-device-plugin-sandbox.yaml
grep -q 'targetRevision: 0.11.0' argocd/applications/kueue-sandbox.yaml
grep -q 'automated:' argocd/applications/gpu-workload-poc.yaml
```

The versions are the currently reviewed source baseline. A later upgrade is a
separate reviewed commit.

- [ ] **Step 2: Run and verify failure**

```bash
bash scripts/validate-argocd-gitops.sh
```

Expected: FAIL because the applications are absent.

- [ ] **Step 3: Create ordered Argo applications**

Use sync waves:

```text
0: NVIDIA device plugin
1: Kueue controller and CRDs
2: gpu-workload-poc chart
```

Use automated prune/self-heal only for the dedicated sandbox namespaces and
resources. Do not let the application own the GPU node group or IAM.

- [ ] **Step 4: Create the ARC delivery workflow**

Run on `cloudai-private-eks`. Source modes run Helm/Argo validation. Protected
`sync` requires:

```text
I_UNDERSTAND_ARC_GPU_PLATFORM_SYNC
```

The workflow must verify it cannot create namespaces outside the approved
platform/workload set and cannot call Terraform or EC2/EKS lifecycle APIs.

- [ ] **Step 5: Run source checks and commit**

```bash
bash scripts/validate-argocd-gitops.sh
cd providers/aws/app/api && pnpm test
git add argocd/applications .github/workflows/arc-gpu-platform-delivery.yml scripts/validate-argocd-gitops.sh docs/solutions/eks-gpu-kueue-poc-runbook.md
git commit -m "feat: deliver GPU platform through ARC and Argo"
```

### Task 5: Add Kueue positive and negative behavioural validation

**Files:**
- Create: `scripts/validate-kueue-gpu-scenarios.sh`
- Create: `scripts/tests/test-kueue-gpu-scenarios.sh`
- Modify: `.github/workflows/terraform-eks-gpu-kueue-poc.yml`
- Create: `shared/examples/ai-workload-readiness/kueue-behavioural-cases.json`
- Modify: `providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts`

**Interfaces:**
- Consumes: Kueue LocalQueue, one-GPU quota, secure vector-add Job.
- Produces: admitted, queued, rejected, cancelled, expired and failed evidence categories.

- [ ] **Step 1: Write failing case-contract tests**

The case file must contain exactly:

```json
[
  {"name":"admitted-and-succeeded","expected":"SUCCEEDED"},
  {"name":"queued-no-capacity","expected":"QUEUED"},
  {"name":"rejected-unapproved-queue","expected":"REJECTED"},
  {"name":"cancelled-before-admission","expected":"CANCELLED"},
  {"name":"expired-queue-wait","expected":"EXPIRED"},
  {"name":"failed-cuda-result","expected":"FAILED"}
]
```

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api && pnpm test
```

Expected: FAIL because the case file is missing.

- [ ] **Step 3: Implement the validator**

The script accepts a case name, applies only the reviewed fixture, waits with a
bounded timeout, checks Kueue conditions and Job outcome, and removes the case.
It emits only:

```json
{"case":"admitted-and-succeeded","expected_state":"SUCCEEDED","observed":true,"capacity_released":true}
```

Never upload pod logs or object YAML.

- [ ] **Step 4: Add protected runtime mode**

Rename the workflow's Kubernetes validation mode to `runtime-validate` and run
all six cases only after the GPU node is Ready. Stop the GPU node to desired
size zero in an `always()` cleanup job if validation or artifact upload fails.

- [ ] **Step 5: Run source tests and commit**

```bash
bash scripts/tests/test-kueue-gpu-scenarios.sh
cd providers/aws/app/api && pnpm test
git add scripts/validate-kueue-gpu-scenarios.sh scripts/tests/test-kueue-gpu-scenarios.sh .github/workflows/terraform-eks-gpu-kueue-poc.yml shared/examples/ai-workload-readiness/kueue-behavioural-cases.json providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts
git commit -m "test: add Kueue GPU behavioural cases"
```

### Task 6: Add DCGM, Prometheus and Grafana GPU evidence

**Files:**
- Create: `argocd/applications/dcgm-exporter-sandbox.yaml`
- Create: `observability/dcgm-exporter-values.yaml`
- Create: `observability/prometheus-rules/gpu-workload-rules.yaml`
- Create: `helm/ai-api-service/dashboards/cloudai-gpu-workload-dashboard.json`
- Modify: `observability/kube-prometheus-stack-values.yaml`
- Modify: `providers/aws/app/api/tests/observabilityAssets.test.ts`
- Create: `docs/solutions/gpu-dcgm-prometheus-grafana-runbook.md`

**Interfaces:**
- Consumes: DCGM metrics, Kueue/job metrics and workload control-plane time windows.
- Produces: bounded GPU health, allocation, task-goodput and cost views.

- [ ] **Step 1: Write failing observability asset tests**

Require panels:

```text
Queue wait and admission
GPU allocation and utilisation
GPU memory
GPU power and temperature
GPU hardware errors
Task goodput and failed-job waste
GPU-hours and estimated cost
Telemetry collection health
```

Reject `jobId`, `executionId`, `traceId`, `user`, pod UID and free-form error in
dashboard PromQL labels or legends.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/observabilityAssets.test.js
```

Expected: FAIL because DCGM assets are absent.

- [ ] **Step 3: Configure DCGM Exporter**

Use a reviewed exact chart version passed by the protected environment and a
digest-pinned image. Target only nodes labelled
`cloudai.platform/workload-class=gpu-poc`; tolerate only the `gpu-poc=true`
taint. Enable ServiceMonitor with labels matching the kube-prometheus-stack
selector.

- [ ] **Step 4: Add bounded recording and alert rules**

Record cluster/queue/workload-class aggregates, not execution IDs. Include:

```promql
sum(DCGM_FI_DEV_GPU_UTIL{workload_class="gpu-poc"})
sum(DCGM_FI_DEV_FB_USED{workload_class="gpu-poc"})
max(DCGM_FI_DEV_GPU_TEMP{workload_class="gpu-poc"})
sum(increase(cloudai_workload_task_goodput_total[1h]))
```

Add alerts for exporter absent, GPU temperature above the reviewed sandbox
threshold, hardware error increase, and GPU allocated with no task goodput.

- [ ] **Step 5: Run tests and commit**

```bash
cd providers/aws/app/api && pnpm test
git add argocd/applications/dcgm-exporter-sandbox.yaml observability/dcgm-exporter-values.yaml observability/prometheus-rules/gpu-workload-rules.yaml helm/ai-api-service/dashboards/cloudai-gpu-workload-dashboard.json observability/kube-prometheus-stack-values.yaml providers/aws/app/api/tests/observabilityAssets.test.ts docs/solutions/gpu-dcgm-prometheus-grafana-runbook.md
git commit -m "feat: add bounded GPU operational evidence"
```

### Task 7: Run the bounded GPU exercise and failure controls

**Files:**
- Modify after run: `docs/solutions/eks-gpu-kueue-poc-runbook.md`
- Modify after run: `docs/solutions/gpu-dcgm-prometheus-grafana-runbook.md`
- Modify after run: `docs/practices/current-status.md`
- Create locally: `_private/docs/notes/private-eks-gpu-runtime-record-2026-08-28.md`

**Interfaces:**
- Consumes: reviewed GPU quota/offering, cost guardrails, private EKS/ARC path, digest-pinned CUDA image and Tasks 1–6.
- Produces: sanitised end-to-end sandbox evidence and scale-to-zero proof.

- [ ] **Step 1: Run read-only discovery**

Confirm private subnet/AZ offering, quota, chart versions, base-image digests,
ECR digest and maximum exercise cost. Do not write GitHub environment values
automatically.

- [ ] **Step 2: Review and configure protected values**

Manually review the private evidence, then set only the approved non-secret
environment variables. Keep role ARNs and credentials in secrets where the
existing environment contract requires them.

- [ ] **Step 3: Run GPU plan and review same-run cost boundary**

Expected: one node maximum, desired one only for apply, private subnets, no
network/EKS recreation, and no unrelated deletes.

- [ ] **Step 4: Apply after a new exact confirmation**

Use the GPU workflow's reviewed apply phrase. Wait for node Ready, device plugin
and one allocatable GPU. Abort and stop on timeout.

- [ ] **Step 5: Sync platform components through ARC and Argo**

Use `I_UNDERSTAND_ARC_GPU_PLATFORM_SYNC`. Verify Kueue, Prometheus, Grafana and
DCGM readiness before submitting the workload.

- [ ] **Step 6: Run deterministic and behavioural validation**

Expected: vector-add pass, all six Kueue cases match, capacity is released, and
the dashboard/evidence pack correlates queue, job, GPU, result and estimated
cost categories.

- [ ] **Step 7: Exercise security and reliability failures**

Prove denied unapproved queue, denied mutable image, denied service-account
token use, exporter absence, queue timeout, failed CUDA result, runner
revocation and Argo rollback. Each case records detection, containment and
recovery Booleans only.

- [ ] **Step 8: Stop GPU capacity in the same exercise window**

Run the protected stop mode in `always()` cleanup and confirm desired GPU count
zero. Do not destroy private EKS or the network.

- [ ] **Step 9: Commit public evidence status**

```bash
git add docs/solutions/eks-gpu-kueue-poc-runbook.md docs/solutions/gpu-dcgm-prometheus-grafana-runbook.md docs/practices/current-status.md
git commit -m "docs: record bounded GPU platform validation"
```
