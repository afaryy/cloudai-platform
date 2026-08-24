# CloudAI Architecture Library

This is the complete public reading index for the Cloud & AI Platform
Engineering Portfolio. It groups the repository's reference architecture,
mock-first implementation evidence, sandbox guidance, and future design
material without implying that every document represents a deployed capability.

## Start Here

- **Hiring manager:** [Featured solutions](../solutions/featured-solutions.md), then
  [Current status](../practices/current-status.md).
- **Platform engineer:** [CloudAI architecture](./architecture.md), a featured
  solution, and its implementation evidence.
- **Deep reviewer:** use this complete library to follow architecture,
  controls, provider references, and implementation records.

Start with [Featured solutions](../solutions/featured-solutions.md) for the concise
case studies, or follow the [solution walkthrough](../solutions/cloudai-platform-solution-walkthrough.md)
for a guided repository tour. Read [Current status](../practices/current-status.md) for the
implementation record and deferred scope.

## Browse by Category

- [Architecture](README.md) — reference architecture, control plane,
  provider mappings, and AI Factory context.
- [Solutions](../solutions/README.md) — end-to-end portfolio case studies.
- [Practices](../practices/README.md) — reusable cross-layer engineering disciplines.
- [Evidence](../evidence/README.md) — evidence maps, scenarios, and templates.
- [Archive](../archive/README.md) — reserved for intact historical records.

## Architecture and Platform Context

- [CloudAI architecture](./architecture.md) — ecosystem context, six enterprise
  capability layers, ten CloudAI domains, lifecycle, and implementation status.
- [CloudAI control plane](./control-plane.md) — coordination and governance
  responsibilities across platform capabilities.
- [Cloud-provider abstraction](./cloud-provider-abstraction.md) — portable
  control-model boundaries and provider adapters.
- [Multi-cloud strategy](./multi-cloud-strategy.md) — AWS-first implementation
  context with future Azure and GCP mappings.

## Governed AI Access, Data, and Traffic

- [Responsible AI checklist](../practices/responsible-ai-checklist.md) — use-case and
  delivery guardrails.
- [Secure AI enablement](../practices/secure-ai-enablement.md) — identity, network, data,
  secrets, and policy foundations.
- [Governed model access](../solutions/governed-model-access.md) — approved model and
  provider-access patterns.
- [GenAI / LLM gateway](../solutions/genai-llm-gateway.md) — mock-first controlled
  model-access boundary.
- [Guardrails as a Service](../solutions/guardrails-as-a-service.md) — synthetic safety and
  review outcomes.
- [RAG knowledge lifecycle](../solutions/rag-knowledge-lifecycle.md) — provenance,
  classification, review, retention, and deterministic local evidence.
- [AI traffic governance](../practices/ai-traffic-governance.md) — agent, tool, retrieval,
  workflow, and egress controls.
- [Agent capability governance](../practices/agent-capability-governance.md) — reusable
  capability admission, evidence, and lifecycle controls.
- [Agent runtime exploration](../practices/agent-runtime-exploration.md) — design questions
  and boundaries for a future runtime; no implemented agent runtime.

## Delivery, Release Engineering, and Sandbox Boundaries

- [AI release engineering on EKS](../solutions/ai-release-engineering-on-eks.md) —
  Terraform, Helm, Argo CD, GitOps, rollout, rollback, and teardown patterns.
- [EKS release gates and rollback](../solutions/eks-release-gates-and-rollback.md) —
  release decisions, verification, and recovery guidance.
- [AI-assisted DevSecOps](../practices/ai-assisted-devsecops-pattern.md) and
  [AI-assisted review evidence](../evidence/ai-assisted-review-evidence.md) — human-owned
  delivery controls and synthetic review artifacts.
- [Bounded Bedrock sandbox design](../solutions/p8-real-bedrock-sandbox-design.md) —
  narrow, manual-approval, synthetic validation boundaries.
