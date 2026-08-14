# Three-Cloud Governed RAG Reference

## Purpose

This reference compares how AWS, Azure, and GCP can implement the same
enterprise RAG control contract. It is deliberately not a benchmark claiming
that one provider or model is universally better.

The portfolio sequence is **AWS live POC first**, then Azure and GCP
architecture mappings and optional small validations. All examples use only
synthetic, self-authored material.

## Shared Governed RAG Contract

```text
authenticated user or workload
        ↓
deterministic admission and source policy
        ↓
approved retrieval service and synthetic knowledge source
        ↓
grounded answer with citations — or explicit abstention
        ↓
evaluation, metadata-safe observability, cost ownership, and teardown
```

The model must not decide access, source retirement, approval, or execution.
Those are deterministic platform controls.

## Common Evaluation Set

Each implementation uses the same synthetic handbook and the same six outcomes:

| Scenario | Expected result |
| --- | --- |
| Active approved source | Cited answer |
| Insufficient evidence | Abstention |
| Retired source | Denied before retrieval |
| Disabled workload | Disabled before retrieval |
| Prompt-attack-shaped input | Denied or safely blocked |
| Direct runtime bypass | Denied before retrieval |

The comparison records only safe evidence: outcome, citation-present flag,
control decision, timestamp, and aggregate cost range. It excludes credentials,
endpoints, raw prompts, raw answers, and provider identifiers.

## Provider Mappings

| Control concern | AWS flagship POC | Azure mapping | GCP mapping |
| --- | --- | --- | --- |
| Entry boundary | AgentCore Gateway | Application/API entry with Entra-backed access | Application/API entry with IAM-backed access |
| Read-only runtime | AgentCore Runtime | Hosted application or agent runtime | Hosted application or agent runtime |
| Retrieval | Bedrock Knowledge Bases | Azure AI Search / Foundry RAG | Vertex AI RAG Engine |
| Grounding result | Cited answer or abstention | Grounded response with citations | Grounded response with citations |
| Deterministic controls | Gateway policy, IAM, source lifecycle | Identity, application policy, source lifecycle | IAM, application policy, source lifecycle |
| Evidence | Metadata-safe logs and evaluation results | Equivalent audit/evaluation evidence | Equivalent audit/evaluation evidence |

The named services are starting points, not a claim that the products are
identical. The portable asset is the control contract and evidence model.

## Fair Comparison Rules

1. Keep the corpus, questions, expected outcomes, and citation requirement
   unchanged across providers.
2. Do not compare raw model quality until model family, retrieval settings,
   region, cost boundary, and evaluation method are controlled and recorded.
3. Record architecture mappings separately from live validation evidence.
4. Treat deployment, provider access, and teardown as provider-specific gates.
5. Prefer reproducible operational evidence over screenshots or product claims.

## Current Evidence Status

| Provider | Status | Next evidence |
| --- | --- | --- |
| AWS | Local contract and runtime implementation in progress | Approved Sydney sandbox preflight, then bounded validation and teardown |
| Azure | Architecture mapping planned | Confirm service path, region, access, cost, and teardown before any validation |
| GCP | Architecture mapping planned | Confirm service path, region, access, cost, and teardown before any validation |

## Official Starting Points

- [Amazon Bedrock Knowledge Bases retrieval](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-retrieval.html)
- [Azure AI Search RAG overview](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [Vertex AI RAG Engine quickstart](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-engine-quickstart)

## Portfolio and Article Angle

> Designed a provider-neutral governed RAG reference architecture with one
> shared control and evaluation contract, an AWS AgentCore flagship POC, and
> evidence-based Azure and GCP mappings.

The repository document is the primary technical article. A LinkedIn post
should summarise one insight and link to this reference; it should not claim
production deployment or a cross-cloud quality winner.
