# AI Traffic Governance

AI traffic governance extends beyond LLM prompts. Future AI systems may include agents, tools, retrieval, memory, workflows, and data APIs.

In this project, the GenAI / LLM Gateway is the first model-access sub-layer. The broader AI Traffic Gateway / Governance Layer is a future governance layer for non-model traffic such as agent communication, tool calls, retrieval operations, workflow steps, integrations, and controlled data access.

Track D is research-only in the initial roadmap. It defines questions and governance shape, but it does not implement an agent runtime, traffic proxy, policy engine, or tool-call enforcement layer.

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

## First Iteration Boundary

This document defines the governance shape only. No runtime policy engine, agent gateway, retrieval service, traffic proxy, or tool-call enforcement is implemented in the foundation phase.

The RAG governance contract under `shared/schemas/rag-governance/` is a mock contract for retrieval evidence. It defines how future RAG flows can expose data classification, allowed knowledge base boundaries, citation checks, egress decisions, and audit metadata before any retrieval runtime is added.
