# CloudAI Platform

Cloud & AI platform engineering portfolio project.

`cloudai-platform` is positioned as an AWS-first, multi-cloud-ready learning and reference implementation using synthetic examples and public cloud service patterns. It demonstrates a Cloud AI control plane for organizing secure AI enablement, governed model access, AI traffic governance, platform foundations, FinOps, observability, and release engineering patterns.

This is a learning and reference project. It stays intentionally incremental, with mock mode as the default.

## Project Overview

The project models a CloudAI platform that separates control-plane concerns from provider-specific implementation details.

At a high level, it explores:

- CloudAI Control Plane concepts for policy, approval, audit, and provider registry.
- Unified AI Asset Registry patterns for approved models, agents, skills, MCP tools, RAG sources, evaluations, versions, owners, and lifecycle evidence.
- GenAI / LLM Gateway patterns for governed model access.
- Broader AI Traffic Governance for future agent, tool, retrieval, workflow, and data-access flows.
- AWS-first provider foundations with future Azure and GCP mappings.
- AI FinOps, observability, evaluation, operations, and responsible AI practices.
- AI capacity planning across model quotas, inference throughput, GPU workloads, retrieval scale, agent runtime limits, and operational support.

For an end-to-end reader guide, including the TypeScript/Python language boundary, see `docs/cloudai-platform-solution-walkthrough.md`. For runnable local examples, see `examples/README.md`. For a short walkthrough flow, see `docs/demo-script.md`.

## Documentation Guide

Start here:

- [Solution walkthrough](docs/cloudai-platform-solution-walkthrough.md) - end-to-end reader guide for the repository.
- [Current status](docs/current-status.md) - current mock scope, completed evidence, and recommended next slice.
- [Demo script](docs/demo-script.md) - short portfolio walkthrough flow.

Core architecture:

- [Architecture](docs/architecture.md) - CloudAI platform architecture and enterprise AI layers.
- [CloudAI control plane](docs/control-plane.md) - policy, approval, audit, registry, cost, and observability responsibilities.
- [GenAI / LLM gateway](docs/genai-llm-gateway.md) - governed model-access sub-layer.
- [Governed model access](docs/governed-model-access.md) - approved model access patterns and controls.
- [Cloud provider abstraction](docs/cloud-provider-abstraction.md) - provider boundary for AWS-first, multi-cloud-ready design.

Security, governance, and operations:

- [Secure AI enablement](docs/secure-ai-enablement.md) - cloud foundations for secure AI adoption.
- [Guardrails as a Service](docs/guardrails-as-a-service.md) - synthetic safety verdict contracts.
- [Responsible AI checklist](docs/responsible-ai-checklist.md) - governance and review checklist.
- [AI platform security and operations controls](docs/ai-platform-security-operations-controls.md) - P6f identity, data protection, AI AppSec, delivery, operations, and FinOps matrix.
- [Observability](docs/observability.md) - telemetry and evidence concepts.
- [Operations runbook](docs/operations-runbook.md) - operational response and support guidance.
- [AI FinOps](docs/ai-finops.md) - token, model, usage, and cost-control concepts.

RAG, AgentOps, and evidence:

- [AI traffic governance](docs/ai-traffic-governance.md) - P6a runtime AgentOps decision boundary.
- [Agent capability governance](docs/agent-capability-governance.md) - P6b capability registry, admission, scan, evaluation, and lifecycle pattern.
- [RAG knowledge lifecycle](docs/rag-knowledge-lifecycle.md) - P6c source provenance, status, retention, and review controls.
- [Control-plane evidence map](docs/control-plane-evidence-map.md) - P6d unified evidence story.
- [Control-plane evidence scenarios](docs/control-plane-evidence-scenarios.md) - P6e allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked outcomes.
- [Agent runtime exploration](docs/agent-runtime-exploration.md) - future agent-runtime design boundary.

Release engineering and delivery:

- [AI release engineering on EKS](docs/ai-release-engineering-on-eks.md) - P4 EKS release-engineering track.
- [EKS release gates and rollback](docs/eks-release-gates-and-rollback.md) - P4d gates, rollout observation, rollback, and evidence expectations.
- [AI-assisted DevSecOps pattern](docs/ai-assisted-devsecops-pattern.md) - P5a advisory AI delivery boundary.
- [AI-assisted review evidence](docs/ai-assisted-review-evidence.md) - P5b synthetic review, CI, threat-model, and release-note evidence.

