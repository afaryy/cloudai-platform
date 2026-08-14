# P8i AgentCore Synthetic Knowledge-Lookup Contract Pack

## Status and Boundary

**Implemented — local synthetic contract pack.**

P8i provides an **AgentCore-ready control-plane design** for one future,
read-only knowledge-lookup capability. It tests the metadata contracts and
governance outcomes that a future workload would need to prove before any
runtime is permitted.

This pack has **no AgentCore integration or live runtime validation**. It has
no provider call, retrieval, embeddings, vector index, or customer data. It
does not deploy a Gateway, runtime, identity, policy, Terraform, MCP server,
or cloud resource.

All fixtures use synthetic owners, identities, source references, timestamps,
budget values, and evidence IDs. They contain no prompts, answers, source
content, raw logs, credentials, account identifiers, ARNs, endpoints, or
provider payloads.

## Control-Plane Contract Pack

The contracts live under [`shared/schemas/agentcore-readiness/`](../../shared/schemas/agentcore-readiness/):

| Contract | Purpose |
| --- | --- |
| Knowledge-lookup admission request | Requires a named owner, workload identity, read-only `knowledge-search` capability, route declaration, risk tier, and bounded session/budget metadata. |
| Approved knowledge boundary | Records ownership, synthetic classification, lifecycle state, read-only access, and allowed capability. |
| Gateway admission decision | Records the admitted, denied, approval-required, blocked, or disabled outcome with trusted synthetic policy/Guardrail IDs and versions, bounded session/budget metadata, and redacted evidence. |
| Emergency disable closure | Records a separate emergency-disable closure and rejects new requests for the workload identity. |

The request contract can record a `direct-runtime` attempt so that the contract
pack can preserve bypass evidence. It is never an admitted route: the matching
decision must be `deny` with a bypass reason code. `gateway-only` is the only
route that can meet the admitted-lookup relationship checks.

## Synthetic Scenarios

The fixtures under [`shared/examples/agentcore-readiness/`](../../shared/examples/agentcore-readiness/) show six metadata-only outcomes:

| Scenario | Expected outcome | Control demonstrated |
| --- | --- | --- |
| `allowed-gateway-lookup` | `admit` | Active, classified boundary; gateway-only route; allowed policy/Guardrail signals; bounded session and budget. |
| `retired-source-denied` | `deny` | A retired knowledge boundary cannot be admitted. |
| `high-risk-approval-required` | `approval-required` | An elevated-risk request remains pending human approval. |
| `policy-blocked` | `blocked` | A policy/Guardrail blocked signal closes the request before any future runtime action. |
| `direct-runtime-bypass` | `deny` | A direct-runtime attempt is captured as a bypass and denied. |
| `emergency-disabled` | `disabled` | Emergency closure rejects new requests and keeps metadata-only closure evidence. |

The local contract test proves that required owner/identity fields, active
source lifecycle, request-to-decision IDs and limits, route, trusted
policy/Guardrail metadata and decision mapping, bounded budget/session,
metadata-only evidence, bypass denial, and closure records fail closed when
changed or omitted.

## Relationship to Existing Evidence

- [P8h AgentCore knowledge-lookup readiness](p8h-agentcore-knowledge-lookup-readiness.md) provides the earlier gateway-first reference architecture and retains all runtime stop gates.
- [AI Traffic Governance](../practices/ai-traffic-governance.md) provides existing mock AgentOps and capability-governance evidence.
- [RAG knowledge lifecycle](rag-knowledge-lifecycle.md) provides related synthetic knowledge-source lifecycle evidence.
- [AI Platform Security and Operations Controls](../practices/ai-platform-security-operations-controls.md) provides the broader identity, evidence, operations, and FinOps control matrix.

P8i does not integrate these artifacts into an AgentCore service. It makes the
future admission and closure expectations locally testable without claiming
that any external control has been configured or validated.

## What This Does Not Claim

P8i does not demonstrate a deployed AgentCore agent, a working retrieval
system, production data access, provider validation, Guardrail effectiveness,
runtime bypass prevention, a production approval workflow, or operational
AgentCore service experience. Any real AgentCore proof of concept needs the
separate reviewed design and stop gates documented in P8h.
