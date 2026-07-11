# Current Status

This page summarizes the current public project state. Local planning notes and ignored working files stay outside the repository.

## Current Milestone

The local mock GenAI gateway, governed RAG evidence path, and P6a mock AgentOps decision path are complete for the current demo scope.

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

## Intentionally Deferred

The following are not part of the current mock scope:

- real provider calls
- real cloud deployment
- real retrieval runtime
- embeddings
- vector indexes
- provider-backed RAG answer generation
- persistent audit storage
- runtime agent execution
- runtime traffic proxy
- EKS runtime delivery

These should remain opt-in future work with explicit cost, cleanup, and governance guidance.

## Recommended Next Slice

The next public slice after capability admission is **P6c RAG Knowledge Lifecycle**: source provenance, owner, classification, authorised knowledge boundaries, retention, review, and `active | paused | retired` state.

Keep it contract-first and mock-only. The key invariant is that a retired source cannot appear in a new governed RAG response. Do not add a real retrieval runtime, provider call, cloud deployment, or sensitive-data workflow.

## Portfolio Positioning

The current project demonstrates Cloud & AI Platform Engineering: secure, scalable, governed, observable, and cost-aware AI-ready platform foundations using synthetic examples and local mock controls.
