# AI Factory, GPU, and AI Data-Centre Workload Readiness

## Status and boundary

**Source implementation ready — no live GPU or AI data-centre deployment.**

This document defines the readiness model for future accelerated workloads in
the CloudAI Platform portfolio. The [EKS GPU + Kueue POC design](../solutions/eks-gpu-kueue-poc-design.md)
now has a Terraform and protected GitHub Actions source implementation, but
that source implementation is not a deployed GPU runtime. It does not create a
GPU node, Kubernetes GPU operator, SageMaker HyperPod cluster, Slurm scheduler,
model-training job, or data-centre resource by default. Any future sandbox run
requires its separate reviewed design, budget, quota, access, observability,
rollback, and teardown controls.

The goal is to answer an architecture question before selecting hardware:

> Can this workload be admitted, placed, operated, measured, paused, and
> retired safely on scarce accelerated capacity?

## Core architecture view

GPU readiness is a workload and operating-model problem, not only a cluster
provisioning problem. The platform must connect business intent, data boundary,
accelerator placement, scheduling, observability, FinOps, resilience, and
retirement evidence.

```mermaid
flowchart LR
  proposal["Business use case<br/>owner + risk tier"]
  contract["AI workload contract<br/>class + data + SLO + budget"]
  gate["Readiness gate<br/>identity · quota · cost · safety"]

  subgraph control["Platform control plane"]
    policy["Policy and admission<br/>approved image/model/data"]
    placement["Placement decision<br/>latency · capacity · locality · cost"]
    evidence["Evidence record<br/>owner · trace · usage · outcome"]
  end

  subgraph compute["Compute and runtime options"]
    service["GPU service inference<br/>Kubernetes or managed endpoint"]
    batch["Batch / fine-tuning<br/>queue and preemption"]
    dist["Distributed training<br/>multi-node fabric + storage"]
  end

  subgraph ops["Operations plane"]
    gpuobs["GPU and workload telemetry<br/>DCGM · node · network · job"]
    finops["FinOps and capacity<br/>GPU-hours · queue · idle · energy"]
    resilience["Resilience and closure<br/>retry · checkpoint · pause · retire"]
  end

  proposal --> contract --> gate --> policy --> placement
  placement --> service
  placement --> batch
  placement --> dist
  service --> gpuobs
  batch --> gpuobs
  dist --> gpuobs
  gpuobs --> evidence
  finops --> evidence
  resilience --> evidence
  evidence --> contract
  policy -. "deny / request review" .-> gate
```

## Workload profiles

The profile determines the scheduling, observability, cost, and resilience
requirements. A single GPU platform should not treat all workloads as one
homogeneous queue.

| Profile | Primary objective | Capacity shape | Required controls |
| --- | --- | --- | --- |
| Interactive inference | Meet user-facing latency and availability targets | Reserved or autoscaled accelerators; predictable concurrency | latency SLO, model/version rollout, token and request budget, fallback path |
| Agent/RAG inference | Complete a bounded task with retrieval/tool context | Mixed CPU/GPU capacity; bursty multi-call sessions | workload identity, tool boundary, trace correlation, behavioural evaluation, human escalation |
| Batch inference | Complete a large job economically | Queue-based, retryable, interruptible capacity | priority, retry limit, completion criterion, output retention, cost ceiling |
| Fine-tuning | Produce an evaluated model or adapter | Accelerator reservation with checkpoint storage | dataset lineage, checkpoint policy, evaluation gate, quota and spend stop |
| Distributed training | Scale a training job across nodes | Topology-aware GPUs, high-throughput storage and fabric | gang scheduling, checkpoint/restart, node-health evidence, failure recovery |
| Embeddings/RAG indexing | Refresh searchable knowledge safely | CPU/GPU mix with storage and ingestion bandwidth | source lifecycle, idempotency, freshness SLO, provenance and rollback |

## Decision boundaries

### Kubernetes and GPU service workloads

Kubernetes can expose GPUs through device plugins and schedule workloads using
extended resources. The Kubernetes guidance treats GPU resources as schedulable
capacity, while the platform still owns namespace, identity, quotas, network,
image provenance, and lifecycle controls. See the [Kubernetes GPU scheduling documentation](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/).

For a future EKS path, the decision sequence should be:

1. Prove the workload contract locally with synthetic input.
2. Select a supported accelerator and runtime image.
3. Confirm driver, container toolkit, device-plugin, and framework compatibility.
4. Define node groups, taints/tolerations, quotas, topology, and scale limits.
5. Add GPU telemetry and cost attribution before admitting the workload.
6. Validate rollout, rollback, pause, and teardown through GitHub Actions.

