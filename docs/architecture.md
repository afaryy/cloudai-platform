# Architecture

`cloudai-platform` presents a Cloud AI Control Plane for governing model access, AI traffic, provider integration, platform foundations, observability, and cost controls across cloud environments.

The platform is AWS-first, with Amazon Bedrock as the initial model provider pattern. Its control-plane design remains provider-neutral so Azure and GCP mappings can be added without changing the core governance model.

## Logical Layer Overview

Start here. This view explains the platform in plain language before the later diagrams add system and implementation detail.

- CloudAI Control Plane: use case intake, policy, approval, responsible AI review, provider registry, audit, and evaluation.
- Model access sub-layer: GenAI / LLM Gateway for governed model routing, request controls, and response handling.
- AI Traffic Governance layer: broader future gateway controls for agent, tool, retrieval, workflow, and data-access traffic.
- Provider Adapter layer: AWS first, with Azure and GCP reference architecture mappings.
- Platform Foundations: identity, encryption, key management, network, CI/CD, observability, and infrastructure automation.

```mermaid
flowchart TB
  purpose["Why this exists<br/>Enable AI use with governance, visibility, and cost awareness"]

  decide["1. Decide what is allowed<br/>Use case intake | Policies | Responsible AI review | Approvals | Evidence"]

  access["2. Control how AI is accessed<br/>GenAI / LLM Gateway | Model routing | Request checks"]

  govern["3. Govern broader AI traffic<br/>Agents | Tools | Retrieval | Data movement"]

  connect["4. Connect to cloud providers<br/>AWS-first adapter | Azure mapping | GCP mapping"]

  operate["5. Run, measure, and improve<br/>Infrastructure | CI/CD | Observability | FinOps | Responsible AI"]

  purpose --> decide
  decide --> access
  access --> govern
  govern --> connect
  connect --> operate
```

This logical view introduces the role of each layer before the system and technical diagrams describe provider adapters, gateways, and runtime flows.

The GenAI / LLM Gateway is the first concrete runtime access pattern. The CloudAI Control Plane is not just a runtime hop; it is the governance and evidence layer that defines which use cases, providers, controls, and audit expectations apply. The broader AI Traffic Governance layer is intentionally described before implementation so future agent and tool flows can inherit the same policy, audit, observability, FinOps, and responsible AI model.

## Cloud & AI Platform System View

```mermaid
flowchart LR
  subgraph experience["1. Experience and Consumers"]
    teams["Platform teams"]
    apps["Applications"]
    developers["Developers"]
    agents["AI agents"]
  end

  subgraph control["2. Cloud AI Control Plane"]
    intake["Use case intake"]
    governance["Responsible AI governance"]
    registry["Provider and model registry"]
    evidence["Audit evidence"]
  end

  subgraph access["3. AI Access and Traffic Governance"]
    llm["GenAI / LLM Gateway<br/>model access"]
    traffic["AI Traffic Governance<br/>agents, tools, data flows"]
    policy["Policy, token, and rate controls"]
    egress["Data egress controls"]
  end

  subgraph provider["4. Provider Implementation"]
    aws["AWS-first path<br/>Amazon Bedrock | API Gateway | Lambda / ECS / EKS"]
    azure["Azure mapping<br/>future provider adapter"]
    gcp["GCP mapping<br/>future provider adapter"]
  end

  subgraph ops["5. Infrastructure and Operations"]
    iac["Terraform and GitHub Actions"]
    identity["Identity, encryption, and key management"]
    observability["Observability and evaluation"]
    finops["FinOps and cost controls"]
  end

  teams --> intake
  apps --> llm
  developers --> intake
  agents --> traffic

  intake --> governance
  governance --> registry
  registry --> llm
  evidence --> observability

  llm --> policy
  traffic --> policy
  policy --> egress
  egress --> aws

  aws -. "provider adapter boundary" .-> azure
  aws -. "provider adapter boundary" .-> gcp

  iac -. "supports" .-> aws
  iac -. "supports future mappings" .-> azure
  iac -. "supports future mappings" .-> gcp
  identity -. "protects" .-> control
  identity -. "protects" .-> access
  observability -. "measures" .-> access
  finops -. "governs usage" .-> access
```

This system view shows the overall Cloud & AI platform story: consumer entry points, control-plane governance, runtime access and traffic controls, provider implementation paths, and operating capabilities. It is intentionally higher level than the technical architecture view below.

## High-Level CloudAI Platform Architecture

```mermaid
flowchart TB
  consumers["Consumers<br/>Developers | Applications | AI Agents | Platform Teams"]

  control["CloudAI Control Plane<br/>Use case intake | Policy and approval | Provider registry | Audit and evaluation"]

  governance["AI Traffic Gateway / Governance Layer<br/>GenAI / LLM Gateway | Agent and tool governance | Token and rate controls | Data egress policy"]

  adapters["Provider Adapter Layer<br/>AWS adapter | Azure adapter | GCP adapter"]

  subgraph providers["Provider Implementation View"]
    aws["AWS-first implementation<br/>Amazon Bedrock | API Gateway | Lambda / ECS / EKS | DynamoDB / S3 | CloudWatch"]
    azure["Azure future mapping<br/>Model access | API management | Runtime | Monitoring"]
    gcp["GCP future mapping<br/>Model access | API gateway | Runtime | Monitoring"]
  end

  cross["Cross-cutting capabilities<br/>Identity | Key management | Encryption | Terraform | GitHub Actions | Observability | FinOps | Responsible AI | Audit"]

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

The six-layer enterprise AI model describes the broader capability map. This repository architecture describes how those capabilities are organised into a buildable reference implementation.

These two views are complementary, not conflicting. The six-layer model explains what platform capabilities are needed. The implementation model explains how this project structures those capabilities technically.

| Six-layer model | Repository implementation view | Explanation |
|---|---|---|
| Strategy | Project charter, roadmap, use case framing | Defines why the platform exists and what outcomes it supports. |
| Governance | CloudAI Control Plane, policy, approval, audit | Defines rules, controls, approval and evidence. |
| Data | RAG, retrieval, data access, data egress governance | Defines how knowledge and data are safely used. |
| Platform | GenAI / LLM Gateway, AI Traffic Governance, provider adapters | Provides standard access to models, tools, agents and provider services. |
| Infrastructure | AWS/Azure/GCP foundations, Terraform, IAM, network, KMS, key management | Provides secure runtime and deployment foundations. |
| Operations | Observability, FinOps, runbooks, assessment, gap tracking | Makes the platform measurable, supportable and continuously improvable. |

## First Iteration Boundary

This iteration creates documentation and placeholders only. It does not deploy infrastructure, set up provider access, or call real model APIs.
