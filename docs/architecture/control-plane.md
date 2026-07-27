# CloudAI Control Plane

The CloudAI Control Plane is the cloud-agnostic governance and coordination layer for AI enablement. It sits above provider-specific adapters for AWS, Azure, and GCP, and defines how AI use cases, model access, traffic controls, evidence, and operating signals should be handled.

This project is AWS-first, not AWS-only. AWS has bounded
implementation/validation evidence, while Azure and GCP are future provider
mappings. The control plane keeps common governance concepts separate from
cloud-specific service integrations.

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

## Runtime Request Path

```text
Cloud Landing Zone / Runtime Foundation
  └─ identity, network, secrets, logging, policy, and operational controls
      └─ Use Case / Application / Enterprise Integration
          -> GenAI / LLM Gateway and AI Traffic Governance
          -> Provider Adapter
          -> AWS / Azure / GCP AI Services

CloudAI Control Plane applies policy, approval, evidence, and operating intent
across the workflow.
```

This is a scoped request-path view, not the overall CloudAI architecture. The
landing zone and runtime are the secure foundation that hosts the workload and
supporting controls; they are not a final provider hop. The control plane
defines governance intent and evidence expectations. The gateway and AI Traffic
Governance layer apply those controls to model requests first, then later to
broader AI traffic. Provider adapters translate approved requests into
cloud-specific service calls.

## Current Repository Scope

The control plane remains a reference coordination model rather than a complete
runtime policy-enforcement product. Partial local mock evidence exists through
the gateway and P6 contracts, and bounded provider evidence exists through
manually approved synthetic Bedrock validation. Mock mode remains the default.

End-to-end policy enforcement, a runtime traffic proxy, and autonomous agent
execution remain future scope. The existing gateway can emit request metadata,
token estimates, policy decisions, evaluation signals, and audit evidence that
align with the control-plane model.

## Non-Responsibilities

- It is not a model training platform.
- It does not own source datasets.
- It does not replace provider-native identity, encryption, network, or logging controls.
- It does not make cloud-specific service choices without a provider adapter.
