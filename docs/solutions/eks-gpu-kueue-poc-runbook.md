# EKS GPU + Kueue POC Runbook

This runbook defines the manual, protected operation of the synthetic EKS GPU + Kueue proof of concept. It is an implementation and operating contract, not evidence of a currently deployed GPU workload.

## Scope

The POC demonstrates one short CUDA smoke-test Job under Kueue admission control. It uses only synthetic metadata and a digest-pinned CUDA image. It does not process customer, personal, internal, production, or model-training data.

The current bounded POC source path attaches only to the existing public-subnet
personal EKS sandbox when that cluster is `ACTIVE`. If the sandbox was
previously destroyed, stop here: recover the baseline sandbox through its
separately approved Terraform workflow before attempting this POC. The GPU
workflow does not create a new EKS control plane. A separate private EKS target
now exists for Enterprise AI/GPU architecture, but its ordinary private-worker
bootstrap must pass before this GPU path is migrated or treated as runtime
evidence.

## Boundaries

| Control | Required boundary |
| --- | --- |
| GPU capacity | One on-demand GPU node maximum: `min=0`, `desired=0` outside an approved run, `max=1`. |
| Device management | NVIDIA device plugin, not DRA; do not install both mechanisms on the same GPU node. |
| Workload | One synthetic Kubernetes Job; one `nvidia.com/gpu` request and limit. |
| Runtime | `activeDeadlineSeconds: 300`, `backoffLimit: 0`, and `ttlSecondsAfterFinished: 900`. |
| Admission | Kueue `ResourceFlavor`, `ClusterQueue`, and `LocalQueue`; no borrowing and no preemption. |
| Delivery | Terraform and protected GitHub Actions OIDC only; no console resource creation or `kubectl apply`. |
| Cost | AUD 75 is an alert threshold, not a hard cap. |
| Teardown | This workflow does not provide a destroy mode. Any teardown needs a separate reviewed plan and explicit confirmation. |

## Required GitHub environment values

The `aws-sandbox` environment retains the existing private backend and OIDC values. The GPU workflow additionally requires:

- `TF_VAR_GPU_INSTANCE_TYPE`: approved on-demand GPU type available in the selected region and Availability Zone.
- `TF_VAR_GPU_POC_SUBNET_IDS`: JSON list of explicitly reviewed EKS subnet IDs. In the current public-sandbox POC these are selected existing sandbox subnets; a future private-target run must use private subnets from `eks-private-sandbox` and its separate state boundary.
- `TF_VAR_CUDA_SMOKE_IMAGE`: digest-pinned CUDA image; tags are rejected.
- `TF_VAR_KUEUE_CHART_VERSION`: reviewed Kueue Helm chart version.
- `GPU_POC_BUDGET_ALERT_CONFIGURED=true`: human confirmation that the budget alert is enabled outside GitHub Actions.

No value above authorises a run by itself. A protected environment approval and the applicable exact confirmation are still required.

## Operation sequence

1. Run read-only `preflight`. It must confirm that the EKS sandbox is `ACTIVE`, the GPU quota and selected-type offering in every approved subnet Availability Zone are available, the CUDA image is immutable, and the budget-alert readiness flag is true.
2. Run `plan`. Review the Terraform result without publishing plans, state, endpoints, account IDs, ARNs, kubeconfig, or raw cloud output.
3. Run `apply` only after protected environment approval and `I_UNDERSTAND_EKS_GPU_KUEUE_POC_APPLY`. Apply temporarily sets dedicated GPU desired capacity to `1`; Kueue does not scale an EKS managed node group.
4. Run `validate`. It must observe a Ready GPU node with exactly one allocatable GPU, Kueue quota reservation and admission, and Job completion within the five-minute deadline.
5. Run `stop` only after protected environment approval and `I_UNDERSTAND_EKS_GPU_KUEUE_POC_STOP`. Stop sets only dedicated GPU desired capacity to `0`; it preserves the Terraform definition and state for a later approved demonstration.

If preflight, plan, admission, GPU allocation, or Job completion fails, do not retry by increasing quota, selecting another instance type, creating another node, or broadening permissions. Capture sanitised failure category evidence and stop for review.

## Sanitised evidence

Retain only these fields in public notes or GitHub artifacts:

- preflight pass/fail categories;
- region label and approved instance-class label, with no account identifiers;
- EKS cluster active status;
- GPU node Ready state and allocatable GPU count;
- Kueue `ResourceFlavor`, `LocalQueue`, quota-reserved state, and admitted state;
- Job start/completion/failure state and runtime;
- declared one-node, five-minute, two-hour, and budget-alert boundaries;
- operator outcome: continue, stop, investigate, or prepare a separately approved teardown plan.

Do not retain raw node names, account IDs, ARNs, IP addresses, kubeconfig, backend values, registry credentials, full Terraform plans, or unredacted logs.

## Status statement

The source path is intended to make this POC repeatable and reviewable. A live GPU POC is not claimed until a protected apply has completed and the sanitised evidence above has been reviewed.
