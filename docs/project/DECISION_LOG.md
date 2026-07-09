# Decision Log

## D-0001: AWS First, Multi-Cloud Ready

- Date: 2026-07-09
- Status: Accepted
- Decision: Build AWS provider structure first while keeping control-plane concepts provider-neutral.
- Rationale: AWS gives a concrete implementation path without closing the door on Azure and GCP adapters.

## D-0002: Mock Mode by Default

- Date: 2026-07-09
- Status: Accepted
- Decision: Keep first iteration non-deploying and mock-only.
- Rationale: Public portfolio safety and small reviewable increments are more important than early runtime breadth.
