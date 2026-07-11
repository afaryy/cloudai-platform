# AI-Assisted Review Evidence

P5b adds a synthetic evidence pattern for AI-assisted DevSecOps. It shows what a human reviewer, platform team, or release owner might expect when AI helps with code review, threat modelling, CI failure analysis, or release-note drafting.

The evidence is deliberately metadata-only. It records the review outcome, scope boundary, checks, and human ownership without storing prompts, source content, secrets, customer data, production logs, or private implementation details.

## Why This Exists

AI-assisted delivery can be useful, but the enterprise control point is not the AI suggestion itself. The control point is the reviewable evidence around the suggestion:

- What was the AI asked to help with?
- Was the context safe to share?
- What did the human reviewer accept, reject, or change?
- Which tests or security checks support the decision?
- What release or rollback notes were produced?

This lets AI assistance fit into normal delivery governance instead of becoming an unreviewed side channel.

## Evidence Types

| Evidence type | Purpose | Human-owned decision |
|---|---|---|
| `ai-review-summary` | Summarise a proposed change, reviewed files, and follow-up questions. | Reviewer decides whether the summary is useful and whether findings are actioned. |
| `threat-model-checklist` | Capture synthetic risks and mitigations for a change. | Reviewer confirms which risks matter for this PR. |
| `ci-failure-summary` | Summarise failed checks and likely remediation paths. | Engineer validates the actual fix and reruns CI. |
| `release-note-draft` | Draft a release note from the committed diff and test evidence. | Release owner edits and approves final release language. |

## Safe Context Rules

AI-assisted review evidence may refer to:

- synthetic issue IDs
- pull request IDs
- public documentation
- file paths in this demo repository
- test names and check names
- high-level risk categories
- release gate decisions

It must not include:

- secrets, credentials, tokens, private keys, or kubeconfig files
- customer data, personal data, production logs, or restricted internal documents
- full prompt transcripts
- raw source pasted only for the AI tool
- AWS account IDs, ARNs, live endpoints, tfstate, tfvars, or plan files
- autonomous approval, merge, deploy, or rollback decisions

## Human Review Boundary

The AI can draft evidence, but it cannot own the outcome.

```text
AI-assisted draft
  -> human reviewer checks accuracy and safety
  -> CI/security evidence is attached
  -> release owner approves or rejects promotion
  -> audit metadata records the human-owned decision
```

## Relationship To P5a And P6

- **P5a** defines the delivery boundary: AI assistance is advisory, and CI/security/release controls remain authoritative.
- **P5b** adds the evidence records that make that boundary visible in a pull request.
- **P6** remains runtime AgentOps / AI Traffic Governance: agent identity, tool permissions, policy verdicts, approvals, audit, budgets, and pause/terminate state.

P5b does not execute an agent, call a model, approve a PR, or deploy anything.

## Portfolio Use

Use these examples to explain:

- how AI-assisted engineering can fit regulated delivery practices
- how human review and platform gates remain accountable
- how release evidence can be structured without exposing sensitive information
- how P5 delivery controls differ from P6 runtime controls
