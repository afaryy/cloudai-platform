# Governed Workflow Evidence Pack Design

## Purpose

This design adds a mock-first, end-to-end governance pattern that combines existing CloudAI controls into one workflow-level decision and compact evidence bundle. It turns the repository's individual AgentOps, capability, RAG lifecycle, guardrail, and FinOps concepts into a runnable local demonstration without introducing an autonomous agent runtime, cloud integration, or sensitive-payload handling.

## Goals

- Accept one metadata-only workflow task contract.
- Evaluate the contract through existing deterministic governance concepts.
- Return an evidence-first verdict: `approved`, `approval-required`, or `blocked`.
- Explain which control contributed each decision without returning prompts, tool input, source content, credentials, or execution output.
- Provide synthetic fixtures, schemas, endpoint tests, and a short walkthrough.
- Preserve the project's default local mock boundary.

## Non-goals

- Execute agent actions, skills, MCP tools, retrieval, model calls, or deployment actions.
- Perform concurrent execution, create an ephemeral environment, persist audit records, or contact GitHub, AWS, Bedrock, EKS, Azure, or GCP.
- Replace the existing endpoint contracts for AgentOps, Guardrails as a Service, or governed RAG.
- Infer policy from opaque free text or accept raw prompt and tool payload data.

## Architecture

The proposed `POST /workflow-runs/evaluate` route is a workflow-level policy composer. Its request is a declared task contract, not an instruction to execute work. The route normalizes the input, evaluates deterministic control lanes, then asks a separate verifier to derive the final workflow verdict from the lane evidence and acceptance checks.

```text
Metadata-only workflow task contract
  -> AgentOps authorisation decision
  -> capability admission state
  -> RAG source lifecycle state
  -> Guardrail verdict
  -> budget and acceptance checks
  -> independent workflow verifier
  -> compact workflow evidence bundle
```

The verifier is kept separate from the individual lane evaluators. Each lane reports its own status and reason. The verifier applies a transparent precedence order:

1. Any blocked lane or failed acceptance check produces `blocked`.
2. If nothing is blocked and a lane requires a human decision, the result is `approval-required`.
3. Otherwise, the result is `approved`.

This preserves the training principle of independent verification while keeping every decision deterministic and explainable.

## Workflow Task Contract

The request will contain only declared metadata:

- `workflowId`, `objective`, `owner`, and `riskTier` for traceability and scope.
- requested capability and agent-action metadata, including tool ID, action class, least-privilege scope, approval reference, and budget state.
- optional RAG source identifier and allowed knowledge-base boundary.
- synthetic guardrail signals, not source content or prompts.
- named acceptance checks such as `capability-admitted`, `source-active`, `guardrails-allow`, and `within-budget`.

The API rejects undeclared fields, including `prompt`, `content`, `toolInput`, `toolOutput`, `credentials`, `sourceDocument`, and `executionResult`.

## Evidence Bundle

The response will include:

- workflow ID, mode (`mock`), and final verdict.
- a short final-reason list.
- lane summaries for AgentOps, capability admission, RAG lifecycle, guardrails, and budget/acceptance checks.
- correlation metadata: synthetic trace ID, audit/evidence IDs, evaluation timestamp, and policy identifiers.
- a no-execution boundary declaration confirming that no model, tool, retrieval, cloud, or deployment action occurred.

Evidence is intentionally distilled. The response returns control outcomes and identifiers, never worker transcripts or sensitive payloads.

## Scenarios

Three fixtures demonstrate the decision model:

1. **Allowed read workflow**: an active capability, allowed read action, active synthetic source, no risk signal, and remaining budget returns `approved`.
2. **Approval-required workflow**: an otherwise eligible write or high-impact action without an approval reference returns `approval-required`.
3. **Blocked workflow**: a retired source, inactive/non-admitted capability, denied guardrail, exhausted budget, or failed acceptance check returns `blocked`.

The initial implementation will use a retired-source scenario as the fixture's primary block path because it visibly links P6c provenance and lifecycle control to a workflow decision.

## Documentation Integration

The architecture document will introduce an evidence-first workflow decision pattern inside the AI Traffic Governance layer. The solution walkthrough will show how existing controls feed the workflow verifier. The API README and demo script will provide runnable local requests and expected verdicts. Current status will name this as a completed mock control-plane demonstration once the feature and tests are in place.

## Error Handling

Malformed requests, missing required metadata, unsupported enumerated values, and forbidden payload fields return the existing structured mock API validation errors. Valid workflow requests always return a decision bundle; policy and evidence failures are represented as a `blocked` or `approval-required` result rather than a server error.

## Verification

Tests will cover request normalization, forbidden field rejection, each lane's evidence mapping, verifier precedence, all three scenario fixtures, schema conformance, endpoint routing, and evidence redaction. Existing API and schema test suites must continue to pass.

## Boundaries

This is a local, deterministic reference implementation. The word “workflow” describes governance evaluation only; it does not claim orchestration, parallel agent execution, persistent evidence storage, or production enforcement. A future live integration would need separate approval, security design, budget controls, and teardown planning.
