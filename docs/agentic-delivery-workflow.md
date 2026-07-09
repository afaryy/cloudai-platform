# CloudAI Agentic Delivery Workflow

This document defines a lightweight delivery workflow for the CloudAI Platform reference implementation. It maps prompt-driven engineering practices to the way this repository moves from an idea to a pull request.

The workflow is intentionally small. It is not an agent runtime, orchestration framework, or automation engine. It is a practical operating model for planning, reviewing, implementing, validating, documenting, committing, and preparing pull requests.

External agentic tooling can support the workflow through activities such as brainstorming, planning, worker execution, review, validation, and branch finishing. The repository keeps the workflow tool-neutral so the same pattern can be followed with different assistants, scripts, or manual review habits.

## Workflow Summary

```text
Prompt
  -> Design
  -> Plan
  -> Implementation
  -> Tests / Validation
  -> Documentation
  -> Progress / Gap Notes
  -> Pre-Commit Review
  -> Commit
  -> Push / PR
```

## End-to-End Steps

| Step | Purpose | Primary worker perspective | Expected output |
| --- | --- | --- | --- |
| 1. Prompt Intake | Understand the request, constraints, phase, and intended outcome. | Documentation & Portfolio Worker | Clear task framing and public-facing scope. |
| 2. Architect Review | Check whether the request fits the CloudAI control-plane model, AWS-first direction, and provider abstraction boundaries. | Principal Architect Worker | Architecture notes or confirmation that the request fits. |
| 3. Scope Review | Keep the change small, mock-first, and aligned to the current phase. | Product / CTO Reviewer | Decision to proceed, narrow scope, split, or defer. |
| 4. Implementation Plan | Translate the request into files, steps, validation, and commit intent. | Principal Architect Worker, Documentation & Portfolio Worker | Short plan with file impact and verification path. |
| 5. Worker Execution | Make the scoped change using the worker perspective that owns the affected area. | AWS Platform Worker, Terraform / IaC Worker, Application API Worker, Security & Governance Worker, FinOps & Observability Worker, AI DevOps / EKS Release Worker, Documentation & Portfolio Worker | Focused repository change. |
| 6. Tests / Validation | Run the relevant checks for the type of change. | Responsible worker plus Branch Finish Reviewer | Evidence from tests, scans, status checks, or document review. |
| 7. Documentation Update | Keep public docs aligned with the changed behavior, architecture, or scope. | Documentation & Portfolio Worker | Updated README, architecture docs, examples, or runbook notes as needed. |
| 8. Progress / Gap Notes | Record follow-up gaps in local planning notes when useful. | Product / CTO Reviewer, Documentation & Portfolio Worker | Local tracking update or clear note that no update is needed. |
| 9. Pre-Commit Review | Review the diff before staging and committing. | Branch Finish Reviewer | Confirmation that the change is scoped, public-facing, and ready to commit. |
| 10. Commit Plan | Choose a Conventional Commit message with phase scope. | Branch Finish Reviewer | Commit message such as `docs(p0-workflow): add agentic delivery workflow`. |
| 11. Push / PR | Push the branch and prepare a concise pull request summary. | Branch Finish Reviewer, Documentation & Portfolio Worker | Updated branch and PR-ready description. |

## Worker Perspectives

The workflow uses worker perspectives to keep changes focused:

- Principal Architect Worker: control-plane architecture, provider abstraction, roadmap alignment, and architecture consistency.
- Product / CTO Reviewer: scope, phase fit, project value, and prioritization.
- AWS Platform Worker: AWS service direction, Bedrock patterns, and provider-specific AWS notes.
- Terraform / IaC Worker: Terraform structure, validation, module boundaries, and future identity patterns.
- Application API Worker: mock gateway behavior, request metadata, token estimation, schemas, and tests.
- Security & Governance Worker: policy intent, least privilege, responsible AI, and repository scope.
- FinOps & Observability Worker: token estimates, request IDs, metrics, logs, runbooks, and cost signals.
- AI DevOps / EKS Release Worker: CI, Helm, rollout notes, rollback notes, and EKS release patterns.
- Documentation & Portfolio Worker: README, demo narrative, architecture wording, and public-facing clarity.
- Branch Finish Reviewer: final diff review, validation evidence, commit readiness, and PR preparation.

These are responsibility lenses, not a runtime staffing model. A single contributor can move through multiple worker perspectives during one small change.

## Pre-Commit Review Checklist

Before every commit:

- Review `git status` and the intended diff.
- Confirm the change is small and phase-aligned.
- Confirm local-only folders remain ignored and unstaged.
- Confirm generated state, document exports, media files, and environment files are not staged.
- Scan public files for sensitive or overly defensive wording.
- Check that CI references point to tracked public files.
- Run relevant validation for the affected area.
- Stage only the intended files.

Commit only after this review passes. This keeps history clean and avoids follow-up commits for issues that can be caught before the commit.

## PR Preparation Checklist

Before opening or updating a pull request:

- Summarize what changed and why.
- Name the phase and track.
- List validation performed.
- Note any intentional gaps or deferred work.
- Keep the PR description concise and learning-oriented.
- Avoid overstating readiness; describe the current implementation level clearly.

## Current P0 Use

For the P0 foundation phase, this workflow is primarily documentation-heavy:

- architecture and scope updates are reviewed before commit;
- mock-first assumptions stay visible;
- local project notes stay outside the public repository;
- public docs describe the reference implementation without adding unnecessary process detail.

Future phases can reuse the same workflow for mock APIs, Terraform validation, FinOps examples, observability notes, and EKS release engineering examples.
