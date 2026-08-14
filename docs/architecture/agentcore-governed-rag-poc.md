# AgentCore Governed RAG POC

## Purpose

This planned personal sandbox demonstrates how a regulated enterprise can
provide safe, read-only knowledge assistance without allowing an AI model to
decide access, safety, or execution outcomes.

It is a learning and portfolio proof of concept. It will use only synthetic,
self-authored documentation in Sydney (`ap-southeast-2`), and it is not a
production deployment claim.

## Architecture Principle

> **Deterministic controls govern risk; AI provides bounded,
> evidence-based assistance.**

IAM, gateway policy, knowledge-source lifecycle, approval rules, and disable
controls decide whether work is allowed. The model can only provide a grounded
answer with citations, or an explicit inability-to-answer result when evidence
is insufficient.

```text
Synthetic test client
        ↓
AgentCore Gateway
  authentication · gateway-only policy · metadata-safe evidence
        ↓
AgentCore Runtime
  read-only orchestration · least privilege · named owner
        ↓
Bedrock Knowledge Base + Guardrails + model
  synthetic sources · citations · safe abstention
```

## Scope and Boundaries

The initial user story is a Cloud & AI Platform question answered only from an
approved synthetic knowledge source. The response must contain supporting
citations or safely abstain.

The POC excludes customer, employer, internal, confidential, and production
data. It also excludes tools, writes, browser access, code execution, durable
memory, autonomous actions, and automated deployment or teardown.

## Required Evidence

Before and after any sandbox deployment, the portfolio will retain only
sanitized evidence for:

- Gateway-only access and rejection of direct Runtime invocation.
- Active versus retired knowledge-source behaviour.
- Cited answer, safe abstention, and Guardrail-blocked scenarios.
- Named ownership, least-privilege boundary, budget tags, and cost range.
- Metadata-only observability, emergency-disable outcome, and complete
  teardown.

## Delivery Stages

1. Provider-neutral Governed RAG Contract: one synthetic corpus, a shared
   evaluation set, and fixed control/evidence criteria across AWS, Azure, and
   GCP.
2. Local AWS contracts and synthetic evaluation cases.
3. Reviewed AWS preflight: identity, region, model access, quotas, IAM,
   budget, logs, and teardown plan.
4. Explicitly approved small AWS sandbox deployment.
5. Sanitized validation evidence and resource destruction.
6. Azure and GCP equivalent architecture mappings, followed by optional
   small validations only when their own preflight, budget, and teardown
   gates have been reviewed.

Any failed preflight condition stops the work before cloud resources are
created.

## Three-Cloud Comparison Boundary

This POC is the AWS flagship implementation of a wider **Governed RAG
Reference**. It compares control and operating patterns, not a vendor ranking
or an uncontrolled model-quality contest.

Every provider mapping must use the same synthetic source material and test:

- authenticated access and named ownership;
- approved source lifecycle and retrieval boundary;
- grounded citations or an explicit abstention;
- deterministic policy decisions outside the model;
- evaluation and metadata-safe observability;
- cost ownership, safe failure, and teardown.

| Provider | Initial reference path | Evidence level |
| --- | --- | --- |
| AWS | AgentCore Gateway + Runtime + Bedrock Knowledge Bases + Guardrails | Live POC after explicit approval |
| Azure | Foundry and Azure AI Search RAG mapping | Architecture mapping first; optional validation later |
| GCP | Vertex AI RAG Engine mapping | Architecture mapping first; optional validation later |

The public comparison will distinguish verified behaviour, architecture-level
equivalence, and future validation. It will never imply a deployed workload
where only a documented mapping exists.

## Relationship to Existing Work

- [AgentCore Knowledge-Lookup Readiness](../solutions/p8h-agentcore-knowledge-lookup-readiness.md)
  defines the initial gateway-first control boundaries.
- [AgentCore Synthetic Knowledge-Lookup Contract Pack](../solutions/p8i-agentcore-synthetic-contract-pack.md)
  provides local fail-closed admission and closure evidence.
- [Governed RAG Lifecycle](../solutions/rag-knowledge-lifecycle.md) provides
  related source-lifecycle patterns.

## Interview Positioning

> Designed and validated a governed Amazon Bedrock AgentCore POC with
> Gateway-enforced access, least-privilege Runtime orchestration, Bedrock
> Guardrails, synthetic RAG citations, metadata-only observability, cost
> controls, and a tested teardown path.
