# Bounded EKS GPU + Kueue Proof of Concept Design

**Linear:** YY-38 under YY-11

**Status:** Design ready for review. This document creates no AWS resources.
**Purpose:** Define the first small, synthetic GPU proof point that turns the AI Factory readiness guidance into an auditable EKS and Kueue delivery path.

## Decision

The POC attaches only to an existing, `ACTIVE` personal EKS sandbox in `ap-southeast-2` and adds a separate Terraform-managed on-demand GPU managed node group. One short CUDA smoke-test Job runs under Kueue admission control. GitHub Actions through the protected `aws-sandbox` environment and short-lived GitHub OIDC credentials is the only mutation path. If the previous EKS sandbox has been destroyed, GPU POC preflight fails closed; EKS recovery remains a separate, explicitly approved operation.

The repository's EKS sandbox target is Kubernetes 1.31. The POC therefore uses the NVIDIA Kubernetes device plugin, not Dynamic Resource Allocation (DRA). AWS recommends DRA for new static-capacity deployments on Kubernetes 1.34 or later. A future upgrade needs a separate design review; DRA and the device plugin must not coexist on a GPU node.

This is a platform-admission and operations proof, not a performance benchmark. It runs no customer or personal data, model serving, inference, external tools, persistent application, or autonomous agent.

## Scope

In scope:

- Dedicated EKS GPU node group separate from the default CPU node group.
- One synthetic `batch/v1` CUDA Job proving GPU allocation with `nvidia-smi`.
- Kueue through Terraform and Helm: `ResourceFlavor`, `ClusterQueue`, and `LocalQueue`.
- Protected Terraform and GitHub Actions OIDC delivery, preflight, validation, evidence, scale-to-zero, rollback, and future-teardown boundaries.

Not in scope:

- HyperPod, Slurm, AWS Batch, a data-centre environment, distributed training, model serving, RAG, Spot capacity, GPU sharing, borrowing, preemption, GPU Operator, DCGM, Prometheus, Grafana, or custom Kueue admission controllers.
- Manual AWS-console or `kubectl` resource creation.
- Automatic deletion or a claimed hard cloud-spend cap.

## Architecture

```text
GitHub workflow_dispatch
  -> protected aws-sandbox approval
  -> GitHub OIDC short-lived role
  -> read-only preflight
  -> Terraform plan and explicitly confirmed apply
  -> one-node-max EKS GPU managed node group
  -> NVIDIA device plugin
  -> Kueue and native queue objects
  -> synthetic CUDA Job
  -> Kueue admission and GPU allocation
  -> sanitised evidence
  -> explicitly confirmed scale-to-zero or later teardown review
```

The EKS control plane, default CPU node group, remote Terraform backend, lock table, and protected GitHub environment stay shared. The GPU component uses separate Terraform state so GPU failures cannot alter baseline EKS topology.

## GPU and admission contract

The dedicated GPU node group has these mandatory boundaries:

- On-demand capacity, `min=0`, `desired=0` outside an approved POC run, and `max=1`.
- One approved instance type and Availability Zone. Preflight rejects unavailable capacity; it must never select a more expensive substitute.
- An EKS accelerated AMI compatible with the selected type and Kubernetes 1.31.
- No SSH, public workload endpoint, or EKS API CIDR broadening.
- Label `cloudai.platform/workload-class=gpu-poc` and a matching `NoSchedule` taint.
- Project, environment, owner, cost-allocation, purpose, and stop-deadline tags.

The NVIDIA device plugin must expose exactly one allocatable `nvidia.com/gpu` before the Job runs. A Ready node without this allocatable GPU fails validation.

The `gpu-poc` namespace contains:

| Resource | Name | Contract |
| --- | --- | --- |
| `ResourceFlavor` | `gpu-poc-on-demand` | Matches the labelled and tainted GPU node group. |
| `ClusterQueue` | `gpu-poc-cluster` | Nominal quota for one `nvidia.com/gpu`, bounded CPU and memory, no borrowing or preemption. |
| `LocalQueue` | `gpu-poc` | Sole permitted queue for the CUDA Job. |

The Job declares `kueue.x-k8s.io/queue-name: gpu-poc` and requests and limits exactly one GPU. Native Kueue quota-reservation and admitted conditions, including the assigned `ResourceFlavor`, are the admission evidence. The POC does not imply a custom `AdmissionCheck` controller.

## Synthetic Job contract

The `batch/v1` Job:

- Uses a CUDA image by immutable digest; CI rejects a tag-only image.
- Runs `nvidia-smi` and emits only GPU model, driver version, and total memory.
- Uses `restartPolicy: Never`, `backoffLimit: 0`, `activeDeadlineSeconds: 300`, and `ttlSecondsAfterFinished: 900`.
- Selects and tolerates only the GPU POC node.
- Has no mounted credentials, service-account cloud permissions, input data volume, model artifact, or added external network dependency.
- Produces sanitised timestamps and states for submission, admission, allocation, completion, and runtime.

Raw node names, account IDs, IP addresses, registry credentials, and unredacted log dumps are excluded from public artifacts.

## Delivery and identity model

Implementation creates the following ordered workflow contract:

