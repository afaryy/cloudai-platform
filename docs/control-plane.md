# CloudAI Control Plane

The CloudAI Control Plane is the cloud-agnostic governance and coordination layer for AI enablement. It sits above provider-specific adapters for AWS, Azure, and GCP, and defines how AI use cases, model access, traffic controls, evidence, and operating signals should be handled.

This project is AWS-first, not AWS-only. AWS is the first implementation provider, while Azure and GCP are represented as future provider mappings. The control plane keeps common governance concepts separate from cloud-specific service integrations.

## Core Responsibilities

- Use case intake: capture the purpose, owner, environment, expected users, and intended AI capability.
- Data classification: identify the type of data a use case may handle and what controls should apply.
- Responsible AI governance: define review expectations, usage boundaries, evaluation needs, and escalation paths.
- Approved model access: decide which models, providers, and access paths are allowed for a given use case.
- GenAI / LLM Gateway relationship: treat the gateway as the first model-access sub-layer for governed model requests.
- AI traffic governance relationship: extend the control model beyond model calls to future agent, tool, retrieval, workflow, and data-access flows.
- AI FinOps: collect usage and cost signals such as model labels, request volume, and token estimates.
- Observability: define logs, traces, request IDs, decision events, and operational review signals.
- Evaluation harness: support quality, safety, and behavior checks using synthetic examples and repeatable test cases.
- CI/CD and release governance: connect changes to validation, review, deployment readiness, and rollback expectations.
- Human approval: require review when policy, data sensitivity, risk, or cost thresholds call for a manual decision.
- Audit evidence: capture decisions, approvals, policy outcomes, and runtime metadata needed for review.

## Provider Adapter Relationship

The control plane defines what should happen. Provider adapters define how that intent maps to a specific cloud provider.

- The CloudAI Control Plane is cloud-agnostic.
- Provider adapters are cloud-specific.
- The AWS adapter is the first implementation path.
- Azure and GCP adapters are future mappings.
- Provider services should not bypass the control-plane model for policy, approval, audit, observability, or cost signals.

## Architecture Flow

```text
Enterprise AI Control Plane
  -> AI Traffic Gateway / Governance Layer
  -> Provider Adapter
  -> AWS / Azure / GCP AI Services
  -> Cloud Landing Zone / Runtime
```

In this flow, the control plane defines governance intent and evidence expectations. The AI Traffic Gateway / Governance Layer applies those controls to model requests first, then later to broader AI traffic. Provider adapters translate approved requests into cloud-specific service calls. Cloud landing zones and runtimes provide the secure environment where workloads and supporting services run.

## Current Repository Scope

In the current foundation phase, the control plane is documented as a reference model. It does not deploy live cloud resources, call live model APIs, or implement policy enforcement.

The immediate implementation direction is to keep mock mode as the default, then add a small AWS-first mock GenAI / LLM Gateway in a future phase. That gateway can later emit request metadata, token estimates, policy decisions, evaluation signals, and audit evidence that align with this control-plane model.

## Non-Responsibilities

- It is not a model training platform.
- It does not own source datasets.
- It does not replace provider-native identity, encryption, network, or logging controls.
- It does not make cloud-specific service choices without a provider adapter.
