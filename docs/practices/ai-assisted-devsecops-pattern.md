# AI-Assisted DevSecOps Pattern

This pattern describes how AI assistance can support software delivery without bypassing review, testing, or security controls.

The goal is not to let an AI agent own delivery. The goal is to make AI-assisted engineering behave like any other enterprise delivery capability: bounded inputs, reviewable output, required checks, human accountability, and reusable evidence.

## Principles

- AI suggestions are reviewed by humans.
- Security scans remain required.
- Generated code must pass the same CI checks as human-written code.
- Secrets and sensitive data must not be pasted into AI tools.
- Examples use synthetic repositories, issues, and findings.
- CI/CD remains the source of release evidence.
- Deployment and rollback decisions remain explicit human or platform-controlled actions.

## P5a Scope

P5a introduces a workflow boundary for AI-assisted delivery. It documents where AI assistance may contribute and where platform controls must remain authoritative.

Included:

- synthetic AI-assisted change workflow
- human review boundary
- CI and security gate expectations
- release evidence expectations
- prohibited-input rules for secrets, credentials, personal data, production data, and private implementation details

Not included:

- real AI agent execution
- real model calls
- automatic pull request approval
- automatic deployment
- runtime tool execution by an agent
- cloud account access
- sensitive data handling

## Delivery Flow

```text
Issue or change request
  -> AI-assisted drafting or review using safe context
  -> Human engineer edits and owns the change
  -> Pull request
  -> CI tests, contract checks, and security scan
  -> Human review and release gate decision
  -> Optional deployment through an approved release process
  -> Audit evidence and rollback notes
```

## AI Assistance Boundary

AI may help with:

- summarising a synthetic issue or design task
- drafting code or documentation that a human reviews
- suggesting tests, edge cases, or threat-model questions
- explaining CI failures
- preparing release notes from the committed diff
- identifying missing evidence before a release gate

AI must not:

- receive secrets, credentials, private keys, tokens, or live kubeconfig files
- receive customer data, personal data, production logs, or restricted internal documents
- approve its own pull request
- bypass branch protection, tests, security scans, or review gates
- execute deployments without an approved workflow and human-controlled release decision
- mutate cloud resources outside an explicitly approved sandbox process

## Control Mapping

| Control | Purpose | Portfolio Evidence |
|---|---|---|
| Safe context boundary | Keep AI inputs limited to synthetic or approved content | This document and workflow guard messages |
| Human accountability | Ensure AI output is reviewed and owned by an engineer | Pull request review expectation |
| CI gates | Prove the repository still builds and tests | Mock API test workflow |
| Security gates | Prevent obvious secret-file mistakes and unsafe delivery patterns | Security scan workflow |
| Release gates | Keep deployment, rollback, and promotion decisions controlled | P4d release gates and rollback pattern |
| Audit evidence | Leave a trace of checks, decisions, and assumptions | Workflow logs and documented checklist |

## Relationship To Other Tracks

P5 sits between release engineering and AgentOps:

- **P4 EKS Release Engineering** shows how a synthetic AI API can be packaged and promoted through Helm, Argo CD, gates, and rollback.
- **P5 AI-assisted DevSecOps** shows how AI-assisted changes should move through controlled delivery.
- **P5b AI-assisted review evidence** adds synthetic records for review summaries, threat-model checklists, CI failure summaries, release-note drafts, and human-owned sign-off. See `docs/evidence/ai-assisted-review-evidence.md`.
- **P6 AI Traffic Governance / AgentOps** will focus on runtime agent identity, tool permissions, approval gates, policy verdicts, budgets, and audit evidence.

The boundary is important: P5 controls the software-delivery workflow. P6 controls what agents and AI traffic can do at runtime.

## Example Release Evidence Checklist

- Change summary is human-authored or human-reviewed.
- AI-assisted context excludes secrets and restricted data.
- API contracts and schemas are updated when behavior changes.
- Unit tests pass.
- Security scan passes.
- Release gate decision is recorded.
- Rollback path is known before promotion.
