# CloudAI Architecture Library

This is the complete public reading index for the Cloud & AI Platform
Engineering Portfolio. It groups the repository's reference architecture,
mock-first implementation evidence, sandbox guidance, and future design
material without implying that every document represents a deployed capability.

Start with [Featured solutions](featured-solutions.md) for the four concise
case studies, or follow the [solution walkthrough](cloudai-platform-solution-walkthrough.md)
for a guided repository tour. Read [Current status](current-status.md) for the
implementation record and deferred scope.

## Architecture and Platform Context

- [CloudAI architecture](architecture.md) — ecosystem context, six enterprise
  capability layers, ten CloudAI domains, lifecycle, and implementation status.
- [CloudAI control plane](control-plane.md) — coordination and governance
  responsibilities across platform capabilities.
- [Cloud-provider abstraction](cloud-provider-abstraction.md) — portable
  control-model boundaries and provider adapters.
- [Multi-cloud strategy](multi-cloud-strategy.md) — AWS-first implementation
  context with future Azure and GCP mappings.

## Governed AI Access, Data, and Traffic

- [Responsible AI checklist](responsible-ai-checklist.md) — use-case and
  delivery guardrails.
- [Secure AI enablement](secure-ai-enablement.md) — identity, network, data,
  secrets, and policy foundations.
- [Governed model access](governed-model-access.md) — approved model and
  provider-access patterns.
- [GenAI / LLM gateway](genai-llm-gateway.md) — mock-first controlled
  model-access boundary.
- [Guardrails as a Service](guardrails-as-a-service.md) — synthetic safety and
  review outcomes.
- [RAG knowledge lifecycle](rag-knowledge-lifecycle.md) — provenance,
  classification, review, retention, and deterministic local evidence.
- [AI traffic governance](ai-traffic-governance.md) — agent, tool, retrieval,
  workflow, and egress controls.
- [Agent capability governance](agent-capability-governance.md) — reusable
  capability admission, evidence, and lifecycle controls.
- [Agent runtime exploration](agent-runtime-exploration.md) — design questions
  and boundaries for a future runtime; no implemented agent runtime.

## Delivery, Release Engineering, and Sandbox Boundaries

- [AI release engineering on EKS](ai-release-engineering-on-eks.md) —
  Terraform, Helm, Argo CD, GitOps, rollout, rollback, and teardown patterns.
- [EKS release gates and rollback](eks-release-gates-and-rollback.md) —
  release decisions, verification, and recovery guidance.
- [AI-assisted DevSecOps](ai-assisted-devsecops-pattern.md) and
  [AI-assisted review evidence](ai-assisted-review-evidence.md) — human-owned
  delivery controls and synthetic review artifacts.
- [Bounded Bedrock sandbox design](p8-real-bedrock-sandbox-design.md) —
  narrow, manual-approval, synthetic validation boundaries.
- [AgentCore knowledge-lookup readiness](p8h-agentcore-knowledge-lookup-readiness.md)
  — gateway-first future reference only; no AgentCore resource or call.

### Supporting Implementation Records

- [EKS sandbox design](p4b-real-eks-sandbox-design.md) and [operator
  runbook](p4b-eks-sandbox-operator-runbook.md) — bounded synthetic sandbox
  lifecycle and operator guidance.
- [Bedrock access readiness](p8a-bedrock-access-readiness.md) and [IAM apply
  readiness](p8b1-bedrock-iam-apply-readiness.md) — pre-validation and
  least-privilege readiness evidence.
- [Bedrock sandbox environment record](../providers/aws/infra/terraform/envs/bedrock-sandbox/README.md)
  — implementation boundary for the provider validation paths; it contains no
  committed account values, prompts, responses, or workflow logs.

## Evidence, Security, Operations, and FinOps

- [Control-plane evidence map](control-plane-evidence-map.md) and
  [evidence scenarios](control-plane-evidence-scenarios.md) — linked synthetic
  evidence across access, safety, RAG, and review controls.
- [AI platform security and operations controls](ai-platform-security-operations-controls.md)
  — identity, data protection, AppSec, delivery, operations, and FinOps.
- [Observability](observability.md), [operations runbook](operations-runbook.md),
  and [AI FinOps](ai-finops.md) — telemetry, operational review, and
  cost-awareness patterns.

## Provider and Capacity Reference Views

- [AWS reference architecture](aws-reference-architecture.md) — current
  implementation-provider context.
- [Azure reference architecture](azure-reference-architecture.md) and
  [GCP reference architecture](gcp-reference-architecture.md) — future
  reference mappings, not provider-parity implementations.
- [AI Factory infrastructure lens](ai-factory-infrastructure-lens.md) — future
  design context for LLMOps, capacity, and accelerator patterns; no GPU,
  training, fine-tuning, or high-scale serving implementation.

## Demonstration and Portfolio Navigation

- [Featured solutions](featured-solutions.md) — the recommended four case
  studies for hiring managers and technical interviewers.
- [Solution walkthrough](cloudai-platform-solution-walkthrough.md) — a guided
  technical reading sequence.
- [Demo script](demo-script.md) — local mock-first demonstration outline.
- [Current status](current-status.md) — implemented evidence, boundaries, and
  deferred scope.

## Reading Boundaries

All public documents use synthetic data, generic identifiers, and public cloud
service patterns. Internal planning and working notes are intentionally
excluded.
