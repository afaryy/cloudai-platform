# Featured Solutions

These four cases provide a short, public-safe route through the repository. They show bounded engineering evidence rather than production claims. All examples use synthetic data, generic identifiers, and documented control boundaries.

## Governed AI Gateway

- **Status:** Implemented — mock-first
- **Engineering focus:** Controlled model access and request-policy enforcement
- **Primary technologies:** TypeScript, Node.js, JSON Schema, GitHub Actions, AWS Bedrock adapter boundary

### Problem

Teams need a repeatable way to expose AI capabilities without treating every application request as an unrestricted direct provider call.

### Scope

The local gateway provides mock-default chat, governed RAG metadata, Guardrails-as-a-Service verdicts, request-policy checks, and metadata-only AgentOps decisions. A separately confirmed Bedrock adapter demonstrates the provider-client boundary while leaving mock mode as the default.

### Architecture summary

The [GenAI / LLM gateway](genai-llm-gateway.md) sits between a client-facing contract and provider-specific clients. The implementation under [providers/aws/app/api](../providers/aws/app/api) keeps validation, token boundaries, structured metadata, and provider selection explicit.

### Technical evidence

- TypeScript routes, provider-client interfaces, JSON schemas, fixtures, and contract tests.
- Mock mode is the ordinary runtime path; provider mode is an explicit, bounded operator action.
- [Gateway README](../providers/aws/app/api/README.md) records the API boundary and safe provider-adapter behavior.

### Test or validation evidence

Run `corepack pnpm@11.7.0 --dir providers/aws/app/api test` to compile the API and run the local contract, route, evaluation, and adapter-boundary tests.

### Key trade-offs

- A deterministic mock default favours repeatability and public safety over a permanently connected model service.
- The provider adapter demonstrates integration shape, not broad runtime feature coverage.

### What this demonstrates

How a platform engineer can put contracts, policy checks, usage metadata, and a provider boundary around AI access.

### What it does not claim

It is not a production gateway, persistent audit service, enterprise model catalogue, or unrestricted agent runtime.

## AI Workload Operating Contract

- **Status:** Design / future reference
- **Engineering focus:** AI Factory and AI data-centre workload readiness

### Scope

The [AI Workload Operating Contract](ai-workload-operating-contract.md) defines a shared operating model for service inference, batch processing, fine-tuning, and future distributed training. It makes ownership, identity, access, capacity, cost, approval, evidence, and shutdown expectations explicit.

### What this demonstrates

How the existing CloudAI control-plane patterns can extend into a vendor-neutral AI Factory practice track without changing the portfolio's mock-first operating boundary.

### What it does not claim

It does not implement a GPU cluster, Slurm deployment, distributed training job, Prometheus/Grafana stack, or production AI data centre.

## AI Release Engineering on EKS

- **Status:** Implemented — sandbox-validated
- **Engineering focus:** Controlled Kubernetes delivery and GitOps operations
- **Primary technologies:** Terraform, Amazon EKS, Helm, Argo CD, GitHub Actions, OIDC

### Problem

AI-facing services need the same disciplined release path as other platform workloads: packaging, policy gates, rollout checks, rollback, access control, and teardown.

### Scope

This implementation packages the mock API with Helm, defines a GitOps application, and documents manually approved validation, release, rollback, cleanup, and destroy paths for a personal sandbox using a synthetic workload.

### Architecture summary

Terraform provides the sandbox foundation; GitHub Actions uses short-lived OIDC access; Helm packages the service; and Argo CD reconciles a pinned revision. The [EKS release engineering guide](ai-release-engineering-on-eks.md) explains the delivery and cleanup boundaries.

### Technical evidence

- [Helm chart](../helm/ai-api-service), [Argo CD application](../argocd/applications/cloudai-api-sandbox.yaml), Terraform, and manual GitHub Actions workflows.
- Explicit release gates, rollback guidance, synthetic-only configuration, and post-exercise teardown.

### Test or validation evidence

The P4e, P4f, and P4g workflow paths are recorded as sandbox-validated in [Current status](current-status.md), with scoped validation, release, GitOps, health, cleanup, and destroy evidence described in the EKS guide.

### Key trade-offs

