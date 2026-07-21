# Current Status

This page summarizes the current public project state. Local planning notes and ignored working files stay outside the repository.

## Current Milestone

The local mock GenAI gateway, governed RAG evidence path, mock AgentOps
decision path, capability-governance contracts, RAG knowledge lifecycle,
Guardrails as a Service path, P4 release-engineering evidence, P5 AI-assisted
DevSecOps evidence, P6 security/operations control matrix, and bounded P8
Bedrock validation are complete for the current portfolio scope.

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
- **P4e Helm-on-EKS Validation Workflow:** GitHub Actions OIDC, temporary kubeconfig, node readiness check, Helm lint/render, and namespace dry-run against the active sandbox without installing workloads
- **P4f Helm Release Workflow:** optional sandbox Helm install, rollout observation, rollback, uninstall, and namespace cleanup with ClusterIP-only exposure and synthetic workload boundaries
- **P4g Argo CD GitOps Workflow:** pinned Argo CD bootstrap, private-repository access, explicit manual sync, exact revision verification, health verification, status, ordered cleanup, and post-exercise destroy for the synthetic Helm workload
- **P8 Real Bedrock Sandbox:** bounded synthetic validation for model access
  and Guardrails using least privilege, manual approval, budget controls, and
  sanitized evidence
- **P8a/P8b Bedrock Access and IAM Boundary:** historical readiness gates,
  Terraform module, stack, tests, and confirmation-gated IAM apply path
- **P8c Synthetic Bedrock Smoke Test:** one bounded synthetic model-access
  validation through the dedicated OIDC role
- **P8d Opt-in Bedrock Gateway Adapter:** validated adapter smoke path while
  mock mode remains the ordinary runtime path
- **P8e Bedrock Guardrails Mapping:** static contract and schema mapping from
  the mock guardrail model to Bedrock concepts
- **P8f Bedrock Guardrail Boundary:** Terraform-managed synthetic Guardrail/version, separate guarded-inference role, lifecycle-only bootstrap permission, and live-validated confirmation-gated guarded `Converse` workflow path
- **P8g Direct Guardrail Evaluation:** live-validated manual metadata-only evaluation of safe, PII-shaped, and prompt-attack-shaped synthetic categories through `ApplyGuardrail`; no model invocation or automatic CI call
- **P8h AgentCore Knowledge-Lookup Readiness:** static gateway-first reference architecture mapping future AgentCore controls to existing evidence; no AgentCore resource or call
- **P5a AI-Assisted DevSecOps Boundary:** advisory AI use, human review, CI/security checks, and release evidence
- **P5b AI-Assisted Review Evidence:** review summaries, threat-model checklists, CI failure summaries, and release-note drafts
- **P6f AI Platform Security and Operations Controls:** identity, data protection, AI AppSec, delivery, operations, and FinOps

**P6 AI Traffic Governance / AgentOps** is the control-plane evidence track.
It currently has six mock-first lanes:

- **P6a Runtime AgentOps:** agent identity, tool permission, policy verdict, human approval, budget state, traceability, and pause/terminate decisions.
- **P6b Capability Governance:** registry metadata, skill cards, scan/evaluation evidence, admission decision, lifecycle state, and approved/blocked/approval-required capability outcomes.
- **P6c RAG Knowledge Lifecycle:** source provenance, owner, classification, authorised knowledge-base boundary, retention, review, and active/paused/retired state.
- **P6d Control-Plane Evidence Map:** a synthetic map connecting runtime decisions, capability admission, RAG lifecycle state, guardrail verdicts, and human-owned AI-assisted review evidence.
- **P6e Control-Plane Evidence Scenarios:** a synthetic scenario pack for allowed, denied, approval-required, blocked-before-runtime, and retired-source-blocked governance outcomes.
- **P6f AI Platform Security and Operations Controls:** a control matrix connecting identity, data protection, AI AppSec, delivery controls, operations, and FinOps to existing portfolio evidence.

