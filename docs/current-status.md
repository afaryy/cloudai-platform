# Current Status

This page summarizes the current public project state. Local planning notes and ignored working files stay outside the repository.

## Current Milestone

The local mock GenAI gateway, governed RAG evidence path, mock AgentOps decision path, capability-governance contracts, RAG knowledge lifecycle, and Guardrails as a Service path are complete for the current demo scope.

The repository can now demonstrate:

- mock GenAI / LLM Gateway API behavior
- request validation and default policy profile checks
- token budget guardrail and synthetic cost estimates
- structured request log examples
- JSON schemas and synthetic fixtures
- local eval harness for gateway behavior
- governed RAG request and response contracts
- Python local RAG ingest, chunking, eval dataset, and scoring workflow
- RAG metadata endpoints
- mock governed RAG query response with citation, egress decision, and audit evidence
- mock AgentOps authorisation decisions for allowed, denied, approval-required, and paused actions
- capability-governance contracts for approved, blocked, and approval-required reusable assets
- RAG knowledge lifecycle records for active and retired synthetic sources
- Guardrails as a Service contracts and `POST /guardrails/assess` for synthetic PII, jailbreak, prompt-injection, high-risk, and safe signals

## Completed For Mock Scope

| Area | Status | Evidence |
|---|---|---|
| Mock GenAI API | Complete | `providers/aws/app/api/` |
| API contracts and fixtures | Complete | `shared/schemas/` and `shared/examples/` |
| Request metadata and token guardrails | Complete | API tests and mock fixtures |
| RAG governance contracts | Complete | `shared/schemas/rag-governance/` |
| RAG governance examples | Complete | `shared/examples/rag-governance/` |
| Local RAG workflow | Complete | `examples/rag-pattern/python/` |
| RAG API metadata | Complete | `GET /rag/status` and `GET /rag/artifacts` |
| Mock governed RAG query | Complete | `POST /rag/query` |
| Mock AgentOps decision | Complete | `POST /agent-actions/authorize` |
| Capability governance contracts | Complete | `shared/schemas/agent-capability-governance/` and `shared/examples/agent-capability-governance/` |
| RAG knowledge lifecycle | Complete | `shared/schemas/rag-knowledge-lifecycle/`, synthetic lifecycle fixtures, and retired-source route test |
| Guardrails as a Service | Complete | `shared/schemas/guardrails-as-a-service/`, synthetic fixtures, `POST /guardrails/assess`, and mock eval evidence |

## Intentionally Deferred

The following are not part of the current mock scope:

- real provider calls
- real cloud deployment
- real retrieval runtime
- embeddings
- vector indexes
- provider-backed RAG answer generation
- persistent audit storage
- real PII detection, jailbreak detection, or safety classification
- runtime agent execution
- runtime traffic proxy
- EKS runtime delivery

These should remain opt-in future work with explicit cost, cleanup, and governance guidance.

## Recommended Next Slice

The next public slice is **P4 EKS Release Engineering readiness**.

Recommended split:

- **P4a portfolio-ready release engineering:** Helm/Kubernetes examples, probes, rollback notes, resource requests, policy gates, and synthetic deployment metadata.
- **P4b optional personal AWS EKS sandbox POC:** Terraform-managed sandbox using a personal AWS account, S3 and DynamoDB backend, GitHub Actions OIDC, explicit budget, manual approval, synthetic workload only, and teardown guidance.
- **P4c GitOps / Argo CD pattern:** application manifest pattern, promotion notes, and audit metadata for release decisions.
- **Later P4d/P5 extension:** optional Bedrock Guardrails or AgentCore-aligned patterns after EKS, Terraform, and budget controls are established.

The repository should not perform a real cloud deployment by default. Any personal sandbox work must keep account identifiers, state, kubeconfig, plan files, tfvars, credentials, and live endpoint details out of git.

## Portfolio Positioning

The current project demonstrates Cloud & AI Platform Engineering: secure, scalable, governed, observable, and cost-aware AI-ready platform foundations using synthetic examples and local mock controls.
