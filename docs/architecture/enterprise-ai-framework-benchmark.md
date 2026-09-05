# Enterprise AI Framework Benchmark

## Purpose

This benchmark is the public source baseline for the CloudAI Platform
architecture and a future Enterprise AI Blueprint. It compares authoritative
frameworks without treating any single cloud provider, infrastructure vendor,
or standards body as the complete operating model.

The benchmark asks a practical question:

> How can high-level enterprise AI guidance become explicit architecture,
> operating contracts, admission decisions, delivery gates, and verifiable
> evidence?

The source set was checked on 3 September 2026. Links and publication status
should be reviewed before each material revision because several frameworks
are actively maintained.

## Naming and Scope

- **CloudAI Cloud** is the proposed umbrella brand: cloud-native AI and
  AI-native cloud.
- **Enterprise AI Blueprint** is the future provider-neutral framework.
- **CloudAI Platform** is the implementation-oriented portfolio that tests
  selected parts of the blueprint with synthetic data and bounded sandboxes.

This document is a comparison and architecture aid. It is not a certification,
compliance statement, legal interpretation, or claim that every referenced
control is implemented in this repository.

## Core Source Set

| Source | Primary contribution | How it informs this project |
| --- | --- | --- |
| [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) and [Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | Provider-neutral risk outcomes organised around Govern, Map, Measure, and Manage, with GenAI-specific risks and suggested actions. | Grounds accountability, risk context, evaluation, continuous review, evidence ownership, and human decision boundaries. |
| [AWS Cloud Adoption Framework for AI](https://docs.aws.amazon.com/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html) | Enterprise AI capability and maturity across Business, People, Governance, Platform, Security, and Operations. | Validates the need to connect strategy and operating model to platform engineering rather than treating AI as an isolated application. |
| [AWS Generative AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html) and [Responsible AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/responsible-ai-lens/responsible-ai-lens.html) | Workload-level guidance across the GenAI lifecycle and the Well-Architected pillars, with responsible-AI focus areas. | Informs workload scoping, model and data decisions, security, reliability, cost, sustainability, evaluation, deployment, and continuous improvement. |
| [Microsoft Cloud Adoption Framework](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/) and [Azure AI architecture guidance](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/ai-get-started) | Strategy-to-operation adoption path covering plan, ready, govern, secure, and manage, with AI workload, agent, gateway, RAG, and MLOps guidance. | Provides a future Azure mapping for landing zones, governed AI services, model gateways, agent orchestration, secure RAG, and lifecycle operations. |
| [Google Cloud AI Adoption Framework](https://cloud.google.com/resources/cloud-ai-adoption-framework-whitepaper) and [AI and ML Well-Architected perspective](https://docs.cloud.google.com/architecture/framework/perspectives/ai-ml) | Organisational AI capability maturity plus cross-pillar workload guidance for operations, security, reliability, cost, and performance. | Supports the future GCP mapping and reinforces measurable outcomes, scalable foundations, observability, MLOps, documentation, and FinOps ownership. |
| [NVIDIA Enterprise AI Factory Design Guide](https://docs.nvidia.com/ai-enterprise/planning-resource/ai-factory-white-paper/latest/index.html) | Full-stack AI Factory view spanning agentic workflows, AgentOps, gateways, GitOps, artifacts, security, observability, confidential computing, cloud-native platforms, accelerated compute, networking, and storage. | Extends the blueprint from managed AI services into GPU capacity, workload placement, AI Factory operations, and future Kubernetes or HPC scheduling paths. |
| [CNCF Cloud Native Artificial Intelligence Whitepaper](https://www.cncf.io/reports/cloud-native-artificial-intelligence-whitepaper/) | Cloud-native AI workload lifecycle, container orchestration, distributed compute, model serving, scheduling, observability, and ecosystem gaps. | Grounds the Kubernetes, EKS, Helm, Argo CD, Kueue, future KubeRay/Kubeflow, and portable workload-platform direction. |

## Six-Layer Comparison

The CloudAI Platform architecture uses six capability layers. The table shows
the main question contributed by each source family; it is not a compliance
crosswalk.

| Capability layer | Standards and risk view | Cloud adoption view | Workload architecture view | Infrastructure view |
| --- | --- | --- | --- | --- |
| Strategy and operating model | NIST establishes accountability and risk-management outcomes. | AWS CAF-AI, Microsoft CAF, and Google AI Adoption connect AI investment to business outcomes, people, process, and maturity. | Well-Architected guidance starts with use-case scope and measurable outcomes. | NVIDIA identifies the organisational and technical personas required to operate an AI Factory. |
| Governance | NIST provides Govern, Map, Measure, and Manage outcomes and GenAI risk actions. | Adoption frameworks define ownership, policy, governance bodies, and lifecycle responsibilities. | Responsible-AI and workload lenses turn policy into design and review questions. | Infrastructure guidance contributes isolation, provenance, confidential computing, and operational control points. |
| Data and knowledge | NIST covers data context, provenance, privacy, measurement, and harmful-impact considerations. | Adoption frameworks require data strategy, access ownership, and readiness. | Cloud guidance covers RAG, vector retrieval, lifecycle, quality, residency, and secure multitenancy. | NVIDIA and CNCF address data pipelines, connectors, storage, checkpointing, and high-throughput data paths. |
| AI platform | NIST supplies risk outcomes but does not prescribe a platform product. | Provider frameworks define reusable platforms, self-service, approved access, and governance at scale. | Cloud architecture guidance covers model gateways, agents, evaluation, MLOps/LLMOps, and provider services. | NVIDIA and CNCF describe agent platforms, model serving, distributed compute, and cloud-native orchestration. |
| Infrastructure and cloud foundations | NIST describes security and resilience outcomes without selecting infrastructure. | Adoption frameworks connect landing zones, identity, network, security, and shared responsibility to AI adoption. | Well-Architected perspectives cover security, reliability, performance, cost, and sustainability. | NVIDIA supplies the deepest compute, GPU, network, storage, confidential-computing, and validated-stack view; CNCF supplies portable orchestration patterns. |
| Delivery and operations | NIST requires measurement, monitoring, response, and continual risk management. | Adoption frameworks define operating ownership, support, skills, and maturity progression. | Workload lenses cover CI/CD, evaluation, observability, incident response, cost optimisation, and continuous improvement. | NVIDIA and CNCF contribute GitOps, artifact, scheduler, runtime, telemetry, capacity, and lifecycle considerations. |

## What the Frameworks Agree On

Across different terminology, the sources converge on several principles:

1. AI starts with an accountable outcome and risk context, not a model choice.
2. Data, model, tool, supplier, and infrastructure dependencies need explicit
   ownership and lifecycle boundaries.
3. Security, privacy, responsible AI, evaluation, reliability, cost, and
   sustainability apply throughout the workload lifecycle.
4. Reusable platforms, automated delivery, observability, and self-service are
   required to move beyond isolated proofs of concept.
5. Human accountability remains necessary even when technical controls and
   agent workflows are automated.
6. AI workloads require continuous measurement and reassessment because data,
   models, tools, suppliers, policies, and operating conditions change.

## What No Single Source Provides

No source in the core set provides one complete, provider-neutral chain from
enterprise intent to tested control evidence. Common gaps between the sources
include:

- adoption frameworks are broad but do not usually define replayable decision
  contracts;
- risk frameworks describe outcomes but deliberately avoid prescribing cloud
  and runtime implementation;
- provider architecture guidance is actionable but tied to a provider service
  model;
- AI Factory guidance is deep on accelerated infrastructure but does not replace
  an organisation's business, legal, procurement, or responsible-AI process;
- cloud-native guidance improves portability but does not establish final risk
  or business authority;
- diagrams and checklists alone do not prove that a control ran or that its
  decision remained current.

The proposed Enterprise AI Blueprint addresses this integration gap by mapping:

```text
business outcome and owner
  -> use-case, data, risk, and supplier context
  -> governed platform and infrastructure selection
  -> versioned operating contract
  -> deterministic admission and human-owned exceptions
  -> controlled delivery and runtime authority
  -> correlated operational and decision evidence
  -> reassessment, pause, rollback, retirement, or revocation
```

## Relationship to Current CloudAI Platform Evidence

| Blueprint concern | Current repository evidence | Status boundary |
| --- | --- | --- |
| Governed model access | Mock-first gateway, policy contracts, provider-adapter boundary, and bounded Bedrock validation. | Implemented locally with selected sandbox validation; not a general production gateway. |
| Knowledge lifecycle | Synthetic RAG provenance, source state, citation-or-abstention behaviour, and evaluation. | Implemented with synthetic data; no production knowledge corpus. |
| Agent access and operation | AgentCore Gateway, Runtime, Knowledge Base, IAM, and bounded CloudWatch evidence. | AWS sandbox-validated; not an autonomous production agent platform. |
| Workload delivery | Terraform, GitHub Actions OIDC, EKS, Helm, Argo CD, rollback, and lifecycle controls. | Source and bounded sandbox evidence vary by path; private EKS and GPU runtime validation remain pending. |
| Supplier readiness | Closed schemas, deterministic assessment decisions, freshness, expiry, revocation, conditional remediation, and workload admission replay. | Implemented locally with synthetic metadata; no supplier integration or procurement approval. |
| AI Factory and accelerated infrastructure | Workload profiles, placement comparison, Kueue source path, private EKS target, cost gates, and future GPU/HPC boundaries. | Primarily design/source evidence; no claim of a deployed GPU or data-centre platform. |

## Implications for YY-65 Evidence Intake and Human Review

The framework comparison supports a ports-and-adapters boundary for future
supplier evidence:

The approved detailed architecture is recorded in the
[Human-Owned Supplier Evidence Adapter and Review Workflow Design](../superpowers/specs/2026-09-05-human-owned-supplier-evidence-adapter-design.md).

```text
controlled raw-evidence source
  -> quarantined, least-privilege adapter
  -> normalized metadata candidate
  -> schema and authenticity checks
  -> human reviewer and approver boundary
  -> versioned metadata-only evidence record
  -> deterministic YY-64 supplier evaluation and workload admission
```

The following rules carry into the YY-65 design:

- raw evidence and public decision records remain separate;
- an adapter may extract metadata but cannot approve evidence or write a final
  supplier decision;
- the deterministic evaluator calculates readiness and cannot be overridden by
  an adapter-provided outcome;
- conditional evidence and material exceptions require explicit, bounded human
  acceptance;
- reviewer, approver, exception owner, and revocation owner are distinct roles
  even if one person fills more than one role in a small demonstration;
- parser failure, conflicting evidence, stale or revoked evidence, unavailable
  review, and failed audit export fail closed or remain pending;
- public examples contain synthetic metadata and references only;
- any real API, document ingestion, raw-evidence storage, or provider adapter
  requires a separate design, security review, and explicit approval.

## Next Benchmark Set

The next research pass should add narrowly scoped, authoritative sources for:

- ISO/IEC 42001 and ISO/IEC 23894 management and risk concepts;
- OWASP guidance for LLM and agentic application security;
- Cloud Security Alliance AI control and assurance mappings;
- FinOps Foundation guidance for AI cost allocation and unit economics;
- OpenTelemetry and OpenInference semantic conventions for AI and agent traces;
- Kubernetes, Kueue, Kubeflow, KubeRay, Slurm, Prometheus, Grafana, and NVIDIA
  DCGM primary documentation when the corresponding implementation slice begins.

These sources should be added only after their precise role and current status
are verified. A long bibliography without an explicit architecture mapping is
not the goal.

## Maintenance Rules

1. Prefer standards bodies, regulators, foundations, and first-party technical
   documentation.
2. Record the date each source was checked and distinguish current requirements
   from recommendations, maturity guidance, and future direction.
3. Paraphrase findings and link to the source; do not reproduce substantial
   copyrighted text.
4. Keep provider products in mapping or implementation sections, not in the
   provider-neutral contract core.
5. Mark each project claim as design-only, mock-first, source-implemented,
   sandbox-validated, or production-validated.
6. Require repository evidence before changing an implementation-status claim.
