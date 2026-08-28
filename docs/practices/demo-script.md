# Demo Script

This script gives a short portfolio walkthrough of `cloudai-platform` without requiring live cloud access.

The goal is to show how the repository turns a Cloud & AI platform architecture into a small, testable mock implementation before introducing real deployment work.

## Audience

- Cloud platform engineers
- AI platform engineers
- DevOps and platform architecture reviewers
- Hiring or portfolio reviewers who want a quick technical walkthrough

## Demo Length

Target length: 8 to 12 minutes.

## Setup

Start from the repository root.

```bash
git status
cd providers/aws/app/api
pnpm test
```

Expected result: the mock API test suite passes locally.

The demo does not require provider setup, Terraform apply, or live Bedrock access.

## Walkthrough

### 1. Introduce The Platform Goal

Open `README.md`.

Talk track:

`cloudai-platform` is an AWS-first, multi-cloud-ready Cloud & AI platform reference implementation. It demonstrates how a CloudAI control plane can organize governed model access, AI traffic governance, provider adapters, FinOps, observability, and release engineering patterns.

Emphasize that the project is incremental. It starts with a local mock GenAI / LLM Gateway API, then adds guardrails, governed RAG, AgentOps, capability governance, release engineering, AI-assisted DevSecOps evidence, control-plane evidence, and security/operations controls before any real cloud resources are introduced.

### 2. Show The Architecture View

Open `docs/architecture/architecture.md`.

Point out:

- the CloudAI Control Plane as the governance and coordination layer
- the GenAI / LLM Gateway as the model-access sub-layer
- AI Traffic Governance as the layer for agent, tool, retrieval, workflow, and data-access flows
- provider adapters for AWS-first implementation with Azure and GCP mappings
- cross-cutting concerns such as identity, policy, FinOps, observability, audit, and responsible AI review
- the P6f security and operations control matrix as the bridge from evidence contracts to platform-operating responsibilities

Suggested line:

The project separates the control model from provider-specific implementation, so AWS can be the first implementation provider without making the architecture AWS-only.

### 3. Show The Current P1 Mock API

Open `providers/aws/app/api/README.md`.

Highlight:

- `GET /health`
- `POST /chat`
- `POST /rag/query`
- `POST /agent-actions/authorize`
- `POST /guardrails/assess`
- mock Bedrock client interface
- default mock policy profile
- request metadata
- synthetic token and cost estimates
- structured request logs
- token budget guardrail
- API contract schemas
- synthetic demo fixtures
- local mock eval harness

Run:

```bash
pnpm test
```

Explain that the tests prove the local mock API behavior without calling provider services.

### 4. Show The Local Eval Harness

Open `providers/aws/app/api/src/evals/mockGatewayEvals.ts`.

Talk track:

The local eval harness is a mock-mode quality and guardrail check. It does not judge model intelligence. Instead, it verifies gateway behavior that a platform team would care about: allowed requests, blocked requests, policy decisions, response metadata, and log safety.

Open `shared/examples/mock-genai-api/eval-result.mock.json`.

Point out:

- total, passed, and failed case counts
- contract checks
- guardrail checks
- metadata checks
- observability checks
- governed RAG query evidence, including citation, egress decision, audit evidence, and no query text echo

### 5. Show The Demo Fixtures

Open `shared/examples/mock-genai-api/`.

Show these files:

- `chat-request.allowed.json`
- `chat-response.mock.json`
- `chat-error-token-budget.json`
- `request-log.mock.json`
- `eval-result.mock.json`
- `../rag-governance/rag-request.allowed.json`
- `../rag-governance/rag-response.governed.json`

Talk track:

These fixtures make the demo repeatable. They show the request shape, response metadata, token budget error, and observability event in a simple way that can be reviewed without running a deployed service.

Point out that the request log example includes metadata only. It does not include prompt text or request bodies.

### 6. Show The Mock Governed RAG Query

Open `providers/aws/app/api/README.md`.

Open `shared/examples/rag-governance/rag-request.allowed.json` and `shared/examples/rag-governance/rag-response.governed.json`.

Talk track:

The mock RAG query endpoint demonstrates the governed response contract. It returns synthetic citation metadata, retrieval metadata, an egress decision, and audit evidence without performing retrieval, executing Python, calling a model, creating embeddings, or using a vector index.

### 7. Show Guardrails As A Service

Open `docs/solutions/guardrails-as-a-service.md` and `shared/examples/guardrails-as-a-service/`.

Talk track:

Guardrails as a Service is a shared safety-verdict contract for model gateway, RAG, AgentOps, and delivery flows. It returns synthetic `allow`, `redact`, `deny`, or `approval-required` verdicts without scanning real content or storing raw prompts.

Point to the PII, jailbreak, high-risk review, and safe examples. Explain that this is a pattern for safety evidence, not a real moderation provider.

### 8. Show The Mock AgentOps Decision

Open `shared/examples/agentops-governance/agent-action.allowed-read.json` and `providers/aws/app/api/src/lib/agentOpsPolicy.ts`.

Talk track:

The AgentOps endpoint takes synthetic identity, requested tool, action class, least-privilege scope, approval reference, and budget metadata. It returns a deterministic `allow`, `deny`, `approval-required`, or `paused` verdict with audit identifiers. It does not execute a tool, invoke a model, install a skill, or call a cloud service.

Point out the additional fixtures for approval-required, denied-tool, and exhausted-budget paths. They show runtime governance as a testable contract rather than a live agent runtime.

### 9. Show Capability Governance And RAG Lifecycle

Open `docs/practices/agent-capability-governance.md` and `docs/solutions/rag-knowledge-lifecycle.md`.

