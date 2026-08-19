# CloudAI Architecture

`cloudai-platform` is a public-safe Cloud & AI Platform Engineering reference
architecture. It describes the reusable controls that help an enterprise move
AI workloads from a defined business outcome to supported operation. It is not
a deployed enterprise topology or a claim that every capability below is
implemented in this repository.

The architecture is AWS-first and multi-cloud-ready: AWS is the first provider
implementation path, while Azure and GCP remain reference mappings behind the
same governance and adapter boundaries.

## 1. Enterprise Ecosystem Context

The first view is intentionally broader than a gateway or a cloud service. It
shows the relationship between enterprise accountability, shared platform
capability, workload domains, and provider implementation.

```mermaid
flowchart TB
  outcome["Enterprise outcomes<br/>and accountable<br/>ownership"]
  policy["Governance, Responsible AI,<br/>and data policy"]

  subgraph platform["Shared CloudAI Platform"]
    foundations["Secure cloud<br/>foundations"]
    access["Governed model, agent,<br/>and data access"]
    delivery["Delivery and<br/>operations controls"]
    capacity["Optional AI Factory<br/>and capacity extension"]
  end

  workloads["Business-domain AI<br/>workloads and integrations"]
  providers["AWS-first implementation<br/>with Azure and GCP<br/>future mappings"]

  outcome --> platform
  policy -. "applies across" .-> platform
  policy -. "applies across" .-> workloads
  platform --> workloads
  workloads --> providers

```

This is a reference architecture, not a linear delivery pipeline. Governance
and data policy apply across both the shared platform and the workloads that
use it. The optional AI Factory and capacity extension is relevant where a use
case needs accelerated compute, training, fine-tuning, or high-scale serving;
it is not a prerequisite for managed-model workloads.

## 2. Enterprise AI Capability Map

The six-layer enterprise AI model explains **what capabilities** a mature
enterprise needs. It is an executive and solution-architecture map, not a
deployment diagram.

| Enterprise capability layer | Core question |
| --- | --- |
| Strategy and operating model | Why is AI used, and who is accountable for value and outcomes? |
| Governance | What is allowed, what risk applies, and what evidence is required? |
| Data and knowledge | Which information may be used, retained, retrieved, or shared? |
| AI platform | How do workloads access shared models, agents, tools, and knowledge safely? |
| Cloud foundations | Under what identity, network, encryption, policy, and runtime boundary does it operate? |
| Delivery and operations | How is it released, evaluated, observed, cost-managed, supported, and retired? |

## 3. CloudAI Platform Reference Architecture

The CloudAI architecture turns the six capability layers into ten practical
platform domains. The domains are a reference model for organising controls;
they do not imply that all domains are centralised in one product or owned by
one team.

```mermaid
flowchart TB
  intake["1. Business outcome,<br/>use case, and accountable<br/>ownership"]
  risk["2. Governance, risk,<br/>Responsible AI, and approval"]
  data["3. Data, knowledge,<br/>classification, and lifecycle"]
  foundation["4. Identity, network, encryption,<br/>secrets, and policy"]
  model["5. Governed model<br/>and provider access"]
  traffic["6. Agent, tool, retrieval,<br/>workflow, and egress governance"]
  integration["7. Application and<br/>enterprise-system integration"]
  delivery["8. Infrastructure as code, CI/CD,<br/>testing, release, and rollback"]
  operations["9. Evaluation, observability,<br/>audit evidence, and AI FinOps"]
  lifecycle["10. Resilience, capacity, support,<br/>retirement, and improvement"]

  intake --> risk --> data --> foundation --> model --> traffic --> integration
  integration --> delivery --> operations --> lifecycle
  risk -. "sets policy" .-> model
  data -. "sets authorised knowledge boundary" .-> traffic
  foundation -. "protects" .-> model
  foundation -. "protects" .-> integration
  operations -. "feeds evidence to" .-> risk

```

| Six-layer capability map | CloudAI reference domains |
| --- | --- |
| Strategy and operating model | 1. Business outcome, use case, and accountable ownership |
| Governance | 2. Governance, risk, Responsible AI, and approval |
| Data and knowledge | 3. Data, knowledge, classification, and lifecycle |
| AI platform | 5. Governed model and provider access; 6. Agent, tool, retrieval, workflow, and egress governance; 7. Application and enterprise-system integration |
| Cloud foundations | 4. Identity, network, encryption, secrets, and policy |
| Delivery and operations | 8. Delivery engineering; 9. Evaluation, observability, audit evidence, and AI FinOps; 10. Resilience, capacity, support, retirement, and improvement |

The six layers and the ten domains are complementary. The former describes the
enterprise capability model; the latter describes the CloudAI platform
reference architecture.

## 4. Use Case to Production Lifecycle

The lifecycle explains **how one workload moves through the architecture**. It
is not another layer stack, and individual controls may iterate as the use case
changes.