Provider reference architecture:

- [AWS reference architecture](docs/aws-reference-architecture.md)
- [Azure reference architecture](docs/azure-reference-architecture.md)
- [GCP reference architecture](docs/gcp-reference-architecture.md)
- [Multi-cloud strategy](docs/multi-cloud-strategy.md)

## Why This Project Exists

AI platform work often spans cloud engineering, security, governance, developer experience, data access, cost controls, and operations. This repository gives those concerns a concrete shape in a practical portfolio project.

The goal is to show practical architecture thinking and incremental platform delivery using synthetic examples and public cloud service patterns.

## What This Project Demonstrates

- **P0 Foundation:** responsible AI checklist, project scope guidance, and future multi-cloud provider mapping.
- **P1 Mock GenAI Gateway:** a model-access sub-layer through a GenAI / LLM Gateway.
- **P1 AWS GenAI Pattern:** AWS Bedrock integration pattern at the architecture level.
- **P1/P2 Governed Model Access:** governed access to foundation models and future AI services.
- **P2 Secure AI Enablement:** secure AI enablement for Cloud & AI platform workflows.
- **P2 Guardrails as a Service:** synthetic PII, jailbreak, prompt-injection, safety, and review verdicts.
- **P2 AI FinOps and Observability:** token cost tracking, evaluation, runbook, and operations practices.
- **P4 EKS Release Engineering:** future EKS-based AI release engineering and Terraform-oriented AWS platform foundations as placeholders.
- **P5 AI-Assisted DevSecOps:** GitHub Actions CI/CD skeletons and human-owned delivery controls.
- **P6 AI Traffic Governance:** a broader traffic governance layer for future agent and tool flows.
- **P6b Capability Governance:** declared permissions, synthetic scan/evaluation evidence, admission decisions, and lifecycle status for reusable agent assets.
- **P6c RAG Knowledge Lifecycle:** source provenance, owner, classification, authorised knowledge bases, retention, review, and active/paused/retired status.
- **P6e Control-Plane Evidence Scenarios:** allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked AI governance outcomes.
- **P6f AI Platform Security and Operations Controls:** identity, data protection, AI AppSec, delivery gates, operations, and FinOps.

## AWS-First, Multi-Cloud-Ready

AWS is the first implementation provider. The reference architecture maps early provider concepts to public AWS services such as Amazon Bedrock, Amazon Bedrock AgentCore, Amazon SageMaker AI, IAM, KMS, Secrets Manager, API Gateway, Lambda, DynamoDB, S3, CloudWatch, ECS, and EKS.

The control model is intentionally cloud-agnostic. Azure and GCP are represented as early reference architecture mappings, not active implementations. Azure mappings track Microsoft Foundry, Azure AI Search, Entra ID, Key Vault, Azure Monitor, API Management, and Private Link. GCP mappings track Gemini Enterprise Agent Platform, Vertex AI / Model Garden, Agent Gateway, Agent Runtime, Vector Search, IAM, Cloud KMS, Secret Manager, Cloud Logging, and Cloud Monitoring. The project keeps provider-specific details behind adapter boundaries so the core governance model can remain portable.

## CloudAI Control Plane Concept

The CloudAI Control Plane is the governance and coordination layer for AI enablement.

It is responsible for:

- Policy and approval workflows.
- Use case and environment registration.
- Model and provider access decisions.
- Audit and evidence capture.
- Cost and usage visibility.
- Observability and operational review.

It is not a model training platform, data warehouse, or deployed runtime in this phase.

## Architecture Flow

```text
User / workload
  -> CloudAI Control Plane
  -> GenAI / LLM Gateway
  -> AI Traffic Governance Layer
  -> Provider Adapter
  -> AWS-first provider services
```

The GenAI / LLM Gateway is the first model-access sub-layer. The AI Traffic Governance Layer is the broader future control point for agents, tools, retrieval, workflows, and governed data access.

See `docs/architecture.md` for the relationship between this implementation view and the six-layer enterprise AI model: Strategy, Governance, Data, Platform, Infrastructure, and Operations.

## Track A: AWS GenAI Platform Starter

Track A focuses on the AWS-first GenAI platform foundation.

Current scope:

