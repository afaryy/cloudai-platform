# Current Status

This page summarizes the current public project state. Local planning notes and ignored working files stay outside the repository.

## Current Milestone

The local mock GenAI gateway, governed RAG evidence path, mock AgentOps decision path, capability-governance contracts, RAG knowledge lifecycle, Guardrails as a Service path, P4 release engineering patterns, P5 AI-assisted DevSecOps evidence path, and P6 security/operations control matrix are complete for the current demo scope.

The repository can now demonstrate:

- **P1 Mock GenAI Gateway:** local GenAI / LLM Gateway API behavior
- **P1 API Contracts and Fixtures:** JSON schemas, synthetic fixtures, and local gateway eval harness
- **P1 Request Evidence:** structured request log examples
- **P1/P2 Token and Cost Controls:** token budget guardrail and synthetic cost estimates
- **P2 Platform Controls:** request validation and default policy profile checks
- **P2 Guardrails as a Service:** contracts and `POST /guardrails/assess` for synthetic PII, jailbreak, prompt-injection, high-risk, and safe signals
- **P3 RAG Governance Contracts:** governed RAG request and response contracts
- **P3 Local RAG Workflow:** Python local RAG ingest, chunking, eval dataset, and scoring workflow
- **P3 RAG Metadata:** RAG metadata endpoints
- **P3 Governed RAG Query:** mock response with citation, egress decision, and audit evidence
- **P6a Runtime AgentOps:** mock authorisation decisions for allowed, denied, approval-required, and paused actions
- **P6b Capability Governance:** contracts for approved, blocked, and approval-required reusable assets
- **P6c RAG Knowledge Lifecycle:** records for active and retired synthetic sources
- **P4a Helm Packaging:** synthetic Kubernetes packaging of the mock AI API service
- **P4b Personal EKS Sandbox Readiness:** hardened Terraform backend path, GitHub OIDC, budget, manual approval, small no-NAT network defaults, restricted EKS API endpoint CIDRs, synthetic workload, apply/destroy workflow evidence, and teardown guidance
- **P4b Terraform Static Tests:** native Terraform tests for the network module, EKS module, and EKS sandbox environment
- **P4c Argo CD Pattern:** manual GitOps promotion
- **P4d Release Gates and Rollback:** synthetic EKS release engineering
- **P5a AI-Assisted DevSecOps Boundary:** advisory AI use, human review, CI/security checks, and release evidence
- **P5b AI-Assisted Review Evidence:** review summaries, threat-model checklists, CI failure summaries, and release-note drafts
- **P6f AI Platform Security and Operations Controls:** identity, data protection, AI AppSec, delivery, operations, and FinOps

The next main portfolio focus is **P6 AI Traffic Governance / AgentOps**. P6 currently has six mock-first lanes:

- **P6a Runtime AgentOps:** agent identity, tool permission, policy verdict, human approval, budget state, traceability, and pause/terminate decisions.
- **P6b Capability Governance:** registry metadata, skill cards, scan/evaluation evidence, admission decision, lifecycle state, and approved/blocked/approval-required capability outcomes.
- **P6c RAG Knowledge Lifecycle:** source provenance, owner, classification, authorised knowledge-base boundary, retention, review, and active/paused/retired state.
- **P6d Control-Plane Evidence Map:** a synthetic map connecting runtime decisions, capability admission, RAG lifecycle state, guardrail verdicts, and human-owned AI-assisted review evidence.
- **P6e Control-Plane Evidence Scenarios:** a synthetic scenario pack for allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked governance outcomes.
- **P6f AI Platform Security and Operations Controls:** a control matrix connecting identity, data protection, AI AppSec, delivery controls, operations, and FinOps to existing portfolio evidence.

## Completed For Mock Scope

