# cloudai-platform

Cloud & AI platform engineering portfolio project.

`cloudai-platform` is positioned as an AWS-first, multi-cloud-ready learning and reference implementation using synthetic examples and public cloud service patterns. It demonstrates how an enterprise-style AI control plane could organize secure AI enablement, governed model access, AI traffic governance, platform foundations, FinOps, observability, and release engineering patterns.

This is a learning and reference project. It is intentionally documentation-heavy and implementation-light in the foundation phase, with mock mode as the default.

## Project Overview

The project models a CloudAI platform that separates control-plane concerns from provider-specific implementation details.

At a high level, it explores:

- CloudAI Control Plane concepts for policy, approval, audit, and provider registry.
- GenAI / LLM Gateway patterns for governed model access.
- Broader AI Traffic Governance for future agent, tool, retrieval, workflow, and data-access flows.
- AWS-first provider foundations with future Azure and GCP mappings.
- AI FinOps, observability, evaluation, operations, and responsible AI practices.
- AI capacity planning across model quotas, inference throughput, GPU workloads, retrieval scale, agent runtime limits, and operational support.

## Why This Project Exists

AI platform work often spans cloud engineering, security, governance, developer experience, data access, cost controls, and operations. This repository gives those concerns a concrete shape in a practical portfolio project.

The goal is to show practical architecture thinking and incremental platform delivery using synthetic examples and public cloud service patterns.

## What This Project Demonstrates

- Secure AI enablement for enterprise-style workflows.
- Governed access to foundation models and future AI services.
- A model-access sub-layer through a GenAI / LLM Gateway.
- A broader AI traffic governance layer for future agent and tool flows.
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

Future scope:

- Mock gateway API.
- Policy schema drafts.
- Terraform validation examples.
- Reviewed AWS foundation modules.

## Track B: AI Release Engineering on EKS

Track B explores future release engineering for AI services on Amazon EKS.

Current scope:

- Placeholder Helm chart folders.
- Placeholder Argo CD application folder.
- EKS module placeholder.

Future scope:

- Helm packaging examples.
- GitOps deployment patterns.
- Progressive delivery and runtime observability notes.
- Policy-aware release gates.

## Track C: AI-Assisted DevSecOps Pattern

Track C documents how AI assistance can support delivery without bypassing engineering controls.

The pattern emphasizes:

- Human review of AI-assisted changes.
- Required CI and security checks.
- No secrets or sensitive data in AI prompts.
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

No agent runtime is implemented in the foundation phase.

## Track E: Future LLMOps / GPU Sandbox

Track E is a future placeholder for LLMOps and GPU-oriented experimentation.

Potential areas:

- Model evaluation workflows.
- Prompt and response quality checks.
- Synthetic benchmark datasets.
- GPU sandbox architecture notes.
- Cost and quota guardrails.

This track is intentionally deferred until the control-plane and gateway patterns are clearer.

## Project Scope and Governance

This project uses synthetic examples and public cloud service patterns for demonstration purposes.

Scope assumptions:

- It is a learning and reference implementation.
- Examples use synthetic data, generic service names, and public cloud concepts.
- Local notes, credentials, generated state, screenshots, and full working transcripts are kept out of the repository.
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

This foundation phase does not require cloud credentials.

There is no deployed runtime yet. The current mock scripts are simple placeholders:

```bash
# Optional, if a TypeScript runner is available in your local environment
tsx scripts/estimate-token-cost.ts
tsx scripts/ingest-sample-docs.ts
```

If you do not have a TypeScript runner installed, read the scripts as mock examples. Do not install dependencies or configure cloud credentials unless a future phase explicitly adds reviewed setup instructions.

## Roadmap

Current phase: P0 Foundation.

Near-term:

- Strengthen architecture and project-control docs.
- Add mock GenAI / LLM Gateway API.
- Draft policy schemas for model access and AI traffic governance.
- Add tests for mock-mode behavior.

Later:

- Add reviewed AWS Terraform module stubs.
- Expand AI FinOps and observability examples.
- Add EKS release engineering examples.
- Expand Azure and GCP provider mapping.
- Explore agent runtime and LLMOps / GPU sandbox tracks.

Detailed planning notes are kept locally. The public repository focuses on the reference architecture, examples, and mock-mode implementation path.

## Project Scope Statement

This project is a personal learning and reference implementation. It uses synthetic examples and public cloud service patterns.

Mock mode is the default. Avoid real AWS cost unless a future task explicitly requests and documents a safe deployment path.