- AWS provider placeholder structure.
- Bedrock-oriented architecture notes.
- Terraform module and environment folders.
- Mock-mode scripts for future cost and ingest examples.
- Local mock GenAI / LLM Gateway API.
- Request metadata, structured logs, token guardrail, API schemas, and default policy profile examples.
- Guardrails as a Service assessment contracts for synthetic safety and review signals.
- Synthetic demo fixtures for request, response, error, and request log examples.
- Local governed RAG workflow examples for ingest, chunk metadata, evaluation dataset preparation, and response-quality scoring.

Future scope:

- Reviewed AWS foundation modules.
- Terraform validation examples.
- Optional small AWS runtime deployment after cost and cleanup guidance is documented.

## Track B: AI Release Engineering on EKS

Track B explores release engineering for AI services on Amazon EKS. It is split into a synthetic-only default path and an optional personal sandbox path so the portfolio can show real platform-engineering judgment without accidentally turning the public repository into a live cloud deployment.

Current scope:

- **P4a Helm Packaging:** portfolio-ready Helm chart for the mock AI API service, including Kubernetes packaging, probes, resource boundaries, synthetic labels, and optional PodDisruptionBudget.
- **P4b Optional Personal EKS Sandbox:** Terraform-managed sandbox, explicit budget, manual approval, synthetic workload only, and teardown guidance.
- **P4c GitOps Pattern:** synthetic Argo CD Application manifest, manual sync posture, release metadata, and promotion boundaries.
- **P4d Release Gates and Rollback:** pre-deploy gates, rollout observation, rollback choices, failure modes, and evidence expectations.
- EKS module placeholder remains deferred until the personal sandbox path is explicitly approved.

Future scope:

- Optional personal EKS sandbox execution through GitHub Actions OIDC, budget controls, and teardown.
- Progressive delivery and runtime observability evidence from a bounded sandbox, if approved.
- Optional Bedrock Guardrails or AgentCore-aligned extension after the EKS and Terraform foundations are clear.

## Track C: AI-Assisted DevSecOps Pattern

Track C documents how AI assistance can support delivery without bypassing engineering controls.

Current scope:

- **P5a AI-Assisted DevSecOps Boundary:** advisory AI use only, human ownership, CI/security gates, prohibited-input rules, and auditable release evidence.
- **P5b AI-Assisted Review Evidence:** synthetic evidence records for review summaries, threat-model checklists, CI failure summaries, and release-note drafts.

The pattern emphasizes:

- Human review of AI-assisted changes.
- Required CI and security checks.
- Reviewable prompts that use synthetic examples.
- Synthetic examples only.
- Clear separation between local working notes and public documentation.
- No autonomous agent execution or deployment by default.
- Human-owned sign-off for any AI-assisted recommendation.

## Track D: AI Traffic Gateway and Kubernetes-Native Agent Runtime Exploration

Track D explores governed agent, tool, retrieval, workflow, and data-access traffic. It is the P6 track for AgentOps / AI Traffic Governance.

Current mock scope:

- **P6a Runtime AgentOps:** metadata-only agent-action authorisation decisions for allow, deny, approval-required, paused, and budget-exhausted outcomes.
- **P6b Capability Governance:** registry, skill card, synthetic scan/evaluation evidence, admission decision, and lifecycle records for reusable agent capabilities.
- **P6c RAG Knowledge Lifecycle:** source provenance, owner, classification, authorised knowledge-base boundary, retention, review, and active/paused/retired source states.
- **P6d Control-Plane Evidence Map:** one synthetic map that links runtime AgentOps, capability admission, RAG lifecycle, guardrail verdicts, and AI-assisted review evidence.
- **P6e Control-Plane Evidence Scenarios:** a scenario pack that explains allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked outcomes through existing synthetic evidence.
- **P6f AI Platform Security and Operations Controls:** a docs-first control matrix for identity, data protection, AI AppSec, delivery controls, operations, and FinOps.

It asks:

- How should tool calls be authorized?
- How should retrieval and data egress be governed?
- Which events should be audited?
- What runtime isolation model is appropriate?
- How could Kubernetes-native agents inherit platform controls?
- Which platform security and operations controls must exist before a future agent or EKS sandbox becomes production-like?

No real agent runtime, MCP execution, traffic proxy, cloud deployment, or provider integration is implemented in the current scope.

## Track E: AI Factory / LLMOps / GPU Platform Stretch

