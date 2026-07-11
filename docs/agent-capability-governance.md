# Agent Capability Governance

This mock-first contract pack shows how a reusable agent capability is assessed before it becomes available to the Enterprise AI platform.

## Capability Governance

Capability governance controls which reusable skills, MCP tools, plugins, adapters, and other agent capabilities may enter the approved platform catalogue. It records declared permissions, ownership, dependencies, known risks, scan and evaluation evidence, integrity status, lifecycle state, and an admission decision.

The pack uses four provider-neutral contracts under `shared/schemas/agent-capability-governance/`:

- `capability-record.schema.json`
- `skill-card.schema.json`
- `capability-evidence.schema.json`
- `capability-admission-decision.schema.json`

The three synthetic scenarios under `shared/examples/agent-capability-governance/` demonstrate `approved`, `blocked`, and `approval-required` outcomes. They do not install, scan, sign, or execute a capability.

This registry/admission layer is the capability-governance portion of the [Governed AI Factory](governed-ai-factory.md) reference architecture.

## Runtime Governance

Runtime governance is the separate AgentOps concern of controlling how an admitted capability may be used during a specific session. It evaluates agent and delegated-user identity, least-privilege tool access, policy verdicts, human approval, budgets, pause or terminate state, tracing, and audit evidence.

An approved capability is eligible for a runtime action, but it is not automatically allowed to act. A blocked or approval-required capability must not be treated as approved by a future runtime integration.

## Evidence Boundary

The evidence records are intentionally synthetic. `integrity.status: not-implemented` means this portfolio does not claim cryptographic signing or signature verification. Scan and evaluation fields document the expected evidence shape rather than a real scanner or benchmark result.

No agent runtime, tool executor, provider call, cloud deployment, or traffic proxy is implemented.
