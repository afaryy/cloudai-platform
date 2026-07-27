# Agent Behavioural Reliability Gate

This mock-first reliability gate verifies that a metadata-only proposed agent action receives the expected governance decision consistently. It does not execute a tool, evaluate a model response, create a pull request, or prove real-world task completion.

## What It Evaluates

`POST /agent-actions/reliability-evaluate` evaluates the existing deterministic AgentOps policy three to five times for the same synthetic request. It records four checks:

- **Policy outcome:** verdict and reason code match the declared expectation.
- **Approval boundary:** high-impact actions remain approval-required when no approval is recorded.
- **Runtime state:** active or paused state matches the declared expectation.
- **Repeatability:** every evaluation returns the same decision summary.

The included automated tests demonstrate an allowed read action, a denied unapproved tool, a high-impact action awaiting human approval, and a budget-paused action.

## Controlled Change Boundary

The gate can show that a high-impact action is waiting for human approval. It does not grant an agent authority to execute a change. A production implementation would still require an accountable human, a controlled delivery path, and separate infrastructure authorisation.

## Evidence Boundary

This implementation is intentionally limited to deterministic policy correctness and repeatability. It does not claim:

- model quality, hallucination detection, or business-task completion;
- tool execution, MCP integration, cloud deployment, or autonomous agent runtime;
- persistent audit storage, customer data processing, prompts, tool payloads, credentials, or raw tool results.

The response contains decision metadata only, so it can be used as a safe reference pattern for an Enterprise AI control plane.