- A short-lived personal sandbox demonstrates delivery discipline without presenting a persistent platform service.
- The workload remains mock and synthetic, so Kubernetes operations are evidenced without claiming AI inference on EKS.

### What this demonstrates

How infrastructure, CI/CD, GitOps, rollout verification, rollback, and cost-bounded teardown fit together for an AI-ready delivery platform.

### What it does not claim

It is not a production EKS platform, a live AI inference service, or a reusable enterprise cluster baseline.

## Governed RAG Lifecycle

- **Status:** Implemented — local synthetic workflow
- **Engineering focus:** Knowledge provenance, lifecycle controls, and deterministic quality checks
- **Primary technologies:** Python, JSON artifacts, unit tests, synthetic Markdown sources

### Problem

Retrieval-based AI needs controls around which sources are approved, active, retired, attributable, and suitable for evaluation—not only a retrieval API.

### Scope

The local workflow ingests synthetic Markdown, creates chunk metadata and evaluation artifacts, and scores synthetic mock responses deterministically. The companion gateway contracts model approved-source and metadata boundaries without performing live retrieval.

### Architecture summary

The [RAG knowledge lifecycle](rag-knowledge-lifecycle.md) links provenance, owner, classification, retention, review, and active/retired state. The implementation in [examples/rag-pattern/python](../examples/rag-pattern/python) provides the local artifact and quality path.

### Technical evidence

- Python ingestion, chunking, export, evaluation-dataset, and quality-scoring modules.
- Synthetic source documents, sample artifacts, and governed RAG API contracts.

### Test or validation evidence

Run `PYTHONPATH=examples/rag-pattern/python python3 -m unittest discover -s examples/rag-pattern/python/tests` to verify the local ingestion, artifact, evaluation, and scoring workflow.

### Key trade-offs

- Deterministic local scoring makes the portfolio reproducible, but does not represent semantic evaluation by a live model.
- Synthetic Markdown proves lifecycle mechanics without introducing data residency or content-risk concerns.

### What this demonstrates

How platform engineering can treat RAG sources as governed assets with lifecycle and evaluation evidence.

### What it does not claim

It does not provide a vector database, embeddings, provider-backed retrieval, or live RAG answer generation.

## Bounded Bedrock Sandbox

- **Status:** Implemented — bounded synthetic sandbox validation
- **Engineering focus:** Least-privilege model access and narrow Guardrail validation
- **Primary technologies:** Terraform, AWS IAM, GitHub Actions OIDC, Amazon Bedrock, Guardrails

### Problem

Real provider access needs stronger boundaries than a local mock: short-lived identity, explicit approval, narrowly scoped permissions, limited use, and sanitized evidence.

### Scope

The sandbox uses a Terraform-managed access boundary and manually confirmed, synthetic-only validation paths. The scope includes one constrained model-access smoke path, an opt-in gateway adapter boundary, one guarded `Converse` attachment path, and three direct metadata-only Guardrail evaluations.

### Architecture summary

GitHub Actions assumes dedicated short-lived roles through OIDC. Terraform controls the narrowly scoped IAM and Guardrail configuration; workflows require explicit confirmation and emit only sanitized result categories. [The Bedrock sandbox design](p8-real-bedrock-sandbox-design.md) records the control model and limits.

### Technical evidence

- [Bedrock Terraform environment](../providers/aws/infra/terraform/envs/bedrock-sandbox), separate IAM boundaries, and protected manual workflow modes.
- [Current status](current-status.md) records bounded synthetic smoke, guarded attachment, and direct-evaluation validation.

### Test or validation evidence

The manually approved P8c, P8f, and P8g workflow paths provide narrow synthetic validation evidence. The environment README documents the confirmation gates, constrained actions, and sanitized-output rules.

### Key trade-offs

- The boundary deliberately uses tiny, synthetic checks rather than a persistent Bedrock application.
- Guardrail results are narrow configuration evidence, not a claim of real-world safety quality or sensitive-data detection effectiveness.

### What this demonstrates

How to extend cloud-platform controls into a real provider boundary while retaining least privilege, manual approval, cost discipline, and public-safe evidence handling.

### What it does not claim

It is not a production Bedrock service, chatbot, knowledge base, agent runtime, or broad Guardrail effectiveness assessment.