```mermaid
flowchart TB
  usecase["Business use case<br/>and owner"]
  assessment["Data classification<br/>and risk assessment"]
  pattern["Approved platform<br/>pattern"]
  secure["Secure foundation<br/>and workload identity"]
  access["Model, knowledge, tool,<br/>and integration access"]
  release["Infrastructure as code, CI/CD,<br/>evaluation, and release gates"]
  operate["Observability, FinOps,<br/>audit evidence, and support"]
  improve["Resilience, retirement,<br/>and continuous improvement"]

  subgraph discover["1. Discover and design"]
    direction LR
    usecase --> assessment --> pattern
  end

  subgraph deliver["2. Build and release"]
    direction LR
    secure --> access --> release
  end

  subgraph operate_loop["3. Operate and improve"]
    direction LR
    operate --> improve
  end

  pattern --> secure
  release --> operate
  improve -. "feedback, change, or retirement decision" .-> assessment

```

The lifecycle starts by establishing a business outcome, accountable owner,
data classification, and risk posture. An approved pattern then moves through
secure foundations, governed access, and release controls before it enters
operation. Operational evidence, cost, support, resilience, and retirement
decisions feed back into assessment whenever the workload, its data, or its
risk profile changes. This is a delivery and operating cycle—not a seventh
enterprise capability layer or a claim that every step is automated.

## 5. Implementation and Provider Views

The following views connect the reference architecture to the portfolio. Each
is intentionally bounded and should be read with its stated evidence boundary.

| Architecture area | Portfolio evidence and boundary |
| --- | --- |
| Governed model access | [GenAI / LLM Gateway](../solutions/genai-llm-gateway.md) and the [Governed AI Gateway case study](../solutions/featured-solutions.md#governed-ai-gateway): implemented with mock mode as the default; provider mode is an explicit, bounded action. |
| Data and knowledge controls | [RAG knowledge lifecycle](../solutions/rag-knowledge-lifecycle.md), the [Governed RAG Lifecycle case study](../solutions/featured-solutions.md#governed-rag-lifecycle), and [P8i AgentCore RAG](../solutions/p8i-agentcore-rag-data-foundation.md): local synthetic controls plus bounded AWS provider-backed retrieval evidence. |
| Delivery engineering | [AI release engineering on EKS](../solutions/ai-release-engineering-on-eks.md) and the [EKS case study](../solutions/featured-solutions.md#ai-release-engineering-on-eks): sandbox-validated delivery controls for a synthetic workload. |
| Bounded provider access | [P8 Bedrock sandbox design](../solutions/p8-real-bedrock-sandbox-design.md) and the [Bounded Bedrock Sandbox case study](../solutions/featured-solutions.md#bounded-bedrock-sandbox): bounded synthetic sandbox validation, not a persistent Bedrock application. |
| Agent runtime extension | [AgentCore Governed RAG POC](./agentcore-governed-rag-poc.md) and [P8i data foundation](../solutions/p8i-agentcore-rag-data-foundation.md): deployed synthetic AWS sandbox with protected ingestion, direct Bedrock preflight, and Gateway end-to-end evidence; no production claim. |
| AI Factory and accelerated capacity | [AI Factory infrastructure lens](./ai-factory-infrastructure-lens.md), [AI Workload Operating Contract](../practices/ai-workload-operating-contract.md), and [GPU workload readiness](./ai-factory-gpu-workload-readiness.md): design context for LLMOps, workload profiles, placement, scheduling, capacity, observability, FinOps, and accelerator patterns; no GPU, training, fine-tuning, or high-scale serving implementation. |
| Multi-cloud mappings | [AWS](./aws-reference-architecture.md), [Azure](./azure-reference-architecture.md), and [GCP](./gcp-reference-architecture.md) mappings: AWS-first implementation context with Azure/GCP reference mappings, not provider parity claims. |

## 6. Current Implementation and Evidence Status

The architecture above includes the full ecosystem. The following table states
what this repository currently demonstrates publicly.

| Area | Implementation and evidence status |
| --- | --- |
| Governed AI Gateway | Implemented — mock-first |
| AI Release Engineering on EKS | Implemented — sandbox-validated for a synthetic workload |
| Governed RAG Lifecycle | Implemented — local synthetic workflow |
| Bounded Bedrock Sandbox | Implemented — bounded synthetic sandbox validation |
| AgentCore | Synthetic sandbox deployed; direct Bedrock preflight and Gateway end-to-end evidence complete; teardown remains explicit and pending |
| Azure and GCP | Reference mappings only |
| AI Factory and accelerated capacity | Future/design context only; no GPU, training, fine-tuning, or high-scale serving implementation |

For the detailed evidence record and intentionally deferred scope, read
[Current status](../practices/current-status.md). The repository contains no employer,
customer, confidential, credential, or proprietary material. It uses synthetic
data, generic identifiers, public cloud service patterns, and mock mode as the
ordinary runtime path.