Track E is a future design-first exploration of an Enterprise AI Factory: the operating model, controls, and accelerated compute patterns required to take approved models from evaluation through training, deployment, inference, and retirement.

Potential areas:

- AI Factory operating model: CDAO or equivalent governance ownership, central platform ownership, and product-team delivery responsibilities.
- Model evaluation workflows.
- Prompt and response quality checks.
- Synthetic benchmark datasets.
- GPU capacity and scheduling architecture notes for training, fine-tuning, batch inference, and high-throughput serving.
- Amazon SageMaker HyperPod as an optional AWS reference for resilient accelerated clusters with EKS or Slurm orchestration.
- Cost, quota, capacity, resilience, and teardown guardrails.

This track is intentionally deferred until the control-plane, AgentOps, and delivery patterns are clearer. A HyperPod cluster is not a default portfolio deployment: any later personal POC needs a useful synthetic workload, capacity approval, explicit budget, and teardown plan.

## Project Scope and Governance

This project uses synthetic examples and public cloud service patterns for demonstration purposes.

Scope assumptions:

- It is a learning and reference implementation.
- Examples use synthetic data, generic service names, and public cloud concepts.
- Local notes, generated state, screenshots, and full working transcripts are kept out of the repository.
- Mock mode remains the default unless a future task explicitly adds reviewed deployment guidance.

## FinOps and Token Cost Tracking

The project includes early AI FinOps concepts for understanding usage and cost signals.

Planned signals include:

- Estimated input and output tokens.
- Provider and model labels.
- Environment and use case labels.
- Request volume and latency.
- Cost allocation metadata.

The current `scripts/estimate-token-cost.ts` file is mock-only and uses synthetic values. It does not call a provider or calculate a real cloud bill.

## Observability and Operations

The operations model covers:

- Request counts, latency, and errors.
- Policy allow, deny, and review decisions.
- Provider and model routing decisions.
- Token estimates and cost metadata.
- Evaluation results for quality and safety review.
- Runbooks, assessments, gap tracking, and sprint reviews.

Provider-specific dashboards, alarms, traces, and evaluation harnesses are future work.

## How to Run Locally in Mock Mode

The current P1 implementation runs locally in mock mode.

The P1 mock GenAI API uses local synthetic responses:

```bash
cd providers/aws/app/api
pnpm install
pnpm run build
pnpm test
pnpm run dev
```

The API exposes:

- `GET /health`
- `POST /chat`
- `GET /rag/status`
- `GET /rag/artifacts`
- `POST /rag/query`
- `POST /guardrails/assess`

The current mock scripts are simple placeholders:

```bash
# Optional, if a TypeScript runner is available in your local environment
tsx scripts/estimate-token-cost.ts
tsx scripts/ingest-sample-docs.ts
```

If you do not have a TypeScript runner installed, read the scripts as mock examples. No cloud account setup is needed for this phase.

## Roadmap

Current milestone: mock GenAI gateway, governed RAG evidence, AgentOps decisions, capability governance, RAG knowledge lifecycle, Guardrails as a Service, P4 release engineering patterns, and P5 AI-assisted DevSecOps boundary/evidence are complete for the local demo scope.

Near-term:

- Keep API contracts, request metadata, token guardrails, policy profile examples, and RAG governance examples aligned.
- Make P6 AgentOps / AI Traffic Governance the next mock-first focus by improving runtime decision evidence, capability lifecycle examples, and traffic governance documentation.
- Keep future slices synthetic and contract-first before adding any runtime agent behavior.
- Continue refreshing status and planning docs as future slices land.

Later:

- Add reviewed AWS Terraform module stubs.
- Add AWS bootstrap guidance for Terraform state, locking, and GitHub Actions OIDC role assumptions.
- Expand AI FinOps and observability examples.
- Optionally execute a personal AWS EKS sandbox POC only after budget, teardown, backend, OIDC, and secret-handling controls are explicit.
- Expand Azure and GCP provider mapping.
- Explore agent runtime and LLMOps / GPU sandbox tracks.

See `docs/current-status.md` for the current milestone, deferred runtime work, and recommended next slice.

Detailed planning notes are kept locally. The public repository focuses on the reference architecture, examples, and mock-mode implementation path.

## Project Scope Statement

This project is a personal learning and reference implementation. It uses synthetic examples and public cloud service patterns.

Mock mode is the default. Avoid real AWS cost unless a future task explicitly requests and documents a safe deployment path.