| Area | Status | Evidence |
|---|---|---|
| P1 Mock GenAI API | Complete | `providers/aws/app/api/` |
| P1 API contracts and fixtures | Complete | `shared/schemas/` and `shared/examples/` |
| P1/P2 request metadata and token guardrails | Complete | API tests and mock fixtures |
| P3 RAG governance contracts | Complete | `shared/schemas/rag-governance/` |
| P3 RAG governance examples | Complete | `shared/examples/rag-governance/` |
| P3 local RAG workflow | Complete | `examples/rag-pattern/python/` |
| P3 RAG API metadata | Complete | `GET /rag/status` and `GET /rag/artifacts` |
| P3 mock governed RAG query | Complete | `POST /rag/query` |
| P6a mock AgentOps decision | Complete | `POST /agent-actions/authorize` |
| P6b capability governance contracts | Complete | `shared/schemas/agent-capability-governance/` and `shared/examples/agent-capability-governance/` |
| P6c RAG knowledge lifecycle | Complete | `shared/schemas/rag-knowledge-lifecycle/`, synthetic lifecycle fixtures, and retired-source route test |
| P2 Guardrails as a Service | Complete | `shared/schemas/guardrails-as-a-service/`, synthetic fixtures, `POST /guardrails/assess`, and mock eval evidence |
| P4a Helm packaging | Complete | `helm/ai-api-service/` |
| P4b personal EKS sandbox runbook, Terraform skeleton, backend-backed validate/plan/apply/destroy path, and static tests | Complete | `docs/p4b-eks-sandbox-operator-runbook.md`, `docs/p4b-real-eks-sandbox-design.md`, `providers/aws/infra/bootstrap/`, `providers/aws/infra/terraform/envs/eks-sandbox/`, `providers/aws/infra/terraform/modules/network/`, `providers/aws/infra/terraform/modules/eks/`, `.github/workflows/terraform-eks-sandbox.yml`, and `.github/workflows/terraform-tests.yaml` |
| P4c Argo CD pattern | Complete | `argocd/applications/cloudai-api-sandbox.yaml` |
| P4d release gates and rollback | Complete | `docs/eks-release-gates-and-rollback.md` |
| P5a AI-assisted DevSecOps boundary | Complete | `docs/ai-assisted-devsecops-pattern.md` and `.github/workflows/ai-assisted-devsecops.yml` |
| P5b AI-assisted review evidence | Complete | `docs/ai-assisted-review-evidence.md`, `shared/schemas/ai-assisted-devsecops/`, and `shared/examples/ai-assisted-devsecops/` |
| P6d control-plane evidence map | Complete | `docs/control-plane-evidence-map.md`, `shared/schemas/control-plane-evidence/`, and `shared/examples/control-plane-evidence/` |
| P6e control-plane evidence scenarios | Complete | `docs/control-plane-evidence-scenarios.md`, `shared/schemas/control-plane-evidence/evidence-scenarios.schema.json`, and `shared/examples/control-plane-evidence/evidence-scenarios.mock.json` |
| P6f security and operations controls | Complete | `docs/ai-platform-security-operations-controls.md` |

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

The current slice has completed the core synthetic **P4 EKS Release Engineering readiness** documentation, the hardened **P4b optional personal EKS sandbox readiness** boundary, and the **P5 AI-assisted DevSecOps** boundary/evidence path.

The optional P4b personal EKS sandbox path has also been exercised through the manual GitHub Actions validate, plan, apply, and destroy sequence with synthetic workload boundaries and public-safe evidence handling.

Completed P4 split:

- **P4a portfolio-ready release engineering:** Helm/Kubernetes chart for the mock AI API service, probes, rollback notes, resource requests, policy gates, and synthetic deployment metadata.
- **P4b optional personal EKS sandbox readiness:** Terraform backend bootstrap, GitHub OIDC delivery plane, small no-NAT network defaults, restricted EKS API endpoint CIDRs, budget and teardown gates, synthetic workload boundary, manual apply/destroy path, and no-account-specific-value rules.
- **P4c GitOps / Argo CD pattern:** application manifest pattern, promotion notes, and audit metadata for release decisions.
- **P4d release gates and rollback:** pre-deploy gates, rollout observation, rollback choices, failure modes, and synthetic evidence expectations.

Recommended next choices:

- **P4b real EKS sandbox design:** keep `docs/p4b-real-eks-sandbox-design.md` as the design bridge for the optional personal AWS EKS apply/destroy path.
- **P4b budget, endpoint, and teardown setup:** keep AWS Budget, operator `/32` endpoint CIDR, teardown owner, and environment protection as required gates before any repeat apply. The workflow can run backend-backed validate, plan, apply, and destroy through the `aws-sandbox` environment.
- **P6 AI Traffic Governance evidence expansion:** add more synthetic scenario variants only if they explain a new governance outcome that is not already covered by P6e/P6f.
- **P4b future evidence refresh:** capture only sanitized apply/destroy observations when needed; do not commit account identifiers, live endpoints, kubeconfig, raw plans, state, tfvars, backend names, or screenshots with private details.
- **P4b pre-apply readiness check:** use `docs/p4b-eks-sandbox-operator-runbook.md` as the single go/no-go runbook before any real personal EKS sandbox apply.
- **P7 AI Factory learning note:** use `docs/ai-factory-learning-note.md` to explain why cloud architecture is evolving into AI-ready platform architecture rather than disappearing.

The repository should not perform a real cloud deployment by default. Any personal sandbox work must keep account identifiers, state, kubeconfig, plan files, tfvars, credentials, and live endpoint details out of git.

Use the package-pinned API test command when validating locally:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

## Portfolio Positioning

The current project demonstrates Cloud & AI Platform Engineering: secure, scalable, governed, observable, and cost-aware AI-ready platform foundations using synthetic examples and local mock controls.
