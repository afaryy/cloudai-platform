# CloudAI Platform Solution Walkthrough

This document explains how the `cloudai-platform` repository fits together as a Cloud & AI platform engineering reference implementation.

The project is AWS-first and multi-cloud-ready. It uses synthetic examples, public cloud service patterns, and mock mode by default. It is a reference implementation and learning project, not an operated service.

## Solution Overview

`cloudai-platform` models a CloudAI control plane that coordinates governed model access, AI traffic governance, provider adapters, platform foundations, FinOps, observability, release engineering, AI-assisted delivery controls, and evidence mapping.

The implementation starts with a local mock GenAI / LLM Gateway API, then layers governed RAG, Guardrails as a Service, AgentOps decisions, capability governance, RAG knowledge lifecycle, EKS release engineering patterns, AI-assisted DevSecOps evidence, a control-plane evidence map, and control-plane evidence scenarios. This is intentional: the project proves the control model, API shape, metadata, guardrails, tests, and documentation before introducing real cloud resources.

## Architecture Layers

The solution is organized around these layers:

| Layer | Purpose | Current state |
|---|---|---|
| CloudAI Control Plane | Coordinates use case intake, policy, approval, audit, provider registry, and evaluation concepts. | Documented architecture. |
| GenAI / LLM Gateway | Provides the first model-access sub-layer for governed model calls. | Local mock API implemented. |
| AI Traffic Governance | Broader governance layer for model, agent, tool, API, retrieval, workflow, and data egress flows. | Mock AgentOps, capability governance, RAG lifecycle, and evidence map implemented. |
| Provider Adapters | Keep cloud-specific implementation behind provider boundaries. | AWS-first placeholders; Azure/GCP mappings documented. |
| Platform Foundations | Provide IAM, KMS, network, API, runtime, CI/CD, release, and observability foundations. | Documentation, workflow skeletons, Helm, and Argo CD patterns. |
| FinOps / Observability | Track token estimates, costs, logs, metrics, and operational signals. | Local metadata, token budget, and structured logs implemented. |
| Evidence Layer | Connect control outcomes across runtime, capability, RAG, guardrail, and delivery evidence. | P6d control-plane evidence map and P6e scenario pack implemented. |

## Language Boundary

The repository uses a deliberate language boundary rather than mixing implementation styles randomly.

| Area | Primary language | Reason |
|---|---|---|
| Platform control layer | TypeScript | Fits API, gateway, request/response contracts, policy checks, guardrails, CI tests, and service-oriented platform engineering. |
| AI workflow utilities | Python | Fits RAG ingestion, chunking, evaluation dataset preparation, benchmarking utilities, and orchestration experiments. |

The P1 implementation stays TypeScript-first because it is focused on the GenAI / LLM Gateway, contracts, metadata, guardrails, local evals, and CI-tested platform behavior.

Python is used where the project demonstrates AI workflow tooling, such as synthetic RAG ingestion, chunking, evaluation dataset preparation, and deterministic response-quality scoring. This keeps the portfolio story clear: TypeScript demonstrates the platform gateway and control layer, while Python demonstrates AI workflow and LLMOps capability.

The two layers are connected through documented contracts and artifact metadata. The TypeScript API can describe the local RAG workflow and its sample outputs without executing Python code or coupling the API runtime to workflow utilities.

## Current P1 Mock API

The P1 mock API lives under:

```text
providers/aws/app/api/
```

It currently supports:

- `GET /health`
- `GET /rag/status`
- `GET /rag/artifacts`
- `POST /rag/query`
- `POST /chat`
- `POST /guardrails/assess`
- `POST /agent-actions/authorize`
- mock Bedrock client interface
- synthetic model responses
- request metadata
- token and cost estimation
- structured request logs
- token budget guardrail
- API contract schemas
- demo request, response, error, and request log fixtures
- local mock eval harness
- RAG governance metadata endpoints
- mock governed RAG response endpoint
- Guardrails as a Service endpoint and synthetic verdict contracts
- AgentOps metadata-only authorisation endpoint
- capability governance contract pack
- RAG knowledge lifecycle contract pack and retired-source invariant
- AI-assisted DevSecOps evidence contracts
- control-plane evidence map contract
- control-plane evidence scenario contract
- local tests

The mock API does not call Amazon Bedrock, deploy cloud resources, or require cloud account setup.

## Request Flow

Current local request flow:

```text
Client
  -> POST /chat
  -> normalize request
  -> apply default mock policy profile
  -> check allowed model
  -> enforce synthetic token budget
  -> call mock Bedrock client
  -> return synthetic response with metadata
  -> emit structured local request log
```

## P0 To P1 Evolution

The repository has been built incrementally through small PRs.

