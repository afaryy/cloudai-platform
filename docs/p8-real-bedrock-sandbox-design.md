# P8 Real Bedrock Sandbox Design

P8 defines the first deliberately bounded real Amazon Bedrock slice for CloudAI Platform.

The goal is to move one step beyond mock provider contracts without turning the repository into a live AI platform. The design proves how real model access could be governed, invoked, tested, and evidenced through the existing CloudAI control boundaries.

## Why P8 Comes After P4

P4 proved the delivery foundation first:

```text
GitHub Actions OIDC
  -> AWS sandbox role
  -> EKS
  -> Helm
  -> Argo CD
  -> private Git repository
  -> exact revision verification
  -> Kubernetes rollout and health evidence
  -> cleanup and destroy
```

P8 should now prove the next layer: real model-provider access behind a governed interface.

This sequence matters because real provider calls should not be added before identity, budget, evidence, and cleanup boundaries are clear.

## Scope

P8 is a design-first real-cloud slice.

The first implementation should include:

- Terraform-managed IAM boundary for Bedrock access.
- Manual GitHub Actions workflow through the protected `aws-sandbox` environment.
- GitHub Actions OIDC role assumption, not long-lived AWS keys.
- One tiny synthetic Bedrock smoke test.
- No customer, internal, production, personal, or confidential data.
- Sanitized evidence only.
- Clear budget and stop conditions.
- A future adapter path into the existing GenAI / LLM Gateway contract.

The first implementation should not include:

- Bedrock AgentCore.
- SageMaker, GPU, HyperPod, or custom model hosting.
- RAG runtime, vector databases, embeddings, or provider-backed RAG generation.
- Production API Gateway, Lambda, ECS, or EKS runtime deployment.
- Persistent prompt/response storage.
- Real PII detection, jailbreak detection, or safety classification.
- Autonomous agent execution.
- Committed account IDs, role ARNs, backend names, model access screenshots, raw responses, credentials, or live endpoint details.

## Proposed Sub-Slices

| Slice | Focus | Evidence |
| --- | --- | --- |
| P8a: Bedrock access readiness | Confirm the region, model access, budget, IAM boundary, and manual approval model. | Design checklist and no-live-call readiness notes. |
| P8b: Terraform-managed IAM boundary | Add a small Bedrock sandbox Terraform stack for least-privilege permissions and optional logging/cost tags. | Terraform validate/plan evidence, no model invocation. |
| P8b.1: IAM apply readiness | Verify protected environment values, scoped Terraform execution permissions, reviewed plan, owners, evidence, and stop conditions before any apply workflow is introduced. | Public-safe review checklist; no apply and no model invocation. |
| P8b.2: Confirmed IAM apply | Add an exact confirmation-gated, environment-approved apply mode to the existing Bedrock Terraform workflow. | Sanitized IAM apply evidence; no model invocation or destroy mode. |
| P8c: Synthetic Bedrock smoke test | Run one tiny prompt from GitHub Actions using OIDC and synthetic content only. | Sanitized success/failure evidence, token/cost metadata where available. |
| P8d: Gateway adapter boundary | Connect the real Bedrock client shape to the existing GenAI Gateway interface without making live calls the default. | Adapter design, mock default preserved, tests. |
| P8e: Bedrock Guardrails mapping | Map existing Guardrails as a Service contracts to Bedrock Guardrails concepts. | Static schema, synthetic mapping example, contract test, and documentation; no provider resource or call. |
| P8f: Guarded Converse smoke boundary | Create one small Guardrail/version and prove one synthetic `Converse` request attaches it through a separate OIDC role. | Terraform/IAM/workflow tests, then separately reviewed manual apply and guarded-smoke evidence. |

## Target Architecture

```text
workflow_dispatch
  -> aws-sandbox environment approval
  -> GitHub Actions OIDC
  -> AWS sandbox role
  -> Terraform-managed Bedrock IAM boundary
  -> optional synthetic smoke-test script
  -> Amazon Bedrock Runtime
  -> sanitized evidence summary
```

The existing GenAI / LLM Gateway remains the architectural boundary:

```text
Application
  -> GenAI / LLM Gateway contract
  -> Provider adapter
  -> Amazon Bedrock
```

Mock mode remains the default. A real Bedrock call should be opt-in through a manual workflow or explicit local sandbox command.

## Terraform Boundary

Terraform should manage infrastructure and configuration, not semantic AI evaluation.

Good Terraform-managed resources for P8:

- IAM role or policy additions for Bedrock invocation.
- Optional CloudWatch log group for future provider-adapter evidence.
- Optional S3 or DynamoDB metadata resource only if needed for synthetic evidence.
- Cost allocation tags.
- Future Guardrail policy and evaluation extensions beyond the current narrow synthetic boundary.

Terraform should not:

- run prompts;
- store prompt text;
- evaluate model quality;
- persist raw responses;
- create long-lived runtime services for this first slice.

Suggested future stack key:

```text
cloudai-platform/bedrock-sandbox/terraform.tfstate
```