1. **Preflight (read-only):** verifies that the named EKS sandbox exists and is `ACTIVE`, then verifies regional quota, one eligible instance offering, EKS version, AMI compatibility, protected environment, OIDC identity, image digest, and a human-owned budget alert. It uploads sanitised pass/fail evidence. A missing or inactive cluster is a recovery prerequisite, not a reason to create a cluster in this workflow.
2. **Plan:** runs Terraform formatting, validation, and a backend-backed plan without mutation.
3. **Apply:** requires `aws-sandbox` approval, a POC-specific exact confirmation, and a current successful preflight. It sets dedicated GPU desired capacity to `1` for the bounded smoke-test window because Kueue does not scale an EKS managed node group, then Terraform creates all POC resources.
4. **Validate:** verifies node readiness, GPU allocation, Kueue admission, and Job completion; it fails closed on any missing evidence.
5. **Stop:** changes desired GPU capacity to zero only after a distinct confirmation. It preserves definitions and state for repeatable demos.
6. **Teardown:** is excluded from YY-38. A separate plan and explicit confirmation are required before any deletion workflow exists or runs.

The existing EKS confirmation strings do not authorise GPU POC changes. The implementation plan defines the new exact strings so a design statement cannot be mistaken for operational authority.

GitHub Actions uses a short-lived OIDC role scoped to the POC state, named EKS cluster and node group, required Kubernetes API access, and supporting read-only EC2/EKS queries. `iam:PassRole` is restricted to the POC node role. It receives no billing, payment-method, broad administrator, long-lived credential, or Bedrock permissions.

Billing remains outside GitHub Actions. The personal account uses an MFA-protected human IAM identity with billing-read and tightly scoped budget-management rights. The POC can check only a non-sensitive budget-alert readiness signal.

## Cost, quota, and failure boundaries

AWS Budgets sends alerts; it does not stop an instance. The layered bounds are:

| Control | Bound |
| --- | --- |
| Capacity | One on-demand GPU node maximum. |
| Lifecycle | `min=0` and `desired=0` except during an approved POC run. |
| Job | Five-minute deadline and no retry. |
| Workflow | Validation completes within two hours of apply approval. |
| Alert | AUD 75 notification threshold, explicitly not a hard cap. |
| Quota | Preflight requires sufficient regional quota and an eligible offering. |
| Stop | A separately confirmed scale-to-zero action ends GPU compute without deletion. |

A failed preflight, plan, admission, allocation, or Job stops the workflow. It may not create a second GPU node, increase quota, choose a different instance type, expand permissions, or retry the Job. An apply failure preserves state and sanitised diagnostics for a reviewed corrective plan or distinct stop action. Terraform state is never tainted, untainted, imported, or manually edited without a separate recovery runbook and confirmation.

## Evidence and acceptance checks

The initial POC uses Kubernetes native status, EKS node state, workflow logs, and existing CloudWatch account evidence. It does not add DCGM, Prometheus, Grafana, OpenTelemetry, or a monitoring stack.

The public-safe evidence set contains only the preflight result category, region and instance-class labels, node readiness and allocatable GPU count, Kueue quota-reserved and admitted state, selected queues/flavor, Job state/runtime, declared limits, and operator decision.

Before a live apply is permitted, repository tests must cover:

- Terraform format, validation, and a no-credential test plan.
- OIDC-only, protected-environment, explicit-confirmation, no-schedule, and no-destroy workflow boundaries.
- Immutable image digest, one-GPU request/limit, deadline, no retry, node label/taint, and LocalQueue manifest contract.
- Kueue object names and one-GPU nominal quota with no borrowing or preemption.
- Documentation boundaries: synthetic-only, no clickops, no simultaneous DRA/device plugin, alert-not-hard-cap, and no teardown without a confirmation.

Live success requires the documented evidence chain: **admission -> GPU health -> queue/workload state -> bounded completion -> cost boundary**. It does not claim long-term GPU utilisation, SLOs, or cost trends.

## Future teardown boundary

A future teardown plan must enumerate the GPU node group, device plugin, Kueue release and resources, namespace, Job, associated IAM policies, any ECR asset, and CloudWatch retention. It must use a fresh Terraform plan, protected approval, a precise confirmation, post-destroy verification, and sanitised evidence. This design grants no deletion authority.

## Interview story

> I designed a bounded EKS GPU proof of concept as a governed platform path rather than a one-off CUDA demo. It uses Terraform and protected GitHub Actions OIDC to add a one-node GPU pool, Kueue admission control, immutable synthetic workload inputs, native allocation evidence, a five-minute runtime limit, a two-hour operational window, and a separately confirmed scale-to-zero path. It separates capacity, admission, GPU health, workload completion, cost alerts, and teardown authority.

## References

- [Amazon EKS device management](https://docs.aws.amazon.com/eks/latest/userguide/device-management.html)
- [Amazon EKS NVIDIA DRA device plugin](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html)
- [Amazon EC2 instance quotas](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-quotas.html)
- [Kueue installation](https://kueue.sigs.k8s.io/docs/getting-started/installation/)
- [Kueue job integration](https://kueue.sigs.k8s.io/docs/tasks/run/jobs/)
- [Kueue admission](https://kueue.sigs.k8s.io/docs/concepts/admission/)
- [Kueue ResourceFlavor](https://kueue.sigs.k8s.io/docs/concepts/resource_flavor/)
