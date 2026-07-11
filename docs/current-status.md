# Current Status

This page summarizes the current public project state. Local planning notes and ignored working files stay outside the repository.

## Current Milestone

The local mock GenAI gateway and governed RAG evidence path are complete for the current demo scope.

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

The next public slice should be an AgentOps / AI Traffic Governance contract pack.

Keep it contract-first and mock-only:

- agent session metadata contract
- tool permission decision contract
- audit and trace metadata example
- human approval boundary example
- token, quota, and cost metadata example

Do not add a runtime agent, tool executor, provider call, cloud deployment, or traffic proxy in the first AgentOps increment.

## Portfolio Positioning

The current project demonstrates Cloud & AI Platform Engineering: secure, scalable, governed, observable, and cost-aware AI-ready platform foundations using synthetic examples and local mock controls.
