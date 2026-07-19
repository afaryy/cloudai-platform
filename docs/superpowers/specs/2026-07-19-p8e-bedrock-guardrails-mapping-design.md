# P8e Bedrock Guardrails Mapping Design

## Purpose

P8e documents and tests a conceptual mapping between the repository's existing
metadata-only Guardrails as a Service (GaaS) contract and Amazon Bedrock
Guardrails concepts. It makes the boundary reviewable without representing the
local mock as a configured, evaluated, or enforced provider control.

## Scope

P8e adds four small, provider-neutral assets:

1. A JSON Schema for a static Bedrock Guardrails mapping artifact.
2. A synthetic mapping example using the existing GaaS signals, verdicts, and
   reason codes.
3. A contract test that validates the mapping against the schema and verifies
   its safety-boundary statements.
4. Documentation updates describing placement, evidence, coverage, and
   deferrals.

## Non-goals

P8e must not:

- create an Amazon Bedrock Guardrail resource or version;
- change Terraform, CloudFormation, GitHub environments, IAM, or OIDC;
- invoke a model, `ApplyGuardrail`, or any other AWS API;
- accept, store, log, or evaluate raw prompts, responses, documents, tool
  payloads, credentials, or personal information;
- claim that a synthetic `allow` verdict means real content is safe;
- implement AgentCore, a RAG runtime, provider tracing, persistent audit
  storage, or a gateway enforcement path.

## Architecture

The existing `POST /guardrails/assess` route remains unchanged. It receives
only synthetic metadata and returns one deterministic GaaS verdict. The new
mapping artifact is not consumed at runtime. It is a static portfolio contract
that explains how a future approved provider implementation could be designed.

```text
Existing synthetic GaaS request
  -> deterministic local verdict
  -> static P8e mapping artifact
  -> Bedrock Guardrails concept or explicit external/deferred control
```

The mapping artifact must include a top-level declaration that it is
conceptual, metadata-only, non-live, and does not configure a provider
resource. It must not contain a guardrail identifier, version, ARN, account
identifier, model identifier, raw-content sample, or provider response.

## Mapping Rules

| Existing signal and verdict | Bedrock concept | Placement and interpretation |
|---|---|---|
| `prompt-injection` or `jailbreak-attempt` -> `deny` | Content filter, including Prompt Attack | A future gateway could evaluate input before model invocation. P8e neither configures nor evaluates this filter. |
| `pii-detected` -> `redact` | Sensitive information filter | A future provider policy could mask or block sensitive information on input or output. P8e does not detect PII. |
| `high-risk-action` -> `approval-required` | External workflow control | Human approval and action authorization remain outside Bedrock Guardrails; no direct filter equivalence is claimed. |
| `none` -> `allow` | No intervention inferred | This only means the synthetic metadata contains no declared risk signal; it is not a safety assessment. |

The mapping must also list important provider concepts that the current GaaS
contract does not represent:

- denied topics: no application-specific topic policy is defined;
- word filters: no approved blocked-word list is defined;
- contextual grounding checks: no source, query, response, RAG runtime, or
  grounding evaluation exists;
- provider evaluation traces and interventions: no provider call is made.

## Gateway and Evidence Placement

The documentation will describe the intended future control positions without
adding runtime behavior:

1. Before model invocation: input policy assessment.
2. After model response: output policy assessment.
3. Before agent or tool action: human approval and authorization control.

Current P8e evidence is limited to the synthetic request identifier, local
policy profile, deterministic reason code, local trace correlation identifier,
mapping version, and the contract-test result. It must not include provider
traces, prompts, responses, or account-specific values.

## Files

| File | Responsibility |
|---|---|
| `shared/schemas/guardrails-as-a-service/bedrock-guardrails-mapping.schema.json` | Defines the static mapping artifact and its explicit boundaries. |
| `shared/examples/guardrails-as-a-service/bedrock-guardrails-mapping.mock.json` | Demonstrates the four existing GaaS outcomes and deferred provider concepts using synthetic metadata only. |
| `providers/aws/app/api/tests/guardrailsContracts.test.ts` | Validates the new artifact and prevents a mapping from claiming a live provider integration. |
| `docs/guardrails-as-a-service.md` | Explains the provider concept map, future placement, evidence boundary, and non-equivalences. |
| `docs/p8-real-bedrock-sandbox-design.md`, `docs/current-status.md`, and `README.md` | Records P8e as a completed documentation-and-contract slice once implemented. |

## Testing and Acceptance Criteria

The existing API test command must pass with no AWS credentials and no network
access. The new test must prove that:

- the mapping example satisfies its schema;
- all four existing GaaS outcomes are represented;
- prompt injection, PII, high-risk approval, and no-signal behavior preserve
  their existing intent;
- denied topics, word filters, contextual grounding, and provider traces are
  explicitly deferred when no local control represents them;
- the artifact states that it has no live provider configuration, model call,
  raw content, or provider-enforcement claim.

## Sources

Terminology is based on the Amazon Bedrock Guardrails documentation:

- https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html

## Follow-on Boundary

Any later real Guardrails slice requires a separate reviewed design for approved
policy content, IAM, Terraform/provider support, evaluation data, data handling,
cost controls, audit retention, operational ownership, and sanitized evidence.
AgentCore remains a separate later decision because it adds runtime identity,
tool access, lifecycle, observability, and agent execution scope.
