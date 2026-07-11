# Agent Capability Governance Design

## Goal

Add a public-safe, mock-first capability governance layer that documents and validates how an enterprise platform can review reusable agent capabilities before they are available to an agent runtime.

## Context

The repository already demonstrates governed RAG evidence and defines AI Traffic Governance as a future layer for agents, tools, retrieval, workflows, and data access. This increment adds the governance layer that sits before runtime execution.

Capability governance answers whether a reusable capability may enter the platform. Runtime governance answers what an approved agent may do while executing. This increment implements only the first question.

## Scope

Create provider-neutral JSON Schemas and synthetic examples for:

- A capability record with identity, ownership, source, version, declared permissions, dependencies, and lifecycle state.
- A skill card with purpose, intended users, inputs, outputs, data flow, known risks, mitigations, and references.
- Capability evidence with scan, evaluation, and integrity status plus evidence references.
- An admission decision with allow, block, or approval-required outcomes and review metadata.

Add a small TypeScript evaluation that checks the contract relationship between the approved, blocked, and approval-required examples. Update public documentation so the roadmap explicitly moves from governed RAG to capability governance to runtime AgentOps.

## Non-Goals

- No real agent, tool executor, MCP server, traffic proxy, or cloud deployment.
- No external NVIDIA dependency, SkillSpector installation, model call, signature creation, or cryptographic verification.
- No real credentials, external endpoints, confidential data, or production claims.
- No runtime agent identity or tool-permission enforcement. Those belong to the next AgentOps increment.

## Architecture

```text
Capability source and declared metadata
  -> capability record and skill card
  -> scan, evaluation, and integrity evidence
  -> admission decision
  -> approved capability registry
  -> future runtime AgentOps controls
```

The JSON Schemas are the portable contract layer. Synthetic examples demonstrate decision outcomes without executing a capability. The evaluation harness verifies that approval is supported by the required evidence and that risky examples remain blocked or require review.

## Contract Boundaries

### Capability Record

Defines the stable registry entry. It includes a capability identifier, version, owner role, source classification, declared permissions, dependency declarations, and lifecycle status.

### Skill Card

Defines human-readable and machine-consumable governance context. It describes the capability purpose, expected users, input and output categories, data-flow boundary, risks, mitigations, and supporting references.

### Capability Evidence

Defines evidence recorded before an admission decision. It includes scan status, evaluation status, integrity status, and a list of synthetic evidence references. It does not claim that a real scan, signature, or benchmark was run.

### Admission Decision

Defines the governance outcome. Allowed values are `approved`, `blocked`, and `approval-required`. Every decision records a rationale, reviewer role, decision date, and review-by date.

## Example Scenarios

### Approved

An internal knowledge-search capability has a narrow read-only permission declaration, no external egress, complete mock evidence, and an approved decision.

### Blocked

A capability requests undeclared outbound network access and broad file access. Its evidence records a failed scan state, and its admission decision is blocked.

### Approval Required

A change-summary capability has a legitimate use case but requires human review before broader availability. Its decision remains approval-required rather than approved.

## Documentation Updates

- Add `docs/agent-capability-governance.md` to explain the distinction between capability governance and runtime governance.
- Update `docs/ai-traffic-governance.md` so runtime controls consume only approved capabilities.
- Update `README.md`, `docs/current-status.md`, and `docs/cloudai-platform-solution-walkthrough.md` with the new roadmap sequence.

## Testing

- Validate each synthetic example against its corresponding schema.
- Add a TypeScript mock evaluation that verifies approved evidence requirements and preserves blocked and approval-required outcomes.
- Run the existing TypeScript API test suite and the Python RAG suite to confirm the completed RAG demo remains unaffected.
- Scan changed public files for private, credential, and production-sensitive wording before review.

## Success Criteria

- A reader can explain the difference between capability governance and runtime governance from the repository alone.
- The repository contains a small, provider-neutral, testable contract pack for capability admission.
- The three governance outcomes are demonstrated with synthetic examples and evaluation evidence.
- The implementation remains mock-first, public-safe, and independent of external services.
