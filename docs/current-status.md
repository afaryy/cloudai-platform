# Current Status

This page summarizes the current public project state. Local planning notes and ignored working files stay outside the repository.

## Current Milestone

The local mock GenAI gateway, governed RAG evidence path, mock AgentOps decision path, capability-governance contracts, RAG knowledge lifecycle, Guardrails as a Service path, P4 release engineering patterns, and P5 AI-assisted DevSecOps evidence path are complete for the current demo scope.

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
- P4a Helm chart for synthetic Kubernetes packaging of the mock AI API service
- P4c Argo CD Application pattern for manual GitOps promotion
- P4d release gates and rollback pattern for synthetic EKS release engineering
- P5a AI-assisted DevSecOps boundary for advisory AI use, human review, CI/security checks, and release evidence
- P5b AI-assisted review evidence records for review summaries, threat-model checklists, CI failure summaries, and release-note drafts

The next main portfolio focus is **P6 AI Traffic Governance / AgentOps**. P6 currently has three mock-first lanes:

- **P6a Runtime AgentOps:** agent identity, tool permission, policy verdict, human approval, budget state, traceability, and pause/terminate decisions.
- **P6b Capability Governance:** registry metadata, skill cards, scan/evaluation evidence, admission decision, lifecycle state, and approved/blocked/approval-required capability outcomes.
- **P6c RAG Knowledge Lifecycle:** source provenance, owner, classification, authorised knowledge-base boundary, retention, review, and active/paused/retired state.

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
| P4a Helm packaging | Complete | `helm/ai-api-service/` |
| P4c Argo CD pattern | Complete | `argocd/applications/cloudai-api-sandbox.yaml` |
| P4d release gates and rollback | Complete | `docs/eks-release-gates-and-rollback.md` |
| P5a AI-assisted DevSecOps boundary | Complete | `docs/ai-assisted-devsecops-pattern.md` and `.github/workflows/ai-assisted-devsecops.yml` |
| P5b AI-assisted review evidence | Complete | `docs/ai-assisted-review-evidence.md`, `shared/schemas/ai-assisted-devsecops/`, and `shared/examples/ai-assisted-devsecops/` |

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
- autonomous AI-assisted delivery

These should remain opt-in future work with explicit cost, cleanup, and governance guidance.

## Recommended Next Slice

The current slice has completed the core synthetic **P4 EKS Release Engineering readiness** documentation and the **P5 AI-assisted DevSecOps** boundary/evidence path.

Completed P4 split:

- **P4a portfolio-ready release engineering:** Helm/Kubernetes chart for the mock AI API service, probes, rollback notes, resource requests, policy gates, and synthetic deployment metadata.
- **P4c GitOps / Argo CD pattern:** application manifest pattern, promotion notes, and audit metadata for release decisions.
- **P4d release gates and rollback:** pre-deploy gates, rollout observation, rollback choices, failure modes, and synthetic evidence expectations.

Recommended next choices:

- **P6 AI Traffic Governance status/evidence expansion:** improve the portfolio story around runtime AgentOps, capability governance, RAG knowledge lifecycle, Guardrails as a Service, and AI-assisted delivery evidence as connected control-plane patterns.
- **P4b optional personal AWS EKS sandbox POC:** Terraform-managed sandbox using a personal AWS account, S3 and DynamoDB backend, GitHub Actions OIDC, explicit budget, manual approval, synthetic workload only, and teardown guidance.

The repository should not perform a real cloud deployment by default. Any personal sandbox work must keep account identifiers, state, kubeconfig, plan files, tfvars, credentials, and live endpoint details out of git.

Use the package-pinned API test command when validating locally:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

## Portfolio Positioning

The current project demonstrates Cloud & AI Platform Engineering: secure, scalable, governed, observable, and cost-aware AI-ready platform foundations using synthetic examples and local mock controls.