- [AgentCore Governed RAG POC](./agentcore-governed-rag-poc.md) — deployed synthetic
  sandbox with protected Knowledge Base ingestion, Gateway-only Runtime access,
  direct Bedrock preflight, Gateway end-to-end evidence, and bounded CloudWatch
  observability; not a production autonomous-agent platform.
- [AgentCore knowledge-lookup readiness](../solutions/p8h-agentcore-knowledge-lookup-readiness.md)
  — gateway-first future reference only; no AgentCore resource or call.

## Supporting Implementation Records

- [EKS sandbox design](../solutions/p4b-real-eks-sandbox-design.md) and [operator
  runbook](../solutions/p4b-eks-sandbox-operator-runbook.md) — bounded synthetic sandbox
  lifecycle and operator guidance.
- [Bedrock access readiness](../solutions/p8a-bedrock-access-readiness.md) and [IAM apply
  readiness](../solutions/p8b1-bedrock-iam-apply-readiness.md) — pre-validation and
  least-privilege readiness evidence.
- [Bedrock sandbox environment record](../../providers/aws/infra/terraform/envs/bedrock-sandbox/README.md)
  — implementation boundary for the provider validation paths; it contains no
  committed account values, prompts, responses, or workflow logs.
- [AgentCore RAG data foundation](../solutions/p8i-agentcore-rag-data-foundation.md),
  [key process record](../solutions/p8i-agentcore-rag-key-process-record.md), and
  [runbook](../solutions/agentcore-governed-rag-poc-runbook.md) — synthetic source,
  deployment, validation, evidence, and teardown records for the bounded POC.

## Evidence, Security, Operations, and FinOps

- [Control-plane evidence map](../evidence/control-plane-evidence-map.md) and
  [evidence scenarios](../evidence/control-plane-evidence-scenarios.md) — linked synthetic
  evidence across access, safety, RAG, and review controls.
- [AI platform security and operations controls](../practices/ai-platform-security-operations-controls.md)
  — identity, data protection, AppSec, delivery, operations, and FinOps.
- [Observability](../practices/observability.md), [operations runbook](../practices/operations-runbook.md),
  and [AI FinOps](../practices/ai-finops.md) — telemetry, operational review, and
  cost-awareness patterns.

## Provider and Capacity Reference Views

- [AWS reference architecture](./aws-reference-architecture.md) — current
  implementation-provider context.
- [Azure reference architecture](./azure-reference-architecture.md) and
  [GCP reference architecture](./gcp-reference-architecture.md) — future
  reference mappings, not provider-parity implementations.
- [AI Factory infrastructure lens](./ai-factory-infrastructure-lens.md) — future
  design context for LLMOps, capacity, and accelerator patterns; no GPU,
  training, fine-tuning, or high-scale serving implementation.
- [AI Factory/GPU workload readiness](./ai-factory-gpu-workload-readiness.md) —
  profile-specific admission, placement, scheduling, observability, FinOps,
  resilience, and data-centre readiness; design-only, with no GPU deployment.
- [AI Factory workload placement comparison](./ai-factory-workload-placement-comparison.md) —
  design-only routing matrix for interactive, batch, fine-tuning, distributed,
  and managed-inference workloads; no GPU deployment.
- [AI Workload Operating Contract](../practices/ai-workload-operating-contract.md) —
  documentation-first, vendor-neutral workload readiness model for service,
  batch, fine-tuning, and future distributed-training profiles.

## Demonstration and Portfolio Navigation

- [Featured solutions](../solutions/featured-solutions.md) — the recommended four case
  studies for hiring managers and technical interviewers.
- [Solution walkthrough](../solutions/cloudai-platform-solution-walkthrough.md) — a guided
  technical reading sequence.
- [Demo script](../practices/demo-script.md) — local mock-first demonstration outline.
- [Current status](../practices/current-status.md) — implemented evidence, boundaries, and
  deferred scope.

## Reading Boundaries

All public documents use synthetic data, generic identifiers, and public cloud
service patterns. Internal planning and working notes are intentionally
excluded.
