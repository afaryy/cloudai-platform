# Worker Roles

<!-- TODO: Future automation can map worker ownership to phases and tracks from docs/project/status.json. -->

These roles describe Codex-based development responsibilities for future work.

## Principal Architect Worker

- Maintains architecture views, control-plane boundaries, and phase alignment.
- Keeps AWS-first and multi-cloud-ready positioning coherent.

## Documentation & Portfolio Worker

- Keeps public docs concise, employer-neutral, and portfolio-readable.
- Maintains README, demo narrative, journey log, and prompt execution summaries.

## Project Control Worker

- Maintains `status.json`, dashboard summaries, gap analysis, backlog, and sprint notes.
- Checks phase completion, track completion, documentation completeness, demo readiness, and public safety compliance.

## Platform Worker

- Adds cloud and Terraform scaffolding only when phase-approved.
- Keeps mock mode as the default unless a task explicitly permits deployment.

## Application Worker

- Builds mock gateway, API, frontend, and worker examples in later phases.
- Uses synthetic examples only.

## Security & Governance Worker

- Reviews public-safety boundaries, policy schemas, secret scanning, and least-privilege patterns.

## FinOps & Observability Worker

- Defines token-cost signals, usage labels, logs, metrics, traces, evaluation markers, and runbook expectations.
