# CloudAI Platform Solution Walkthrough

This document explains how the `cloudai-platform` repository fits together as a Cloud & AI platform engineering reference implementation.

The project is AWS-first and multi-cloud-ready. It uses synthetic examples, public cloud service patterns, and mock mode by default. It is a reference implementation and learning project, not an operated service.

## Reader Guide

- **Portfolio overview:** start with the repository [README](../README.md) and
  [featured solutions](featured-solutions.md).
- **Architecture:** read [CloudAI architecture](architecture.md) and the
  [control plane](control-plane.md).
- **Implementation and evidence:** read [Current status](current-status.md),
  then the relevant delivery, RAG, gateway, or Bedrock document in the
  [Architecture Library](architecture-library.md).
- **Local demonstration:** use the [demo script](demo-script.md), the mock API
  README, and the local RAG walkthrough.

## Solution Overview

`cloudai-platform` models a CloudAI control plane that coordinates governed model access, AI traffic governance, provider adapters, platform foundations, FinOps, observability, release engineering, AI-assisted delivery controls, security and operations controls, and evidence mapping.

The implementation starts with a local mock GenAI / LLM Gateway API, then layers governed RAG, Guardrails as a Service, AgentOps decisions, capability governance, RAG knowledge lifecycle, EKS release engineering patterns, AI-assisted DevSecOps evidence, a control-plane evidence map, control-plane evidence scenarios, and an AI platform security/operations control matrix. This is intentional: the project proves the control model, API shape, metadata, guardrails, tests, and documentation before expanding beyond bounded, manually approved synthetic provider validation.

## Architecture Layers

The solution is organized around these layers:

| Layer | Purpose | Current state |
|---|---|---|
| CloudAI Control Plane | Coordinates use case intake, policy, approval, audit, provider registry, and evaluation concepts. | Reference model with partial local mock and bounded provider-validation evidence. |
| GenAI / LLM Gateway | Provides the first model-access sub-layer for governed model calls. | Local mock API implemented. |
| AI Traffic Governance | Broader governance layer for model, agent, tool, API, retrieval, workflow, and data egress flows. | Mock AgentOps, capability governance, RAG lifecycle, and evidence map implemented. |
| Provider Adapters | Keep cloud-specific implementation behind provider boundaries. | AWS opt-in adapter and bounded synthetic validation; Azure/GCP mappings documented. |
| Platform Foundations | Provide IAM, KMS, network, API, runtime, CI/CD, release, and observability foundations. | Helm, Argo CD, Terraform, and sandbox-validated EKS delivery patterns. |
| FinOps / Observability | Track token estimates, costs, logs, metrics, and operational signals. | Local metadata, token budget, and structured logs implemented. |
| Evidence Layer | Connect control outcomes across runtime, capability, RAG, guardrail, and delivery evidence. | P6d control-plane evidence map and P6e scenario pack implemented. |
| Security / Operations Controls | Connect identity, data protection, AI AppSec, delivery gates, operations, and FinOps to platform evidence. | P6f control matrix documented. |

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

The default mock API does not call Amazon Bedrock, deploy cloud resources, or require cloud account setup. A separate opt-in adapter has bounded synthetic validation evidence and is not the default application path.

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

## Evidence Progression

The portfolio progressed from an architecture and governance foundation to
local mock-first implementation, synthetic RAG and traffic-control evidence,
release engineering, and bounded provider validation:

1. **Architecture and control model:** the CloudAI control plane, provider
   boundaries, responsible AI, FinOps, observability, and public-safe scope.
2. **Local implementation:** the TypeScript mock gateway, contracts, request
   metadata, token controls, fixtures, and deterministic tests.
3. **Governed AI workflows:** local RAG artifacts, Guardrails as a Service,
   AgentOps decisions, capability governance, and evidence scenarios.
4. **Platform delivery:** Helm, Argo CD, Terraform, release gates, rollback,
   and sandbox-validated EKS delivery for a synthetic workload.
5. **Bounded provider validation:** manually approved, least-privilege,
   synthetic Bedrock and Guardrail validation while the application remains
   mock-first.

Read [Current status](current-status.md) for the detailed implementation
record, validation boundaries, and deferred scope.