## Current Implementation and Validation Evidence

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
| P4e Helm-on-EKS validation workflow | Live sandbox validated | `.github/workflows/helm-eks-validation.yml` and `docs/ai-release-engineering-on-eks.md` |
| P4f Helm release workflow | Live install, rollback, and uninstall validated | `.github/workflows/helm-eks-release.yml` and `docs/ai-release-engineering-on-eks.md` |
| P4g Argo CD GitOps workflow | Live GitOps sync, health, status, cleanup, and destroy validated | `.github/workflows/argocd-eks-gitops.yml`, `argocd/applications/cloudai-api-sandbox.yaml`, and `docs/ai-release-engineering-on-eks.md` |
| P8 Real Bedrock Sandbox | Bounded synthetic sandbox validation complete | `docs/p8-real-bedrock-sandbox-design.md` and `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md` |
| P8a Bedrock access readiness | Complete | `docs/p8a-bedrock-access-readiness.md` and `docs/templates/p8a-bedrock-smoke-test-evidence.md` |
| P8b Bedrock Terraform IAM boundary | Confirmation-gated IAM apply boundary complete | `providers/aws/infra/terraform/modules/bedrock-access/`, `providers/aws/infra/terraform/envs/bedrock-sandbox/`, and `.github/workflows/terraform-bedrock-sandbox.yml` |
| P8c synthetic Bedrock smoke test | Live synthetic smoke test validated | `.github/workflows/terraform-bedrock-sandbox.yml` and sanitized workflow evidence |
| P8d opt-in Bedrock gateway adapter | Live adapter smoke validated; mock remains default | `providers/aws/app/api/src/clients/awsBedrockClient.ts`, `providers/aws/app/api/src/scripts/bedrockAdapterSmoke.ts`, and `.github/workflows/bedrock-gateway-adapter.yml` |
| P8e Bedrock Guardrails mapping | Complete static documentation-and-contract mapping | `docs/guardrails-as-a-service.md`, `shared/schemas/guardrails-as-a-service/bedrock-guardrails-mapping.schema.json`, `shared/examples/guardrails-as-a-service/bedrock-guardrails-mapping.mock.json`, and `providers/aws/app/api/tests/guardrailsContracts.test.ts` |
| P8f Bedrock Guardrail boundary | Live Guardrail apply and guarded `Converse` attachment smoke validated | `providers/aws/infra/terraform/modules/bedrock-access/`, `providers/aws/infra/terraform/envs/bedrock-sandbox/`, `.github/workflows/terraform-bedrock-sandbox.yml`, and `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` |
| P8g Direct Guardrail evaluation | Live direct evaluation validated the expected safe-allowed, PII-shaped-blocked, and prompt-attack-shaped-blocked metadata verdicts; no model invocation | `.github/workflows/terraform-bedrock-sandbox.yml`, `.github/workflows/terraform-tests.yaml`, and `providers/aws/infra/terraform/envs/bedrock-sandbox/README.md` |
| P8h AgentCore knowledge-lookup readiness | Complete static gateway-first reference architecture; no AgentCore resource or call | `docs/p8h-agentcore-knowledge-lookup-readiness.md` |
| P5a AI-assisted DevSecOps boundary | Complete | `docs/ai-assisted-devsecops-pattern.md` and `.github/workflows/ai-assisted-devsecops.yml` |
| P5b AI-assisted review evidence | Complete | `docs/ai-assisted-review-evidence.md`, `shared/schemas/ai-assisted-devsecops/`, and `shared/examples/ai-assisted-devsecops/` |
| P6d control-plane evidence map | Complete | `docs/control-plane-evidence-map.md`, `shared/schemas/control-plane-evidence/`, and `shared/examples/control-plane-evidence/` |
| P6e control-plane evidence scenarios | Complete | `docs/control-plane-evidence-scenarios.md`, `shared/schemas/control-plane-evidence/evidence-scenarios.schema.json`, and `shared/examples/control-plane-evidence/evidence-scenarios.mock.json` |
| P6f security and operations controls | Complete | `docs/ai-platform-security-operations-controls.md` |

## Intentionally Deferred

The following are not part of the current portfolio scope:

- unbounded or production provider calls
- persistent provider-backed AI application deployment
- real retrieval runtime
- embeddings
- vector indexes
- provider-backed RAG answer generation
- persistent audit storage
- real PII detection, jailbreak detection, or safety classification
- runtime agent execution
- runtime traffic proxy
- production EKS runtime delivery
- real AI model inference on EKS
- autonomous AI-assisted delivery

These should remain opt-in future work with explicit cost, cleanup, and governance guidance.

