# GenAI / LLM Gateway

The GenAI / LLM Gateway is the model-access sub-layer of the CloudAI Control Plane. It provides a governed entry point for requests that call foundation models, chat models, embedding models, and other model-provider APIs.

This gateway is narrower than the broader AI Traffic Gateway / Governance Layer. It focuses on model access. The broader traffic layer may later govern agents, tools, API calls, retrieval, workflow steps, and data egress.

## Responsibilities

- Provide a consistent API boundary for model requests.
- Apply request validation, policy checks, and model access rules.
- Route to approved model providers and model families.
- Emit audit, token, cost, and observability signals.
- Support mock responses for demos and CI.

## Common LLM Gateway Patterns

Common LLM gateway patterns include:

- Model routing across approved providers and model families.
- Fallback behavior when a model, provider, or route is unavailable.
- Guardrails for prompt, response, and metadata checks.
- Token and cost tracking for FinOps review.
- Observability signals such as request IDs, latency, errors, and model labels.
- Audit records for request metadata, routing decisions, and policy outcomes.

## Relationship to AI Traffic Governance

The GenAI / LLM Gateway is one sub-layer inside the broader AI traffic governance model.

```text
Application / Agent
  -> AI Traffic Gateway / Governance Layer
      -> GenAI / LLM Gateway
  -> Provider AI Services
```

The first implementation path should keep this boundary small: mock model requests, synthetic metadata, token estimates, and audit-friendly response shapes. Broader agent, tool, and data-flow controls belong to the AI Traffic Gateway / Governance Layer.

## Future Features

- Model allow lists.
- Prompt and response safety checks.
- Token usage estimates.
- Request classification.
- Provider failover policies.