This keeps Bedrock state separate from the previous EKS sandbox state while reusing the same backend and lock-table pattern.

## Smoke Test Boundary

The first real Bedrock smoke test should use a tiny synthetic prompt, for example:

```text
Return the word "ok" in JSON as {"status":"ok"}.
```

The test should verify only basic provider access:

- the workflow can assume the approved AWS role;
- the selected model can be invoked in the approved region;
- the response is received;
- token, latency, request ID, and cost metadata are summarized where available;
- no sensitive prompt or response content is committed.

The smoke test should not prove model quality, reasoning ability, jailbreak resistance, RAG correctness, or production readiness.

## IAM And Access Design

The first IAM boundary should be narrow:

- allow only required Bedrock runtime actions;
- restrict to the approved region where practical;
- restrict to selected model ARNs or model identifiers where practical;
- keep broader Bedrock administration out of the smoke-test role;
- avoid long-lived AWS access keys;
- use GitHub Actions OIDC and the existing `aws-sandbox` environment gate.

The implementation should document any AWS-managed-model limitations that prevent exact resource scoping.

## Evidence Rules

Public evidence may include:

- workflow mode;
- region label if already public in the project;
- model family label if it does not expose private entitlement details;
- result category, such as `smoke-test-passed`;
- request/trace identifier if sanitized;
- token count or estimated cost summary where available;
- confirmation that prompt content was synthetic;
- confirmation that no raw prompt/response was committed.

Public evidence must not include:

- account IDs;
- role ARNs;
- access keys or session tokens;
- raw provider request or response bodies;
- model access screenshots with private account details;
- backend bucket names or lock-table names;
- CloudWatch log links with account-specific values;
- personal, internal, customer, confidential, or production data.

## Failure Handling

Expected failure modes:

- model access not enabled;
- unsupported region or model;
- IAM permission denied;
- quota or account restriction;
- unexpected model response shape;
- workflow environment value missing;
- provider SDK version mismatch.

The workflow should fail closed. It should report a sanitized reason and avoid retry loops that might increase cost.

## Relationship To Existing Controls

P8 does not replace the mock controls. It extends them:

- P1 GenAI Gateway defines the request/response and provider abstraction shape.
- P2 platform controls define policy, token, and safety metadata patterns.
- Guardrails as a Service remains synthetic until a real guardrail integration is explicitly designed.
- P4 proved the real cloud delivery discipline.
- P6 AgentOps remains mock-only and separate from Bedrock provider access.

## Bedrock Guardrails Boundary

P8e completes the first guardrails slice as a concept map after the basic
Bedrock access boundary was proven. It deliberately maps concepts rather than
overclaiming real safety:

```text
Guardrails as a Service contract
  -> allow / redact / deny / approval-required verdicts
  -> static Bedrock Guardrails concept map
  -> metadata-only contract evidence
```

P8e does not inspect real sensitive content or claim production-grade safety
classification. P8f is the deliberately narrow next step: a Terraform-managed
Guardrail with Prompt Attack filtering, one standard sensitive-information
entity, an explicit version, and a separate role that can invoke approved
models only when it supplies that Guardrail identifier. The one guarded
synthetic `Converse` call uses trace-disabled configuration and sanitized
evidence. It proves attachment and the access boundary—not filter quality,
real PII detection, jailbreak resistance, or production policy suitability.

P8f and P8g are live validated through separately reviewed Terraform, protected
environment configuration, and explicit manual dispatch. Their evidence remains
limited to the configured Guardrail attachment and three synthetic direct
evaluation outcomes; it is not a production safety claim.

## AgentCore Boundary

P8h now provides a documentation-only, gateway-first readiness reference for a
future read-only knowledge lookup: [P8h AgentCore Knowledge-Lookup
Readiness](p8h-agentcore-knowledge-lookup-readiness.md).

AgentCore introduces runtime concerns such as agent identity, tools, memory,
gateway, observability, evaluation, and operation lifecycle. P8h defines the
required controls and stop gates without creating an AgentCore resource, call,
Terraform, IAM policy, container, knowledge source, or runtime.

## Completed Progression and Next Boundary

P8a through P8g establish a governed model-access path: readiness,
least-privilege IAM, confirmed apply, a single synthetic smoke test, an opt-in
adapter, a static Guardrails concept map, a separately governed Guardrail
attachment boundary, and a narrow direct Guardrail evaluation. P8h is the next
separate extension: a gateway-first AgentCore readiness reference that maps
runtime identity, knowledge scope, Guardrails, observability, FinOps, and
lifecycle stop gates without adding a provider runtime.

## Interview / CTO Story

```text
After validating the EKS GitOps release foundation, I designed the next real-cloud slice as a bounded Bedrock sandbox. The goal is not to build a chatbot, but to prove governed model access through short-lived identity, least-privilege IAM, manual approval, synthetic prompts, budget controls, and sanitized evidence. This connects the existing GenAI Gateway contract to real provider access without weakening the project safety boundary.
```
