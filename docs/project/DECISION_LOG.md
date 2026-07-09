# Decision Log

<!-- TODO: Future automation can generate decision indexes from docs/project/status.json plus structured ADR files if added later. -->

## D-0001: AWS First, Multi-Cloud Ready

- Date: 2026-07-09
- Status: Accepted
- Decision: Build AWS provider structure first while keeping control-plane concepts provider-neutral.
- Rationale: AWS gives a concrete implementation path without closing the door on Azure and GCP adapters.

## D-0002: Mock Mode by Default

- Date: 2026-07-09
- Status: Accepted
- Decision: Keep foundation work non-deploying and mock-first.
- Rationale: Public portfolio safety and small reviewable increments are more important than early runtime breadth.

## D-0003: status.json Is the Project-Control Source of Truth

- Date: 2026-07-10
- Status: Accepted
- Decision: Track phase status, track status, readiness, and gaps in `docs/project/status.json`.
- Rationale: Structured status can later generate dashboards and reduce drift across Markdown summaries.

## D-0004: Raw Prompt Logs Stay Private

- Date: 2026-07-10
- Status: Accepted
- Decision: Store raw prompt logs under ignored `_private/prompt-logs/`; keep only sanitized summaries in public docs.
- Rationale: Raw prompts may contain private context, paths, or temporary reasoning.