### Kueue-aware admission contract

Kubernetes device plugins are the baseline for exposing and scheduling an
allocated GPU as an extended resource. They do not, by themselves, define a
shared-capacity operating model: which team may wait for capacity, who may
borrow it, which prerequisites must pass, or when a job should be preempted.

The workload-readiness schema therefore introduces a **Kueue-aware admission
contract**. The schema remains metadata-only; it records the intent that a
Kueue `LocalQueue` and `ClusterQueue` would enforce:

| Contract field | Future scheduler decision |
| --- | --- |
| `resourceFlavor` | Select the approved accelerator, locality, availability, or price class. |
| `localQueue` and `clusterQueue` | Connect a workload owner to a governed shared-capacity boundary. |
| `cohort` and `borrowingLimit` | Make any capacity sharing explicit rather than implicit. |
| `admissionChecks` | Require budget, image, data-boundary, topology, or human approval before admission. |
| `topologyIntent` and `gangScheduling` | Express locality or all-or-nothing placement intent for multi-node work. |
| `maxQueueWaitSeconds`, retry, and preemption policy | Bound waiting and recovery behaviour before a workload consumes capacity. |

The next fixture task will adopt these fields for each synthetic workload
profile and decide where they become mandatory. This task deliberately leaves
existing fixtures valid while the design contract is introduced.

[Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
is a future advanced allocation path for devices and topology-aware resources;
it does not replace the device-plugin baseline in this portfolio today. The
source path deliberately selects the NVIDIA device plugin rather than DRA. A
live Kueue or DRA deployment requires the separately reviewed GPU POC plan,
Terraform/GitHub Actions delivery path, budget cap, telemetry and teardown
controls.

### SageMaker HyperPod and managed capacity

SageMaker HyperPod is a reference option for larger training, fine-tuning, and
high-throughput inference workloads. Its EKS-orchestrated path includes task
governance, shared capacity, observability, and usage reporting concepts. It is
not a requirement for this project and should not be deployed until a real
workload profile justifies its operational and cost complexity.

The official HyperPod usage-reporting model is useful for this portfolio because
it distinguishes allocated and borrowed compute and can attribute GPU/CPU or
Neuron Core usage to teams and tasks. See [HyperPod usage reporting](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-usage-reporting.html).

### Distributed training and data-centre design

Distributed training adds constraints that are not present in ordinary API
serving:

- gang scheduling and all-or-nothing placement;
- GPU topology, NVLink/NVSwitch, EFA or equivalent fabric;
- checkpoint throughput and restart time;
- shared filesystem/object-storage bandwidth;
- power, cooling, rack, region, and capacity availability;
- provider concentration and reservation risk.

These are design inputs, not reasons to deploy a cluster immediately. A future
AI data-centre readiness review should treat power, cooling, fibre, storage,
accelerator supply, and compliance as external dependencies of the compute
platform.

### National infrastructure and facility readiness

On 26 August 2026, Australia's National Cabinet agreed that large data centres
have material energy, water, and land-use impacts. It also agreed to develop
nationally consistent mandatory standards in these areas, with Commonwealth
legislation intended for early 2027. This is a confirmed policy and regulatory
direction, not a statement that the future legislation, thresholds, or detailed
standards are already in force. See the [official National Cabinet communique](https://www.pm.gov.au/media/meeting-national-cabinet-26-august-26).

The platform should therefore make facility and location evidence an explicit
input when a workload depends on large dedicated or supplier-operated capacity.
Managed-model consumption and small cloud sandboxes should first record whether
this gate is applicable; they must not inherit facility-level requirements by
assumption.

| Readiness concern | Minimum assessment evidence | Decision supported |
| --- | --- | --- |
| Applicability and jurisdiction | Capacity type, site/operator, location, scale threshold when published, and accountable assessor | Apply the correct current requirement without treating a future proposal as enacted law. |
| Energy and grid impact | Power source and capacity, expected peak/base demand, demand flexibility, efficiency measure, expansion assumption, and grid-constraint evidence | Approve, condition, relocate, defer, or right-size the capacity plan. |
| Water and cooling | Cooling design, water source and intensity where available, local scarcity, heat-rejection trade-off, and degraded-mode plan | Identify water, thermal, resilience, and energy trade-offs before site or supplier commitment. |
| Land and location | Planning status, land-use impact, fibre and grid proximity, natural-hazard exposure, sovereignty/data-residency need, and community dependency | Select a location whose operational and approval boundaries are understood. |
| Sustainability and reporting | Named owner, measurement method, evidence period, supplier assumptions, and review cadence | Keep energy, water, emissions, and utilisation claims attributable and reviewable. |
| Regulatory readiness | Current obligations, announced or planned requirements, evidence owner, last review date, and change trigger | Distinguish enforceable controls from watch items and update the architecture when requirements mature. |

The assessment is fail-closed for a material facility or dedicated-capacity
commitment when applicability, ownership, or required evidence is unknown. A
missing future metric whose definition has not yet been published is recorded
as a watch item rather than invented locally.

## Observability model

GPU telemetry must connect hardware health to workload outcomes. A dashboard
showing high utilisation alone does not prove that a job is productive or
meeting its SLO.

### Correlation-first observability panels

The dashboard contract should follow the workload decision, rather than split
GPU, scheduler, and cost signals into unrelated views. Each panel starts with
a named workload and admission record, then joins **admission → GPU health →
queue/checkpoint state → goodput/SLO → cost**. This makes it possible to
distinguish an unhealthy device, unfair queueing, failed recovery, and a
workload that is consuming capacity without delivering a useful outcome.

| Panel | Correlated evidence | Decision owner and response |
| --- | --- | --- |
| Admission and capacity | `resourceFlavor`, queue, cohort, admission checks, wait age, allocation and borrowing | Platform owner verifies fair admission or changes the queue/quota policy. |
| Hardware and runtime health | GPU temperature/power/error, memory, node condition, workload identity and allocated capacity | Platform/SRE isolates unhealthy capacity or investigates the runtime boundary. |
| Progress and recovery | queue wait, retry/preemption, checkpoint duration, completion state and failed-task reason | Workload owner pauses, retries, restores from checkpoint, or corrects the job. |
| Outcome and SLO | time-to-first-token, tokens/sec, task completion/goodput, error rate and degraded-mode outcome | Product owner validates the placement against the workload SLO. |
| FinOps and stop control | GPU-hours, idle/borrowed capacity, token or task cost, budget state and stop condition | Cost owner stops, right-sizes, re-routes, or extends an explicitly approved budget. |

The panel names are a design contract for future synthetic fixtures and a
bounded sandbox. They are not a claim that a dashboard, metrics pipeline, or
GPU runtime currently exists.

### Minimum signal groups

| Signal group | Examples | Decision supported |
| --- | --- | --- |
| Hardware health | temperature, power, memory, XID/error, PCIe/NVLink health | isolate or replace unhealthy capacity |
| GPU utilisation | SM utilisation, memory utilisation, allocation, idle time | right-size and detect stranded capacity |
| Workload performance | queue time, time-to-first-token, tokens/sec, task goodput, error rate | validate SLO and placement |
| Scheduler | pending age, priority, preemption, retries, backoff, quota | tune admission and fairness |
| Storage/network | throughput, latency, EFA/fabric health, checkpoint duration | identify data or fabric bottlenecks |
| Cost/energy | GPU-hours, CPU-hours, borrowed capacity, token cost, energy estimate | stop, charge back, or change placement |

NVIDIA DCGM Exporter is a reference telemetry component for future Kubernetes
GPU nodes. It exposes selected DCGM fields as Prometheus metrics and can map
metrics to Kubernetes pods when configured appropriately. See [NVIDIA DCGM Exporter installation](https://docs.nvidia.com/datacenter/dcgm/latest/installation/install-dcgm-exporter.html) and the [DCGM metric reference](https://docs.nvidia.com/datacenter/dcgm/latest/reference/dcgm-exporter-metrics.html).

For HyperPod, the official observability add-on combines DCGM, node, EFA,
filesystem, Kubernetes, Kueue, and task metrics into Amazon Managed Service
for Prometheus and Amazon Managed Grafana dashboards. CloudWatch remains a
complementary option for infrastructure metrics and alarms. See [HyperPod cluster and task observability](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-cluster-observability-cluster.html).

The project does not currently deploy these GPU tools. The current AgentCore
POC has bounded CloudWatch EMF metrics, dashboards, and alarms; that evidence
is a foundation for the metadata and ownership model, not GPU telemetry proof.

**No DCGM, Prometheus, Grafana, GPU Operator, or live GPU sandbox deployment
is included in this guidance.** The POC source declares a pinned Kueue chart,
but does not claim that Kueue has been deployed or admitted a workload.

## FinOps and capacity controls

The cost unit should be connected to a useful outcome, not only to instance
runtime:

- GPU-hours and CPU-hours by owner, namespace, workload, and environment;
- allocated versus borrowed capacity;
- queue wait and preemption time;
- idle or underutilised accelerator time;
- tokens or completed tasks per GPU-hour;
- checkpoint and storage cost;
- model quality or task goodput per dollar;
- energy or power estimate where the operator can provide it.

Every future workload must declare:

1. budget owner and cost centre;
2. maximum spend or runtime;
3. quota and reservation boundary;
4. stop condition for idle, failed, or low-value execution;
5. retention period for checkpoints, logs, and outputs;
6. rollback or pause procedure.

## Resilience and safety boundaries

The readiness gate must verify more than capacity:

| Gate | Fail-closed condition |
| --- | --- |
| Identity | No named workload identity, owner, or shutdown owner |
| Data | Unclassified data, unapproved egress, or missing provenance |
| Supply chain | Unapproved image, driver, framework, model, or dependency |
| Capacity | No quota, reservation, supported driver/runtime, or placement decision |
| Cost | No budget, cost centre, stop condition, or usage attribution |
| Operations | No telemetry, alert owner, SLO, or incident path |
| Recovery | No checkpoint, retry, rollback, pause, or teardown plan |
| Governance | No human approval for high-risk data, training, or customer impact |
| Facility and location | Material dedicated capacity has no applicability decision, accountable assessor, or required energy, water, land-use, and location evidence |
| Supplier | A material external dependency has no named owner, evidence basis, lifecycle boundary, or reassessment trigger |

Preemption is a design choice, not an outage. Batch and training workloads
should be checkpointable and restartable. Interactive inference should have a
capacity fallback or explicit degraded-mode response. Autonomous agent actions
must remain behind the existing identity, tool, policy, and human-approval
boundaries.

## Current evidence and future work

| Capability | Current project evidence | Next safe increment |
| --- | --- | --- |
| Workload contract | Documentation-first service, batch, fine-tuning, and distributed-training profiles; synthetic Agent/RAG, batch, fine-tuning, and distributed-training fixtures with contract tests | Add an embeddings/RAG-indexing fixture when a new readiness decision requires it |
| Cloud foundations | Terraform, GitHub OIDC, IAM, EKS release patterns, bounded CloudWatch, and an isolated one-node GPU + Kueue source path | Run only after separate environment approval verifies the existing EKS sandbox, budget, quota, and offering |
| Observability | AgentCore EMF/dashboard/alarm contract | Define GPU metric names and dashboard panels using synthetic fixtures |
| FinOps | AI FinOps principles and bounded cost metadata | Create a synthetic GPU-hour/queue/cost allocation example |
| Scheduling | Conceptual placement and queue boundaries plus a Kueue source contract | Compare Kubernetes scheduler, Kueue, and managed task governance |
| Accelerated runtime | Source implementation is not a deployed GPU runtime | Review one small, time-boxed sandbox only after budget and teardown approval |
| Data-centre readiness | National infrastructure direction translated into an applicability-led energy, water, land-use, location, and regulatory-readiness contract | Add evidence fixtures only after detailed standards or a bounded supplier assessment provides stable fields |
| Supplier readiness | Workload contract defines security, governance, risk, compliance, operational, sustainability, and exit evidence | Create a synthetic supplier assessment without representing program participation or external assurance |

## Explicit non-goals

- No live GPU instance provisioning or deployment validation is claimed by this task.
- No NVIDIA driver, GPU Operator, DCGM Exporter, HyperPod, Slurm, or EFA
  deployment.
- No model training, fine-tuning, or high-scale inference.
- No persistent cluster or data-centre commitment.
- No claim of production GPU operations or enterprise capacity planning.

## Sources and research notes

- [Kubernetes: Schedule GPUs](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
- [Kubernetes: Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [Kueue concepts](https://kueue.sigs.k8s.io/docs/concepts/)
- [Amazon SageMaker HyperPod](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod.html)
- [HyperPod cluster and task observability](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-cluster-observability-cluster.html)
- [HyperPod usage reporting for cost attribution](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-usage-reporting.html)
- [NVIDIA DCGM Exporter installation](https://docs.nvidia.com/datacenter/dcgm/latest/installation/install-dcgm-exporter.html)
- [NVIDIA DCGM Exporter metrics](https://docs.nvidia.com/datacenter/dcgm/latest/reference/dcgm-exporter-metrics.html)
- [National Cabinet communique, 26 August 2026](https://www.pm.gov.au/media/meeting-national-cabinet-26-august-26)
- [National AI Centre: Buy Australian AI Partnership Program](https://www.ai.gov.au/buy-australian-ai-partnership-program)
