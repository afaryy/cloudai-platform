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
| External dependency and supplier | Applicability decision plus supplier owner, service boundary, evidence basis, assurance date, material subcontractors, reassessment trigger, portability, and exit path when an external dependency is material. |
| Capacity and cost | Required capacity, quota, budget boundary, allocation dimensions, and stop condition. |
| Location and sustainability | Applicability decision plus required energy, water, land-use, location, and reporting evidence for material dedicated or supplier-operated capacity. |
| Approval and delivery | Human approval requirement, release gate, change owner, and rollback path. |
| Operation and evidence | Telemetry requirements, trace/evidence IDs, policy verdicts, health signals, and retention boundary. |
| Closure | Pause, rollback, retirement, cleanup, output retention, and owner confirmation. |

Missing owner, identity, approval, required evidence, supplier-applicability
decision, or profile-specific readiness is fail-closed: the workload is not eligible to
proceed. Telemetry/export failure is recorded as an operating gap and must not
create a false healthy decision. Location and sustainability fields are
required only after an explicit applicability decision; a small sandbox must
not claim large-facility assurance, and a material dedicated-capacity decision
must not bypass it.

## Supplier and Procurement Readiness

The National AI Centre's Buy Australian AI Partnership Program is a current
public signal that AI suppliers seeking large-organisation opportunities need
evidence across security, governance, risk, compliance, procurement, and
commercial readiness. The program is not a certification, regulation, or proof
that a supplier satisfies this contract. Its first cohort focuses on financial
services, runs from October to November 2026, and closes expressions of interest
on 24 September 2026. See the [official program page](https://www.ai.gov.au/buy-australian-ai-partnership-program).

A platform or workload owner should evaluate a material supplier through one
evidence record rather than distribute the decision across disconnected
questionnaires.

| Evidence family | Minimum questions | Example evidence |
| --- | --- | --- |
| Security and privacy | Which identities, data, networks, administrators, subprocessors, and incident paths are in scope? | Architecture boundary, access model, encryption statement, incident process, recent assurance report. |
| AI governance | Who owns intended use, model/tool changes, evaluation, human oversight, and prohibited use? | Responsible-AI policy, model/service card, evaluation summary, change and escalation process. |
| Risk and compliance | Which obligations and risk classifications apply, and how are exceptions accepted and reviewed? | Control mapping, risk register, legal/compliance review, exception owner and expiry. |
| Data, model, and tool lifecycle | Where are inputs, outputs, embeddings, logs, models, and tool calls stored, retained, reused, and deleted? | Data-flow record, retention/deletion evidence, lineage, residency statement, tool-access contract. |
| Operations and resilience | How are availability, capacity, observability, support, incident response, recovery, and dependency concentration managed? | SLO/SLA, support model, continuity test, status history, telemetry and escalation evidence. |
| Sustainability and location | Does the service depend on material dedicated capacity, and what energy, water, land-use, location, and reporting evidence is available? | Applicability decision, site/operator evidence, measurement method, reporting period, regulatory review. |
| Commercial lifecycle and exit | How are usage, cost, licensing, portability, termination, data return/deletion, and replacement handled? | Pricing boundary, usage report, exit plan, export format, deletion confirmation requirement. |

The assessment records one of three outcomes:

- **eligible** — required evidence is current, owned, and accepted;
- **conditional** — a named owner has accepted bounded gaps with an expiry and
  compensating control;
- **not eligible** — a material evidence or control gap remains unresolved.

Each outcome records scope, assessor, approver, evidence date, next-review date,
and the workload or platform decision it authorises. Marketing claims or an
application to an external program are not substitutes for evidence.

## Requirement Status and Change Control

Every external requirement in an architecture or supplier assessment should
carry a status so that the platform neither ignores a credible direction nor
claims that future obligations already apply.

| Status | Meaning | Permitted use |
| --- | --- | --- |
| Current requirement | An applicable law, contract, policy, or approved internal control is in force. | Enforce it and retain the required evidence. |
| Announced policy direction | A responsible authority has announced an intended direction without final operative detail. | Assess readiness, assign an owner, and avoid claiming legal compliance. |
| Planned legislation or standard | Legislation or a standard is intended but not yet enacted or final. | Track scope and likely evidence fields; do not invent thresholds. |
| Watch item | A program, market signal, proposal, or practice may influence later decisions. | Monitor with a review date; do not treat it as mandatory. |

As at 30 August 2026, the nationally consistent large-data-centre standards
described by National Cabinet are a planned regulatory direction with
Commonwealth legislation intended for early 2027. They are not recorded here
as enacted detailed standards. See the [official National Cabinet communique](https://www.pm.gov.au/media/meeting-national-cabinet-26-august-26).

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

A tool is introduced only when it supports a named control and has an owner, boundary, evidence signal, and cleanup path.

### 1. Local observability foundation

Start with Prometheus-style metrics and Grafana dashboard JSON for the local mock API. Prove the metric names, redaction tests, and dashboard definition before connecting anything external.

### 2. Correlate existing evidence

Add OpenTelemetry-style trace correlation only after the metrics contract exists. Its purpose is to connect existing gateway, policy, guardrail, and workflow evidence through a shared synthetic trace ID.

### 3. Expose only after local proof

After local metrics are tested, Helm/EKS can package the metrics endpoint with a rendered chart, probe, and service metadata. This remains a packaging exercise, not a live monitoring deployment.

### 4. Defer provider and GPU tooling

CloudWatch, Azure Monitor, and Google Cloud Monitoring remain documentation mappings, not live integrations. GPU Operator, DCGM, and Slurm remain future choices only when a bounded runtime or real scheduling use case exists and has a cost gate, operator, telemetry, and teardown plan.

## Future Local Observability Demonstration

The first tool implementation should remain local and mock-first. It can expose redacted metrics for request latency, request outcome, token/cost estimate, policy/guardrail decision, and workflow/job state. Synthetic trace correlation should link the signals without exposing prompts, tool input/output, credentials, source documents, or raw provider payloads.

Before that work begins, it needs a separate reviewed design, implementation plan, tests, and explicit boundary statement.

The optional [EKS Prometheus and Grafana observability demonstration](../solutions/eks-prometheus-grafana-observability-demo.md) is the first real-tool practice path. It uses the same mock-first metric contract in a short-lived sandbox and requires separate manual approval, budget controls, and teardown evidence.
