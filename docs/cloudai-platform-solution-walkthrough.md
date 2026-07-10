# CloudAI Platform Solution Walkthrough

This document explains how the `cloudai-platform` repository fits together as a Cloud & AI platform engineering reference implementation.

The project is AWS-first and multi-cloud-ready. It uses synthetic examples, public cloud service patterns, and mock mode by default. It is a reference implementation and learning project, not an operated service.

## Solution Overview

`cloudai-platform` models a Cloud AI control plane that coordinates governed model access, AI traffic governance, provider adapters, platform foundations, FinOps, observability, and release engineering patterns.

The current implementation starts with a local mock GenAI / LLM Gateway API. This is intentional: the project first proves the control model, API shape, metadata, guardrails, tests, and documentation before introducing real cloud resources.

## Architecture Layers

The solution is organized around these layers:

| Layer | Purpose | Current state |
|---|---|---|
| CloudAI Control Plane | Coordinates use case intake, policy, approval, audit, provider registry, and evaluation concepts. | Documented architecture. |
| GenAI / LLM Gateway | Provides the first model-access sub-layer for governed model calls. | Local mock API implemented. |
| AI Traffic Governance | Future broader governance layer for model, agent, tool, API, and data egress flows. | Documented roadmap and architecture. |
| Provider Adapters | Keep cloud-specific implementation behind provider boundaries. | AWS-first placeholders; Azure/GCP mappings documented. |
| Platform Foundations | Provide IAM, KMS, network, API, runtime, CI/CD, and observability foundations. | Documentation and skeletons only. |
| FinOps / Observability | Track token estimates, costs, logs, metrics, and operational signals. | Local metadata, token budget, and structured logs implemented. |

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
- `POST /chat`
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
| Current | RAG governance API metadata | Adds mock API endpoints and contracts that expose local RAG workflow artifact metadata without adding retrieval runtime. |

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

Current P1 capabilities:

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
- Local test suite
- CI test job

This gives the project a concrete demonstration path without requiring real AWS resources.

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

These are deferred until the control model, contract, guardrails, and local developer workflow are stable.

## Public Demo Narrative

A concise demo story:

1. Start with the CloudAI platform architecture.
2. Show the GenAI / LLM Gateway as the first model-access layer.
3. Run the mock API locally.
4. Call `/health`.
5. Call `/chat` with an allowed mock model.
6. Show response metadata: request ID, model name, token estimates, cost estimate, timestamp.
7. Show structured logs that omit prompt text and request bodies.
8. Send an oversized prompt and show the token budget guardrail.
9. Point to JSON schemas as the documented API contract.
10. Open the synthetic fixtures under `shared/examples/mock-genai-api/` to show the demo request, response, error, and request log shapes.
11. Show the local mock eval harness and eval result fixture as lightweight LLMOps evidence.
12. Open `examples/README.md` and show the local RAG walkthrough.
13. Call `/rag/status` and `/rag/artifacts` to show how the API describes local RAG contracts and sample outputs.
14. Explain how AWS deployment and real Bedrock integration are future opt-in phases.

## Future Deployment Path

The project should move toward real resources gradually:

1. Complete P1 mock gateway controls.
2. Add P2 Terraform validation and AWS foundation skeletons.
3. Add reviewed IAM, KMS, logging, and API runtime patterns.
4. Add explicit cost and cleanup guidance.
5. Add optional small AWS deployment, likely API Gateway + Lambda + CloudWatch first.
6. Add real Bedrock integration only after cost and governance controls are clearly documented.

Real AWS deployment should remain opt-in, reviewed, and easy to destroy.

## Reader Guide

Useful entry points:

- `README.md` for the high-level portfolio overview.
- `docs/architecture.md` for architecture layers and diagrams.
- `docs/control-plane.md` for the CloudAI Control Plane concept.
- `docs/genai-llm-gateway.md` for model-access gateway framing.
- `docs/ai-traffic-governance.md` for future traffic governance scope.
- `docs/demo-script.md` for a short portfolio walkthrough.
- `providers/aws/app/api/README.md` for the local mock API.
- `shared/schemas/mock-genai-api/` for API contract schemas.
- `shared/examples/mock-genai-api/` for synthetic demo fixtures.
- `examples/rag-pattern/README.md` for governed RAG contract notes.
- `examples/rag-pattern/python/DEMO_WALKTHROUGH.md` for the local RAG ingest, evaluation, and scoring flow.
