# Architecture

`cloudai-platform` models an Enterprise AI Control Plane that separates policy, routing, provider integration, observability, and cost controls.

The first implementation path is AWS-first. AWS Bedrock is represented as the primary model provider pattern, while the control-plane concepts remain provider-neutral.

## Logical Layers

- Control plane: policy, approval, configuration, audit, and provider registry.
- Model access sub-layer: GenAI / LLM gateway for model routing, request controls, and response handling.
- AI traffic governance layer: broader future gateway controls for agent, tool, retrieval, workflow, and data-access traffic.
- Provider adapters: AWS first, with Azure and GCP mapping notes.
- Platform foundations: identity, network, encryption, secrets, logging, and deployment automation.

The GenAI / LLM gateway is the first concrete access pattern. The broader AI traffic governance layer is intentionally described before implementation so future agent and tool flows can inherit the same policy, audit, observability, and FinOps model.

## Relationship to the Six-Layer Enterprise AI Model

The six-layer enterprise AI model describes the broader operating model and capability map. The repository architecture describes how those capabilities are organised into a buildable reference implementation.

These two views are complementary, not conflicting. The six-layer model explains what enterprise capabilities are needed. The implementation model explains how this project structures those capabilities technically.

| Six-layer model | Repository implementation view | Explanation |
|---|---|---|
| Strategy | Project charter, roadmap, use case framing | Defines why the platform exists and what outcomes it supports. |
| Governance | CloudAI Control Plane, policy, approval, audit | Defines rules, controls, approval and evidence. |
| Data | RAG, retrieval, data access, data egress governance | Defines how enterprise knowledge and data are safely used. |
| Platform | GenAI / LLM Gateway, AI Traffic Governance, provider adapters | Provides standard access to models, tools, agents and provider services. |
| Infrastructure | AWS/Azure/GCP foundations, Terraform, IAM, network, KMS, secrets | Provides secure runtime and deployment foundations. |
| Operations | Observability, FinOps, runbooks, assessment, gap tracking | Makes the platform measurable, supportable and continuously improvable. |

## First Iteration Boundary

This iteration creates documentation and placeholders only. It does not deploy infrastructure, create credentials, or call real model APIs.