| PR | Theme | What changed |
|---|---|---|
| #1 | P0 project foundation | Created the initial documentation-heavy scaffold, architecture docs, provider folders, CI skeletons, and project positioning. |
| #2 | P0 control plane and scope cleanup | Clarified the cloud-agnostic control plane, gateway layers, local ignore rules, PR template wording, and public-facing scope language. |
| #3 | Architecture diagrams | Added reader-first architecture diagrams, platform system view, logical layer overview, and responsible AI review layer. |
| #4 | Capacity and guardrail documentation | Added Cloud AI capacity planning notes and safety signal mappings using public cloud concepts. |
| #5 | P1 mock GenAI API | Added the local TypeScript mock API with `/health`, `/chat`, mock Bedrock client interface, metadata, validation, tests, CI, and API README. |
| #6 | Request metadata logging | Added structured JSON request logs for local observability and FinOps examples without logging prompts or request bodies. |
| #7 | Token budget guardrail | Added a synthetic input token budget check before mock response generation, returning `token_budget_exceeded` for oversized requests. |
| #8 | API contract schemas | Added JSON schemas for chat request, chat response, and error response, with tests comparing actual runtime payloads to the documented contracts. |
| #9 | Default policy profile and walkthrough | Added a local policy profile for default model, allowed models, max prompt length, and token budget settings, plus this solution walkthrough. |
| #10 | Demo fixtures | Added synthetic request, response, error, and request log examples for demos and contract checks. |
| #11 | Demo script | Refreshed the portfolio walkthrough around the current P1 mock API and synthetic fixtures. |
| #12 | Local mock eval harness | Added synthetic eval cases for gateway contract, guardrail, metadata, and observability behavior. |
| #13 | RAG governance contract | Added mock RAG request and response contracts for retrieval metadata, citation requirements, egress decisions, and audit evidence. |
| #14 | Architecture wording alignment | Refined architecture wording around the CloudAI control plane and implementation view. |
| #15-#21 | Local RAG workflow | Added Python ingest, chunk export, evaluation dataset preparation, synthetic mock response scoring, sample outputs, and a local RAG demo walkthrough. |
| #22 | Demo index | Added an examples index that links the mock GenAI API and local RAG walkthrough. |
| #23 | RAG documentation alignment | Aligned README and solution docs around the local RAG workflow and TypeScript/Python language boundary. |
| #24 | RAG governance API metadata | Added mock API endpoints and contracts that expose local RAG workflow artifact metadata without adding retrieval runtime. |
| #25 | Mock governed RAG query | Added a mock governed RAG response endpoint using existing contracts, without adding retrieval runtime or provider calls. |
| #26 | Governed RAG query demo eval | Added eval evidence and demo documentation for the mock governed RAG query endpoint. |
| #29 | Mock AgentOps traffic governance | Added metadata-only authorisation decisions, session and action contracts, synthetic fixtures, audit evidence, and local evaluation without tool execution. |
| #30-#35 | Capability, RAG lifecycle, guardrails, and roadmap alignment | Added reusable capability governance, RAG source lifecycle, Guardrails as a Service, current-state refreshes, and AI factory positioning notes. |
| #36-#38 | EKS release engineering readiness | Added Helm packaging, Argo CD application pattern, release gates, rollback notes, and status refresh. |
| #39-#40 | AI-assisted DevSecOps | Added advisory AI-assisted delivery boundaries and synthetic review evidence records. |
| #41-#42 | P6 status and control-plane evidence | Clarified P6a/P6b/P6c lanes and added the P6d control-plane evidence map. |
| P6e | P6 evidence scenarios | Added scenario coverage for allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked governance outcomes. |

## P0 Foundation Summary

P0 established the portfolio structure and architecture narrative:

- AWS-first, multi-cloud-ready positioning
- CloudAI Control Plane concept
- GenAI / LLM Gateway and AI Traffic Governance distinction
- AWS, Azure, and GCP reference mapping notes
- FinOps, observability, responsible AI, and operations docs
- Terraform and GitHub Actions skeletons
- local project-control workflow kept out of the public repo

P0 deliberately avoided real deployment and application complexity.

## P1 Mock Platform Summary

P1 turns the architecture into a small working API while keeping the project local and low-cost.

Current mock platform capabilities:

- Health check endpoint
- Chat endpoint
- Mock provider client boundary
- Request validation
- Mock model allow list
- Synthetic token estimation
- Synthetic cost estimation
- Structured request logs
- Token budget guardrail
- JSON contract schemas
- Synthetic demo fixtures
- Local mock eval harness
- RAG governance request and response contracts
- RAG governance metadata endpoints
- Mock governed RAG query endpoint
- Python local RAG workflow artifacts for chunking, eval dataset preparation, and scoring
- Local test suite
- CI test job

This gives the project a concrete demonstration path without requiring real AWS resources.

## P2-P3 Governance Summary

The governance layer adds reusable controls around model, safety, and data access:

- Guardrails as a Service contracts and `POST /guardrails/assess`
- synthetic PII, jailbreak, prompt-injection, high-risk, and safe verdict examples
- governed RAG request and response contracts
- RAG metadata endpoints
- mock governed RAG query response with citation, egress decision, and audit evidence
- local Python RAG workflow for ingest, chunking, evaluation dataset preparation, and scoring

