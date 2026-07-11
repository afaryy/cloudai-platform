# AI Traffic Governance

AI traffic governance extends beyond LLM prompts. Future AI systems may include agents, tools, retrieval, memory, workflows, and data APIs.

In this project, the GenAI / LLM Gateway is the first model-access sub-layer. The broader AI Traffic Gateway / Governance Layer is a future governance layer for non-model traffic such as agent communication, tool calls, retrieval operations, workflow steps, integrations, and controlled data access.

P6a adds a small local, deterministic mock authorisation decision for agent-action metadata. It demonstrates how a future traffic governance layer can return a policy verdict, approval requirement, budget state, and audit identifiers without becoming an agent runtime, traffic proxy, or enforcement integration.

## Layered Architecture

```text
Application / Agent
  -> AI Traffic Gateway / Governance Layer
      -> GenAI / LLM Gateway
      -> Agent Gateway
      -> Tool/API Gateway
      -> Egress Policy
      -> Observability and Audit
  -> Provider AI Services
```

The GenAI / LLM Gateway handles model access. The broader traffic governance layer coordinates policy, traceability, approval, and safety boundaries across model calls and future non-model AI traffic.

## Governed Traffic Types

- Model prompts and completions.
- Retrieval requests, including source metadata, citation requirements, and egress decisions.
- Agent-to-agent communication.
- Agent tool calls.
- Agent-to-tool or agent-to-API calls.
- MCP/A2A-style integrations.
- Data access requests.
- Data egress decisions.
- Workflow and orchestration events.

## Governance Capabilities

- Data egress governance.
- Token-aware rate limiting.
- Policy enforcement.
- Cross-cloud traceability.
- Kill switches for unsafe or unexpected flows.
- Human approval boundaries for higher-risk actions.
- Observability and audit events across model, agent, tool, and data flows.

## Governance Questions

- Who or what initiated the request?
- Which policy allowed or denied it?
- What data boundary was crossed?
- What provider handled the request?
- What cost, latency, and risk signals were produced?
- Is human approval required before the action continues?
- Does the flow need to be stopped, rate-limited, or escalated?

## P6a Mock Decision Boundary

`POST /agent-actions/authorize` evaluates synthetic metadata only. It applies a fixed local allowlist and simple decision order for session lifecycle, budget exhaustion, tool permission, and human approval. Its response is an evidence contract, not an executed action.

P6a does not install or scan agent skills, invoke MCP tools, execute tool calls, contact models or cloud providers, persist audit records, proxy traffic, or enforce policy outside the local mock process.

P6b adds the separate mock capability-governance contract pack. It records registry metadata, skill cards, declared permissions, synthetic scan and evaluation evidence, integrity status, lifecycle, and admission decisions before a capability is eligible for future runtime use. See `docs/agent-capability-governance.md`. A blocked or approval-required capability is not treated as approved by the capability-admission evaluation.

The RAG governance contract under `shared/schemas/rag-governance/` is a mock contract for retrieval evidence. It defines how future RAG flows can expose data classification, allowed knowledge base boundaries, citation checks, egress decisions, and audit metadata before any retrieval runtime is added.

P6c adds synthetic knowledge-source lifecycle evidence for provenance, owner, classification, authorised knowledge bases, retention, review, and `active | paused | retired` state. The mock route rejects a retired source before it can return a governed response. See `docs/rag-knowledge-lifecycle.md`.
