# AgentCore Governed RAG POC — Read-Only Preflight Evidence

## Scope

- Date: 15 August 2026
- Region: `ap-southeast-2`
- Operation: local CLI setup, short-lived local login, and read-only preflight
- Resource changes: none

## Sanitized Results

| Category | Result | Evidence boundary |
| --- | --- | --- |
| Node runtime | Pass | Local runtime check only |
| AgentCore CLI | Pass | Installed CLI verified locally; version is within the required range |
| AWS identity | Pass | Read-only STS verification; identity details deliberately omitted |
| Knowledge-base access | Pass | Read-only list capability check; no resource identifiers retained |

## Controls Observed

- The initial preflight stopped safely before authentication and CLI setup were complete.
- AWS local login uses short-lived credentials; no credentials were committed or copied into documentation.
- The CLI global binary was resolved locally for this preflight only; no user-specific local path is part of the repository contract.
- No AgentCore, Gateway, Runtime, knowledge base, storage, IAM, or network resource was created, changed, or deleted.

## Remaining Gate

The next action would be a sandbox deployment preview/validation. It requires a
fresh, explicit deployment approval and must retain the synthetic-only, cost,
teardown, and sanitized-evidence boundaries in the runbook.