These patterns demonstrate how enterprise AI platforms can expose safety and retrieval evidence without implementing a real scanner, vector store, or provider-backed RAG runtime.

## P4-P6 Platform Story

The later phases turn the project into a broader Cloud & AI platform portfolio:

- **P4 EKS Release Engineering:** Helm packaging, Argo CD application pattern, release gates, rollback notes, and optional personal AWS/EKS sandbox guidance.
- **P5 AI-Assisted DevSecOps:** advisory AI use boundary, human-owned review evidence, CI/security checks, and release evidence patterns.
- **P6 AgentOps / AI Traffic Governance:** runtime AgentOps decisions, capability governance before runtime use, RAG knowledge lifecycle, the P6d control-plane evidence map, and P6e evidence scenarios.

The important architecture point is separation of concerns:

```text
Capability governance
  -> runtime AgentOps decision
  -> RAG knowledge lifecycle state
  -> guardrail verdict
  -> AI-assisted delivery evidence
  -> control-plane evidence map and scenarios
```

This shows how the CloudAI control plane can collect evidence across platform controls without executing an agent, calling a provider, storing sensitive payloads, or deploying cloud resources.

## What Is Intentionally Mock-Only

The following are intentionally not implemented yet:

- real Bedrock invocation
- AWS account setup
- Terraform apply workflow
- API Gateway deployment
- Lambda/ECS/EKS runtime deployment
- authentication and authorization
- persistent request storage
- external observability export
- real provider quota integration
- real cost allocation
- real agent runtime or MCP tool execution
- real skill scanning or cryptographic signing
- real guardrail provider integration
- real vector search or embeddings

These are deferred until the control model, contract, guardrails, and local developer workflow are stable.

## Public Demo Narrative

A concise demo story:

1. Start with the CloudAI platform architecture.
2. Show the GenAI / LLM Gateway as the first model-access layer.
3. Run or describe the mock API and contract tests.
4. Show `/chat` metadata: request ID, model name, token estimates, cost estimate, timestamp.
5. Show structured logs that omit prompt text and request bodies.
6. Show Guardrails as a Service verdict examples.
7. Show governed RAG contracts, metadata endpoints, and mock query response.
8. Show AgentOps authorisation decisions for allow, deny, approval-required, and paused outcomes.
9. Show capability governance and RAG lifecycle records.
10. Show P4 release engineering: Helm, Argo CD, release gates, and rollback.
11. Show P5 AI-assisted DevSecOps boundary and review evidence.
12. End with the P6d control-plane evidence map as the unifying portfolio artifact.
13. Explain how AWS deployment, real Bedrock integration, and real EKS sandbox work are future opt-in phases.

## Future Deployment Path

The project should move toward real resources gradually:

1. Keep the current mock gateway and governed RAG contracts aligned with tests and fixtures.
2. Expand P6 evidence only when a new synthetic scenario explains a materially different governance outcome.
3. Add reviewed AWS Terraform module stubs and validation examples.
4. Add reviewed IAM, KMS, logging, and API runtime patterns.
5. Add explicit cost and cleanup guidance.
6. Add optional personal AWS EKS sandbox execution only after backend, OIDC, budget, teardown, and secret-handling controls are clear.
7. Add real Bedrock integration only after cost and governance controls are clearly documented.

Real AWS deployment should remain opt-in, reviewed, and easy to destroy.

## Reader Guide

Useful entry points:

- `README.md` for the high-level portfolio overview.
- `docs/current-status.md` for the current milestone, deferred runtime work, and next planned slice.
- `docs/architecture.md` for architecture layers and diagrams.
- `docs/control-plane.md` for the CloudAI Control Plane concept.
- `docs/genai-llm-gateway.md` for model-access gateway framing.
- `docs/ai-traffic-governance.md` for P6 AgentOps and AI Traffic Governance scope.
- `docs/agent-capability-governance.md` for capability admission before runtime use.
- `docs/rag-knowledge-lifecycle.md` for source lifecycle and retired-source controls.
- `docs/guardrails-as-a-service.md` for shared safety verdict contracts.
- `docs/ai-assisted-devsecops-pattern.md` and `docs/ai-assisted-review-evidence.md` for P5 delivery controls.
- `docs/control-plane-evidence-map.md` for the P6d evidence map.
- `docs/demo-script.md` for a short portfolio walkthrough.
- `providers/aws/app/api/README.md` for the local mock API.
- `shared/schemas/mock-genai-api/` for API contract schemas.
- `shared/examples/mock-genai-api/` for synthetic demo fixtures.
- `examples/rag-pattern/README.md` for governed RAG contract notes.
- `examples/rag-pattern/python/DEMO_WALKTHROUGH.md` for the local RAG ingest, evaluation, and scoring flow.