## Foundation Scope

The foundation established the portfolio structure and architecture narrative:

- AWS-first, multi-cloud-ready positioning
- CloudAI Control Plane concept
- GenAI / LLM Gateway and AI Traffic Governance distinction
- AWS, Azure, and GCP reference mapping notes
- FinOps, observability, responsible AI, and operations docs
- Terraform and GitHub Actions skeletons
- local project-control workflow kept out of the public repo

The foundation deliberately avoided real deployment and application complexity.

## Mock Platform Summary

The mock platform turns the architecture into a small working API while keeping the project local and low-cost.

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

## Governed Workflow Summary

The governance layer adds reusable controls around model, safety, and data access:

- Guardrails as a Service contracts and `POST /guardrails/assess`
- synthetic PII, jailbreak, prompt-injection, high-risk, and safe verdict examples
- governed RAG request and response contracts
- RAG metadata endpoints
- mock governed RAG query response with citation, egress decision, and audit evidence
- local Python RAG workflow for ingest, chunking, evaluation dataset preparation, and scoring

These patterns demonstrate how enterprise AI platforms can expose safety and retrieval evidence without implementing a real scanner, vector store, or provider-backed RAG runtime.

## Platform Delivery and Bounded Provider Validation

The delivery and validation work turns the project into a broader Cloud & AI platform portfolio:

- **P4 EKS Release Engineering:** Helm packaging, Argo CD application pattern, personal EKS sandbox validation, release gates, rollback, cleanup, and teardown evidence for a synthetic workload.
- **P5 AI-Assisted DevSecOps:** advisory AI use boundary, human-owned review evidence, CI/security checks, and release evidence patterns.
- **P6 AgentOps / AI Traffic Governance:** runtime AgentOps decisions, capability governance before runtime use, RAG knowledge lifecycle, the P6d control-plane evidence map, P6e evidence scenarios, and the P6f security/operations control matrix.
- **P8 Bounded Bedrock Validation:** manual-approval, least-privilege, synthetic model-access and Guardrail validation; no persistent provider application runtime.

The important architecture point is separation of concerns:

```text
Capability governance
  -> runtime AgentOps decision
  -> RAG knowledge lifecycle state
  -> guardrail verdict
  -> AI-assisted delivery evidence
  -> control-plane evidence map, scenarios, and security/operations control matrix
```

This shows how the CloudAI control plane can collect evidence across platform controls without autonomous agent execution, sensitive-payload storage, or a persistent cloud deployment.

## What Is Intentionally Mock-Only

The following are intentionally not implemented yet:

- unbounded or production Bedrock invocation
- persistent AWS account or application deployment
- automatic Terraform apply workflow
- API Gateway deployment
- Lambda/ECS/EKS runtime deployment
- authentication and authorization
- persistent request storage
- external observability export
- real provider quota integration
- real cost allocation
- real agent runtime or MCP tool execution
- real skill scanning or cryptographic signing
- broad provider Guardrail policy or quality evaluation
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
10. Show P4 release engineering: Helm, sandbox-validated EKS delivery, Argo CD, release gates, rollback, cleanup, and teardown.
11. Show P5 AI-assisted DevSecOps boundary and review evidence.
12. Show the P6d/P6e control-plane evidence map and scenarios as the unifying portfolio artifacts.
13. Show the P6f security and operations control matrix as the interview-ready architecture bridge.
14. Explain the bounded P8 Bedrock validation and why persistent deployment, autonomous runtime behavior, and unconstrained provider access remain future opt-in phases.

## Future Deployment Path

The project should move toward real resources gradually:

1. Keep the current mock gateway and governed RAG contracts aligned with tests and fixtures.
2. Expand P6 evidence only when a new synthetic scenario explains a materially different governance outcome.
3. Add a new provider or runtime capability only when it has a distinct use case, reviewed data and security boundaries, cost controls, and a teardown or retirement plan.
4. Keep IAM, KMS, logging, and API runtime patterns aligned with the existing bounded validation evidence.
5. Expand provider integrations only after cost, governance, and operational ownership controls are explicit.

Real AWS deployment should remain opt-in, reviewed, and easy to destroy.
