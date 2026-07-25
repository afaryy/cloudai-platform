# AI Workload Operating Contract

## Purpose and Boundary

The AI Workload Operating Contract is a documentation-first, vendor-neutral model for deciding whether an AI workload is ready to run and how it must be operated, evidenced, paused, and retired. It is one AI Factory / AI data-centre readiness practice track within the broader Cloud & AI Platform Engineering portfolio.

It does not add a scheduler, GPU cluster, or cloud runtime. It does not claim a production AI data centre, GPU workload, model training service, Slurm deployment, Prometheus deployment, or provider telemetry integration. AWS remains the first implementation context; Azure and GCP remain future mappings.

The contract applies to a service, batch job, fine-tuning job, or future distributed-training workload. It is an admission and operating model, not an instruction to execute a workload.

## Shared Contract Fields

Every workload should declare the following before it is eligible to proceed.

| Concern | Required content |
| --- | --- |
| Identity and accountability | Workload ID, class, purpose, owner, environment, workload identity, escalation contact, and shutdown owner. |
| Access and data | Approved model, capability, tool scope, data classification, allowed data sources, and egress boundary. |
| Supply chain | Approved image, model, framework, dependency provenance, lifecycle state, and required evaluation evidence. |
| Capacity and cost | Required capacity, quota, budget boundary, allocation dimensions, and stop condition. |
| Approval and delivery | Human approval requirement, release gate, change owner, and rollback path. |
| Operation and evidence | Telemetry requirements, trace/evidence IDs, policy verdicts, health signals, and retention boundary. |
| Closure | Pause, rollback, retirement, cleanup, output retention, and owner confirmation. |

Missing owner, identity, approval, required evidence, or profile-specific readiness is fail-closed: the workload is not eligible to proceed. Telemetry/export failure is recorded as an operating gap and must not create a false healthy decision.

## Service Inference

Service inference covers gateway, API, and Kubernetes service workloads. It adds a latency and error objective, request/token budget, model and guardrail policy, autoscaling expectation, and response-safety evidence.

The existing mock gateway, Governed RAG contracts, Guardrails as a Service, and AgentOps policy examples are relevant control patterns. They do not constitute a production inference service.

## Batch Processing

Batch processing covers queued, non-interactive AI jobs. It adds queue priority, retry limit, completion criterion, output-retention rule, and cleanup evidence. The contract deliberately does not select a queueing or scheduling product at this stage.

## Fine-Tuning

Fine-tuning covers future managed or accelerated customization jobs. It adds dataset and version lineage, experiment/evaluation evidence, checkpoint-retention rule, accelerated-capacity quota, and cost stop condition.

No fine-tuning job, training dataset, accelerator capacity, or provider runtime is implemented in this repository.

## Distributed Training

Distributed training covers a future multi-node or HPC-style workload. It adds node/GPU topology, storage-throughput requirement, network-fabric requirement, reservation/preemption policy, fault-recovery expectation, and cluster-health evidence.

This profile is an architecture practice aid only. It does not deploy Slurm, Kubernetes GPU infrastructure, InfiniBand, RoCE, RDMA, or a distributed-training workload.

## Readiness and Evidence Flow

```text
Workload proposal
  -> profile-specific readiness checks
  -> owner + identity + data-boundary validation
  -> capacity / quota / cost gate
  -> approval or release gate
  -> permitted execution
  -> telemetry and evidence
  -> pause, rollback, retirement, or shutdown
```

| Stage | Evidence purpose |
| --- | --- |
| Admission | Proves owner, use case, workload class, identity, and approved scope. |
| Readiness | Proves capacity/quota, network/storage path, dependency provenance, and budget boundary. |
| Operation | Captures request/job status, policy verdict, trace ID, cost signal, and key health metric. |
| Closure | Records output/release outcome, cleanup or retention action, owner confirmation, and an incident/rollback reference if applicable. |

## Relationship to Agent Action Contract

Current AgentOps authorisation controls own the narrow runtime decision boundary for agent identity, permitted tools, approval, policy verdicts, and pause or terminate state. A future Agent Action / Operating Contract would consolidate the broader action-accountability model: agent owner and identity, permitted tools, approval boundary, action evidence, pause, and shutdown behaviour.

This workload-level contract owns the surrounding execution context: workload class, data/network/storage boundary, capacity and quota, cost and energy expectation, release condition, telemetry, and retirement. The two models should cross-reference rather than duplicate fields or schemas.

## Tool Adoption Gate

A tool is introduced only when it supports a named operating-contract control and has an owner, boundary, evidence signal, and cleanup path.

| Tool or pattern | First justified role | Evidence | Adoption boundary |
| --- | --- | --- |
| Prometheus-style metrics and Grafana dashboard JSON | Local mock API observability demonstration | Metric names, redaction tests, dashboard definition | First practical tool slice; local only. |
| OpenTelemetry-style trace correlation | Link gateway, policy, guardrail, and workflow evidence | Shared synthetic trace ID | Add after the metrics contract is defined. |
| Helm/EKS metrics exposure | Package the local metrics endpoint | Chart render, probe, service metadata | Only after local metrics are tested. |
| CloudWatch, Azure Monitor, Google Cloud Monitoring | Map the same signal taxonomy to provider services | Documentation and field mapping | No live telemetry integration by default. |
| NVIDIA GPU Operator and DCGM | Future GPU health and utilisation evidence | GPU workload metrics | Only after a bounded GPU runtime exists. |
| Slurm or equivalent scheduler | Future training/batch reservation, queueing, and preemption | Job/accounting evidence | Only after a real scheduling use case exists. |

## Future Local Observability Demonstration

The first tool implementation should remain local and mock-first. It can expose redacted metrics for request latency, request outcome, token/cost estimate, policy/guardrail decision, and workflow/job state. Synthetic trace correlation should link the signals without exposing prompts, tool input/output, credentials, source documents, or raw provider payloads.

Before that work begins, it needs a separate reviewed design, implementation plan, tests, and explicit boundary statement.
