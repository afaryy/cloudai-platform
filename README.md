# cloudai-platform

Public-safe reference implementation for an AWS-first, multi-cloud-ready Cloud & AI platform.

This repository demonstrates a cloud-agnostic Enterprise AI Control Plane with AWS as the first implementation provider. The first iteration is documentation-heavy and implementation-light: it defines the operating model, architecture boundaries, provider abstraction, governance posture, and mock-mode scaffolding without deploying real cloud resources.

## Goals

- Secure AI enablement for enterprise-style workloads.
- Governed model access through a GenAI / LLM gateway sub-layer.
- Broader AI traffic governance for future agent, tool, and data flows.
- AWS Bedrock integration pattern using public AWS concepts.
- Terraform-based AWS platform foundations, initially as placeholders.
- GitHub Actions CI/CD skeletons.
- AI FinOps, observability, and responsible AI guidance.
- Future EKS release engineering and multi-cloud provider mapping.

## Public Safety Boundary

This repository uses synthetic examples only. It must not include employer-specific content, internal project names, screenshots, tickets, real metrics, private links, secrets, credentials, internal namespaces, or proprietary diagrams.

Mock mode is the default. Do not deploy real cloud resources from this repository unless a future release explicitly adds reviewed deployment instructions.

## Repository Map

- `docs/` - architecture, operations, governance, and platform patterns.
- `docs/project/` - charter, roadmap, backlog, status, and delivery logs.
- `providers/aws/` - first implementation provider placeholder.
- `providers/azure/` and `providers/gcp/` - future provider mapping notes.
- `shared/` - common schemas, policies, and examples.
- `examples/` - synthetic scenario folders.
- `helm/` and `argocd/` - future Kubernetes release engineering placeholders.
- `scripts/` - mock-only helper scripts.
- `.github/workflows/` - CI and validation skeletons.

## Current Status

Sprint 00 is focused on repository foundation, public-safety guardrails, documentation structure, and non-deploying placeholders.

See `docs/project/ROADMAP.md` and `docs/project/PROGRESS_DASHBOARD.md` for phase status.
