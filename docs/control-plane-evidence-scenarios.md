# Control-Plane Evidence Scenarios

P6e turns the P6d evidence-map idea into a small scenario pack. Each scenario shows how the CloudAI control plane could explain a different governance outcome using existing synthetic evidence from Runtime AgentOps, Capability Governance, RAG Knowledge Lifecycle, Guardrails as a Service, and AI-assisted review evidence.

The goal is not to execute an agent or enforce policy. The goal is to make the evidence story easier to demo:

- why one agent action is allowed
- why another action is denied
- why a high-impact action pauses for human approval
- why a reusable capability is blocked before runtime
- why a retired RAG source cannot support a new answer

## Scenario Outcomes

| Scenario | Outcome | What it demonstrates |
|---|---|---|
| Allowed tool call | `allowed` | Runtime AgentOps can allow a low-risk read action when identity, tool scope, policy, and budget are acceptable. |
| Denied tool call | `denied` | Runtime AgentOps can deny a tool request when the requested tool is outside the approved allowlist. |
| Human approval required | `approval-required` | High-impact actions can pause for human approval even when the agent session is otherwise valid. |
| Capability blocked | `blocked-before-runtime` | Capability Governance can block a reusable skill, plugin, MCP tool, or adapter before it becomes eligible for runtime use. |
| Retired knowledge source | `retired-source-blocked` | RAG Knowledge Lifecycle can prevent a retired source from contributing to new governed RAG responses. |

## Why This Matters

Enterprise AI governance is easier to explain through outcomes than through abstract controls alone. A portfolio reviewer should be able to ask:

```text
What evidence would explain why this AI action was allowed, denied, paused, blocked, or retired?
```

P6e answers that question with metadata-only examples.

For deterministic repeated policy checks, see the [Agent Behavioural Reliability Gate](agent-behavioural-reliability-gate.md). It extends the runtime-AgentOps evidence lane without executing an agent action.

## Relationship To P6d

P6d is one end-to-end evidence map. P6e is a scenario pack built from the same control lanes.

```text
P6d: one connected evidence map
P6e: multiple governance outcomes for demo and interview explanation
```

The scenario pack is useful because it shows both positive and negative controls. A mature platform should prove allowed paths and blocked paths.

## Boundary

P6e does not:

- execute agent actions
- install, scan, sign, or verify real skills
- call a model or provider
- query a vector store
- store prompts, retrieved content, tool payloads, credentials, or customer data
- deploy cloud resources
- persist audit records

It uses synthetic references to existing mock evidence files only.

## Portfolio Use

Use this page to explain the difference between architecture diagrams and operational evidence:

> I can show how the control plane would explain five different AI governance outcomes: allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked. The examples are synthetic, but the evidence shape is realistic for regulated enterprise AI.