Talk track:

Capability governance controls whether a reusable skill, MCP tool, plugin, or adapter is eligible for the platform catalogue before runtime use. Runtime AgentOps still decides whether an admitted capability can act in a specific session.

Then show the RAG lifecycle examples:

- `shared/examples/rag-knowledge-lifecycle/demo-platform-handbook.active.json`
- `shared/examples/rag-knowledge-lifecycle/legacy-platform-handbook.retired.json`

Explain that a retired source cannot produce a new governed RAG response.

### 10. Show The Runtime Request Flow

Open `docs/solutions/cloudai-platform-solution-walkthrough.md`.

Use the request flow:

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

Explain that this is the first practical slice of the GenAI / LLM Gateway. It is intentionally small, but it already shows where policy, model access, token controls, cost signals, and observability hooks fit.

### 11. Show EKS Release Engineering

Open:

- `helm/ai-api-service/`
- `docs/solutions/p4b-eks-sandbox-operator-runbook.md`
- `argocd/applications/cloudai-api-sandbox.yaml`
- `docs/solutions/eks-release-gates-and-rollback.md`

Talk track:

The P4 release engineering track shows how the mock AI API can be packaged and
promoted using Helm, an optional personal EKS sandbox, Argo CD, release gates,
and rollback decisions. The default local walkthrough does not call or mutate
AWS. Separately, protected and manually approved AWS workflows have validated
bounded synthetic EKS release paths, Bedrock and AgentCore controls, and cost
guardrails; those provider paths are opt-in and are not run by this
walkthrough. P4b explains the Terraform backend, GitHub OIDC, budget, manual
approval, synthetic workload, and teardown gates required before any repeat
personal sandbox apply.

### 12. Show AI-Assisted DevSecOps Evidence

Open:

- `docs/practices/ai-assisted-devsecops-pattern.md`
- `docs/evidence/ai-assisted-review-evidence.md`
- `shared/examples/ai-assisted-devsecops/`

Talk track:

P5 shows how AI assistance can support delivery without owning the change. AI output is advisory; humans own review, security checks, release decisions, and rollback. The evidence fixtures show review summaries, threat-model checklists, CI failure summaries, and release-note drafts without storing prompts or sensitive content.

### 13. Show The Control-Plane Evidence Map And Scenarios

Open `docs/evidence/control-plane-evidence-map.md` and `shared/examples/control-plane-evidence/evidence-map.mock.json`.

Talk track:

This is the unifying P6d artifact. It links runtime AgentOps, capability admission, RAG lifecycle state, guardrail verdicts, and AI-assisted review evidence into one control-plane evidence map.

Then open `docs/evidence/control-plane-evidence-scenarios.md` and `shared/examples/control-plane-evidence/evidence-scenarios.mock.json`.

Talk track:

P6e turns the evidence map into scenario outcomes. It shows how the same control-plane lanes explain allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked decisions.

Suggested line:

The point is not that this repository runs an enterprise AI platform. The point is that it demonstrates how a platform team can model the evidence needed to explain why enterprise AI actions are allowed, denied, paused for approval, blocked before runtime, or excluded because source lifecycle has changed.

### 14. Show Security And Operations Controls

Open `docs/practices/ai-platform-security-operations-controls.md`.

Talk track:

P6f turns the project into an interview-ready operating model. It connects six enterprise AI controls: identity, data protection, AI AppSec, delivery controls, operations, and FinOps. Each row explains the threat, platform control, implementation pattern, audit evidence, existing repo evidence, and gap to study.

Suggested line:

Production enterprise AI is not just a model problem. It is a platform control problem: identity, data protection, AI AppSec, release gates, operations evidence, rollback, and cost control.

### 15. Show What Is Deferred

Open `docs/solutions/cloudai-platform-solution-walkthrough.md`, then the “What Is Intentionally Mock-Only” and “Future Deployment Path” sections.

Call out that these are future work:

- real Bedrock invocation
- Terraform apply workflow
- API Gateway, Lambda, ECS, or EKS deployment
- persistent audit storage
- external observability export
- real provider quota integration
- real cost allocation
- real agent runtime or tool execution
- real vector search, embeddings, or provider-backed RAG
- real guardrail provider integration

Suggested line:

The project moves toward real AWS resources only after the local contract, controls, test coverage, cost guidance, and cleanup path are clear.

## Optional Local API Run

If you want to show the API manually:

```bash
cd providers/aws/app/api
pnpm run dev
```

In another terminal:

```bash
curl -s http://localhost:3000/health
```

```bash
curl -s http://localhost:3000/chat \
  -H "content-type: application/json" \
  -d @../../../../shared/examples/mock-genai-api/chat-request.allowed.json
```

```bash
curl -s http://localhost:3000/rag/query \
  -H "content-type: application/json" \
  -d @../../../../shared/examples/rag-governance/rag-request.allowed.json
```

```bash
curl -s http://localhost:3000/agent-actions/authorize \
  -H "content-type: application/json" \
  -d @../../../../shared/examples/agentops-governance/agent-action.allowed-read.json
```

Stop the local server when finished.

## Closing Message

This repository shows a practical Cloud & AI platform engineering path: start with architecture, define the control model, build a local mock gateway, add guardrails and governed RAG, model runtime AgentOps and capability governance, package release engineering patterns, document AI-assisted delivery controls, connect the evidence through a control-plane map and scenario pack, and summarize the security/operations controls required for production enterprise AI.

The current phase is intentionally mock-first. That keeps the project understandable, reviewable, and low-cost while the platform design matures.
