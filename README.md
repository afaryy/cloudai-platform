# cloudai-platform

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

## Why This Project Exists

AI platform work often spans cloud engineering, security, governance, developer experience, data access, cost controls, and operations. This repository gives those concerns a concrete shape in a practical portfolio project.

The goal is to show practical architecture thinking and incremental platform delivery using synthetic examples and public cloud service patterns.

## What This Project Demonstrates

- Secure AI enablement for Cloud & AI platform workflows.
- Governed access to foundation models and future AI services.
- A model-access sub-layer through a GenAI / LLM Gateway.
- Guardrails as a Service for synthetic PII, jailbreak, prompt-injection, safety, and review verdicts.
- A broader AI traffic governance layer for future agent and tool flows.
- Capability governance before runtime use: declared permissions, synthetic scan/evaluation evidence, admission decisions, and lifecycle status for reusable agent assets.
- RAG knowledge lifecycle controls for source provenance, owner, classification, authorised knowledge bases, retention, review, and active/paused/retired status.
- AWS Bedrock integration pattern at the architecture level.
- Terraform-oriented AWS platform foundations as placeholders.
- GitHub Actions CI/CD skeletons.
- AI FinOps and token cost tracking concepts.
- Observability, evaluation, runbook, and operations practices.
- Responsible AI checklist and project scope guidance.
- Future EKS-based AI release engineering.
- Future multi-cloud provider mapping for Azure and GCP.

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

Track B explores release engineering for AI services on Amazon EKS. It is split into a public-safe default path and an optional personal sandbox path so the portfolio can show real platform-engineering judgment without accidentally turning the public repository into a live cloud deployment.

Current scope:

- Placeholder Helm chart folders.
- Placeholder Argo CD application folder.
- EKS module placeholder.
- P4a public-safe release-engineering plan: Helm/Kubernetes packaging, probes, rollout/rollback notes, resource boundaries, and synthetic workload metadata.
- P4b optional personal AWS EKS sandbox plan: Terraform-managed sandbox, explicit budget, manual approval, synthetic workload only, and teardown guidance.
- P4c GitOps plan: Argo CD application pattern and release-promotion story.

Future scope:

- Helm packaging examples.
- GitOps deployment patterns.
- Progressive delivery and runtime observability notes.
- Policy-aware release gates.
- Optional Bedrock Guardrails or AgentCore-aligned extension after the EKS and Terraform foundations are clear.

## Track C: AI-Assisted DevSecOps Pattern

Track C documents how AI assistance can support delivery without bypassing engineering controls.

The pattern emphasizes:

- Human review of AI-assisted changes.
- Required CI and security checks.
- Reviewable prompts that use synthetic examples.
- Synthetic examples only.
- Clear separation between local working notes and public documentation.

## Track D: AI Traffic Gateway and Kubernetes-Native Agent Runtime Exploration

Track D is a future exploration track for governed agent, tool, retrieval, workflow, and data-access traffic.

It asks:

- How should tool calls be authorized?
- How should retrieval and data egress be governed?
- Which events should be audited?
- What runtime isolation model is appropriate?
- How could Kubernetes-native agents inherit platform controls?

No agent runtime is implemented in the current scope.

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

Current milestone: mock GenAI gateway, governed RAG evidence, AgentOps decisions, capability governance, RAG knowledge lifecycle, and Guardrails as a Service are complete for the local demo scope.

Near-term:

- Keep API contracts, request metadata, token guardrails, policy profile examples, and RAG governance examples aligned.
- Keep future slices synthetic and contract-first before adding any runtime agent behavior.
- Continue refreshing status and planning docs as future slices land.

Later:

- Add reviewed AWS Terraform module stubs.
- Add AWS bootstrap guidance for Terraform state, locking, and GitHub Actions OIDC role assumptions.
- Expand AI FinOps and observability examples.
- Add EKS release engineering examples.
- Expand Azure and GCP provider mapping.
- Explore agent runtime and LLMOps / GPU sandbox tracks.

See `docs/current-status.md` for the current milestone, deferred runtime work, and recommended next slice.

Detailed planning notes are kept locally. The public repository focuses on the reference architecture, examples, and mock-mode implementation path.

## Project Scope Statement

This project is a personal learning and reference implementation. It uses synthetic examples and public cloud service patterns.

Mock mode is the default. Avoid real AWS cost unless a future task explicitly requests and documents a safe deployment path.
