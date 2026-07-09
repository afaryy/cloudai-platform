# Architecture

`cloudai-platform` presents an Enterprise Cloud AI Control Plane for governing model access, AI traffic, provider integration, platform foundations, observability, and cost controls across cloud environments.

The platform is AWS-first, with Amazon Bedrock as the initial model provider pattern. Its control-plane design remains provider-neutral so Azure and GCP mappings can be added without changing the core governance model.

## Logical Layers

- CloudAI Control Plane: use case intake, policy, approval, provider registry, audit, and evaluation.
- Model access sub-layer: GenAI / LLM Gateway for governed model routing, request controls, and response handling.
- AI Traffic Governance layer: broader future gateway controls for agent, tool, retrieval, workflow, and data-access traffic.
- Provider Adapter layer: AWS first, with Azure and GCP mapping notes.
- Platform Foundations: identity, secrets, encryption, network, CI/CD, observability, and infrastructure automation.

The GenAI / LLM Gateway is the first concrete runtime access pattern. The CloudAI Control Plane is not just a runtime hop; it is the governance and evidence layer that defines which use cases, providers, controls, and audit expectations apply. The broader AI Traffic Governance layer is intentionally described before implementation so future agent and tool flows can inherit the same policy, audit, observability, FinOps, and responsible AI model.

## High-Level CloudAI Platform Architecture

```mermaid
flowchart TB
  consumers["Consumers<br/>Developers | Applications | AI Agents | Platform Teams"]

  control["Enterprise Cloud AI Control Plane<br/>Use case intake | Policy and approval | Provider registry | Audit and evaluation"]

  governance["AI Traffic Gateway / Governance Layer<br/>GenAI / LLM Gateway | Agent and tool governance | Token and rate controls | Data egress policy"]

  adapters["Provider Adapter Layer<br/>AWS adapter | Azure adapter | GCP adapter"]

  subgraph providers["Provider Implementation View"]
    aws["AWS-first implementation<br/>Amazon Bedrock | API Gateway | Lambda / ECS / EKS | DynamoDB / S3 | CloudWatch"]
    azure["Azure future mapping<br/>Model access | API management | Runtime | Monitoring"]
    gcp["GCP future mapping<br/>Model access | API gateway | Runtime | Monitoring"]
  end

  cross["Cross-cutting capabilities<br/>Identity | Secrets | Encryption | Terraform | GitHub Actions | Observability | FinOps | Responsible AI | Audit"]

  consumers --> control
  control --> governance
  governance --> adapters
  adapters --> aws
  adapters -. "future mapping" .-> azure
  adapters -. "future mapping" .-> gcp

  cross -. "applies across" .-> control
  cross -. "applies across" .-> governance
  cross -. "applies across" .-> adapters
  cross -. "applies across" .-> providers
```

This diagram shows the control and integration layers rather than a deployed topology. The CloudAI Control Plane defines controls and evidence. The AI Traffic Gateway / Governance Layer applies those controls to model access now and broader AI traffic later. AWS is the first implementation path; Azure and GCP are shown as future provider mappings behind the same adapter boundary.

## Runtime Request Flow

```mermaid
sequenceDiagram
  autonumber
  participant Client as User / App / Agent
  participant Gateway as GenAI / LLM Gateway
  participant Checks as Policy / Token / Audit Checks
  participant Data as Retrieval / Tool / API Access
  participant Adapter as Provider Adapter
  participant Bedrock as Amazon Bedrock
  participant Ops as Logs / Traces
  participant Cost as Cost / Token Metrics
  participant Approval as Human Approval
  participant Egress as Data Egress Controls

  Client->>Gateway: Submit AI request with metadata
  Gateway->>Checks: Validate policy, tokens, rate, and audit context
  Checks-->>Approval: Request approval when policy requires review
  Approval-->>Checks: Approve, reject, or defer
  Checks->>Egress: Evaluate data boundary and egress rules
  Checks->>Data: Optional retrieval, tool, or API access
  Data-->>Checks: Return governed context or tool result
  Checks->>Adapter: Forward approved provider request
  Adapter->>Bedrock: Invoke model through AWS-first provider path
  Bedrock-->>Adapter: Return model response
  Adapter-->>Gateway: Return provider response and metadata
  Gateway-->>Client: Return governed response
  Gateway-->>Ops: Emit logs, traces, request IDs, and audit events
  Gateway-->>Cost: Emit token and cost metrics
  Egress-->>Ops: Emit data policy decision events
```

Runtime requests do not bypass governance. Even in future agent or tool flows, the expected pattern is to capture request metadata, evaluate policy, control tokens and data egress, emit observability and FinOps signals, and route through provider adapters.

## Relationship to the Six-Layer Enterprise AI Model

The six-layer enterprise AI model describes the broader operating model and capability map. This repository architecture describes how those capabilities are organised into a buildable reference implementation.

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
