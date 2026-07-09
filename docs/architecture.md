# Architecture

`cloudai-platform` models an Enterprise AI Control Plane that separates policy, routing, provider integration, observability, and cost controls.

The first implementation path is AWS-first. AWS Bedrock is represented as the primary model provider pattern, while the control-plane concepts remain provider-neutral.

## Logical Layers

- Control plane: policy, approval, configuration, audit, and provider registry.
- Model access layer: GenAI / LLM gateway for model routing, request controls, and response handling.
- AI traffic governance: future agent, tool, retrieval, and data-access traffic policies.
- Provider adapters: AWS first, with Azure and GCP mapping notes.
- Platform foundations: identity, network, encryption, secrets, logging, and deployment automation.

## First Iteration Boundary

This iteration creates documentation and placeholders only. It does not deploy infrastructure, create credentials, or call real model APIs.