## Future Work Selection Rule

The current portfolio baseline is complete. Future work must add a distinct
engineering outcome, preserve explicit cost, cleanup, and public-safety
boundaries, and avoid duplicating the current evidence.

The bounded EKS and Bedrock validation paths are reusable evidence, not default
deployment instructions. Repeat them only when a changed implementation or a
new learning goal requires fresh, sanitized evidence.

Completed P4 evidence:

- **P4a portfolio-ready release engineering:** Helm/Kubernetes chart for the mock AI API service, probes, rollback notes, resource requests, policy gates, and synthetic deployment metadata.
- **P4b optional personal EKS sandbox readiness:** Terraform backend bootstrap, GitHub OIDC delivery plane, small no-NAT network defaults, restricted EKS API endpoint CIDRs, budget and teardown gates, synthetic workload boundary, manual apply/destroy path, and no-account-specific-value rules.
- **P4c GitOps / Argo CD pattern:** application manifest pattern, promotion notes, and audit metadata for release decisions.
- **P4d release gates and rollback:** pre-deploy gates, rollout observation, rollback choices, failure modes, and synthetic evidence expectations.
- **P4e Helm-on-EKS validation workflow:** GitHub Actions OIDC access to the active sandbox, temporary runner kubeconfig, node readiness check, Helm lint/render, namespace dry-run, endpoint allowlist restoration, and no workload install; live validation has passed.
- **P4f Helm release workflow:** optional install/rollback/uninstall workflow for the mock API Helm chart, using temporary runner `/32` access, a public test image override, ClusterIP-only exposure, rollout status, synthetic health check, and cleanup.
- **P4g Argo CD GitOps workflow:** optional pinned Argo CD bootstrap and explicit GitOps sync for the same synthetic Helm workload, with private repository access, exact revision verification, sync/health evidence, ordered cleanup, and post-exercise destroy.

Future work controls:

- **P4b repeat-run discipline:** keep AWS Budget, operator `/32` endpoint CIDR, teardown owner, and environment protection as required gates before any repeat apply. The workflow can run backend-backed validate, plan, apply, and destroy through the `aws-sandbox` environment.
- **P4f/P4g evidence reuse:** treat the completed Helm and Argo CD live validations as release-engineering evidence. Repeat them only when there is a new learning goal or changed implementation.
- **Synthetic-vs-real AI boundary:** keep public wording clear that the live EKS workload was synthetic. Real AI inference would require model artifacts, model server images, GPU or accelerator capacity, readiness checks, secure model/data access, evaluation evidence, observability, and FinOps.
- **P6 AI Traffic Governance evidence expansion:** add more synthetic scenario variants only if they explain a new governance outcome that is not already covered by P6e/P6f.
- **P4b future evidence refresh:** capture only sanitized apply/destroy observations when needed; do not commit account identifiers, live endpoints, kubeconfig, raw plans, state, tfvars, backend names, or screenshots with private details.
- **P4b pre-apply readiness check:** use `docs/p4b-eks-sandbox-operator-runbook.md` as the single go/no-go runbook before any real personal EKS sandbox apply.
- **P8g evidence reuse:** the initial three-case direct evaluation is live validated. Repeat it only when there is a new evaluation goal or a Guardrail configuration change. Treat its result as narrow synthetic configuration evidence, not Guardrail-quality evidence.
- **P8h reference boundary:** the completed AgentCore knowledge-lookup reference is design-only. Any AgentCore resource, Gateway, runtime, identity, knowledge source, Terraform/IAM, or provider call needs a separate reviewed design and must not reuse P8f/P8g evidence as proof of production safety effectiveness.
- **P7 AI Factory / LLMOps / GPU stretch:** retain the [AI Factory infrastructure lens](ai-factory-infrastructure-lens.md) as future research context; it is not a current GPU or AI Factory implementation.

The repository should not perform a real cloud deployment by default. Any personal sandbox work must keep account identifiers, state, kubeconfig, plan files, tfvars, credentials, and live endpoint details out of git.

Use the package-pinned API test command when validating locally:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

## Portfolio Positioning

The current project demonstrates Cloud & AI Platform Engineering: secure, scalable, governed, observable, and cost-aware AI-ready platform foundations using synthetic examples and local mock controls.
