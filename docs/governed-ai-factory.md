# Governed AI Factory

The Governed AI Factory is the destination architecture for this portfolio: a repeatable Enterprise AI capability that lets many teams adopt models, agents, enterprise knowledge, and AI-assisted engineering without bypassing security, safety, cost, or operational controls.

It is an architecture and operating-model reference, not a deployed product in this repository. Current implementation remains local, synthetic, and mock-first.

## Reference Model

```text
Enterprise governance and adoption
  -> CDAO or equivalent: value, data/AI governance, model-risk expectations
  -> Product, engineering, and operations teams: domain outcomes and support

Governed AI Factory control plane
  -> Unified AI Asset Registry
  -> GenAI Gateway and federated data-plane controls
  -> Guardrails as a Service
  -> Agentic LLMOps, evaluation, audit, observability, and FinOps

AI delivery and compute plane
  -> Approved models, RAG, agents, tools, MCP integrations, and developer workflows
  -> Training, fine-tuning, batch inference, and high-throughput serving
  -> Optional accelerated capacity, such as SageMaker HyperPod with EKS or Slurm
```

## Unified AI Asset Registry

The registry is a single catalogue of approved AI assets and their governance evidence. It provides the control plane with an authoritative view of what may be used, by whom, and under which policy.

Representative asset types:

- models and provider access profiles;
- agents, skills, MCP tools, plugins, and APIs;
- RAG sources, corpora, data classifications, and owners;
- prompts, policy profiles, evaluation datasets, and release evidence;
- training, inference, and capacity profiles.

Each asset should have an owner, version, risk tier, lifecycle state, approval evidence, and review date. A registry entry is not permission to act: runtime AgentOps still evaluates the particular identity, session, tool, data boundary, approval, and budget.

## GenAI Gateway and Federated Data Planes

The GenAI Gateway is the standard model-access path. Federated data-plane controls let separate business domains retain their own authorised data boundaries while using shared identity, policy, metadata, tracing, and cost standards.

Core controls include:

- workload and delegated-user identity;
- approved model, agent, and tool routing;
- governed RAG metadata, citations, and egress decisions;
- MCP integration admission and least-privilege tool authorisation;
- token, request, model, infrastructure, and capacity budget metadata;
- trace IDs, audit evidence, evaluation signals, and operational ownership.

## Guardrails as a Service

Guardrails as a Service is a reusable policy-assessment layer that can be called by the model gateway, RAG applications, agent runtime controls, and delivery workflows.

Typical verdicts are `allow`, `redact`, `deny`, or `approval-required`. A public-safe mock contract can demonstrate these controls without inspecting real content or calling a moderation service.

| Guardrail | Purpose |
| --- | --- |
| PII and sensitive-data detection | Identify data that requires redaction, denial, or an approved handling path. |
| Prompt-injection and jailbreak checks | Detect attempts to override instructions, bypass policy, or misuse an agent or tool. |
| Content and safety policy | Apply approved use-case, risk-tier, and response-boundary rules. |
| Tool and data-action risk | Escalate higher-impact actions to human approval or deny them. |
| Evidence and evaluation | Record metadata-only verdicts, reason codes, trace IDs, and test outcomes. |

## Agentic LLMOps

Agentic LLMOps makes AI systems repeatable and supportable across their lifecycle:

- capability admission, versioning, evaluation, and retirement;
- runtime identity, least-privilege tool access, human approval, and pause/terminate controls;
- model, agent, RAG, tool, and guardrail evaluation;
- release gates, GitHub Actions checks, change evidence, rollback, and incident response;
- observability, audit, FinOps, capacity planning, resilience, and supplier risk.

The repository currently demonstrates portions of this model through mock gateway, governed RAG, and P6 AgentOps work. It does not run a real agent runtime or external integration.

## Adoption Layer

The factory should let many teams consume approved capabilities through standard pathways rather than isolated stacks:

- internal assistants and voice interfaces;
- no-code or low-code agent experiences;
- developer productivity workflows, including approved coding-assistant integrations;
- product-domain agents connected to authorised data and tools;
- training, evaluation, and inference workflows for ML and GenAI teams.

Each pathway inherits the same registry, gateway, guardrail, identity, budget, audit, and lifecycle controls.

## Portfolio Roadmap Mapping

| Portfolio phase | Governed AI Factory contribution |
| --- | --- |
| P1/P2 | Mock GenAI gateway, model access controls, request metadata, token guardrails, and future GaaS contracts. |
| P3 | Governed RAG, citations, source metadata, egress decisions, and evaluation evidence. |
| P4/P5 | EKS release engineering and AI-assisted DevSecOps delivery controls. |
| P6 | Runtime AgentOps, capability registry/governance, and RAG knowledge lifecycle controls. |
| P7 | AI Factory operating model, LLMOps, synthetic capacity contracts, and optional bounded accelerated-compute design. |

## Boundary

This portfolio does not claim to operate a CDAO function, central asset registry, provider gateway, guardrail service, MCP integration, voice agent, no-code agent platform, or HyperPod cluster. These are public-safe architecture patterns and later mock or sandbox candidates only.
