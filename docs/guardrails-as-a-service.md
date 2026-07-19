# Guardrails as a Service

Guardrails as a Service, or GaaS, is a shared platform-control pattern for returning safety and review verdicts before model, RAG, agent, or delivery flows continue.

In this repository, GaaS is intentionally mock-only and metadata-only. It does not inspect real prompts, scan documents, detect real personal information, call a moderation provider, execute tools, or enforce policy outside the local mock API.

## Purpose

GaaS provides a small reusable contract for:

- synthetic PII or sensitive-data signals
- synthetic jailbreak and prompt-injection signals
- synthetic high-risk action signals
- allow, redact, deny, and approval-required verdicts
- audit metadata that can be correlated with gateway, RAG, AgentOps, and eval evidence

The value is the platform shape: one shared policy verdict contract that different AI surfaces can call before continuing.

## Mock API

`POST /guardrails/assess` accepts synthetic metadata only.

```json
{
  "requestId": "guardrail_req_0001",
  "policyProfile": "guardrails-demo",
  "surface": "model-gateway",
  "syntheticSignals": ["none"]
}
```

Example response:

```json
{
  "requestId": "guardrail_req_0001",
  "verdict": "allow",
  "reasonCode": "no_synthetic_risk_signal",
  "policyProfile": "guardrails-demo",
  "audit": {
    "traceId": "trace_guardrail_req_0001",
    "recordedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

The request contract rejects raw `content`, `prompt`, tool payloads, credentials, and any unknown fields.

## Decision Order

The local policy is deterministic:

1. `prompt-injection` or `jailbreak-attempt` returns `deny`.
2. `pii-detected` returns `redact`.
3. `high-risk-action` returns `approval-required`.
4. `none` returns `allow`.

This is not a production safety classifier. It is a synthetic-only contract example for how a platform control could represent a safety verdict.

## Bedrock Guardrails Concept Mapping

P8e adds a static concept map between the existing synthetic outcomes and
Amazon Bedrock Guardrails terminology. The map is documentation and contract
evidence only: it does not configure a Bedrock Guardrail, call an AWS API, or
inspect raw content.

| GaaS outcome | Bedrock concept | Boundary |
| --- | --- | --- |
| `deny` for `prompt-injection` or `jailbreak-attempt` | Content filter: Prompt Attack | Conceptual pre-model input placement only. |
| `redact` for `pii-detected` | Sensitive information filter | Conceptual input/output mask or block placement only. |
| `approval-required` for `high-risk-action` | External human approval control | Not a Bedrock Guardrails equivalence. |
| `allow` for `none` | No intervention inferred | Not evidence that real content is safe. |

The following Bedrock concepts are intentionally not represented by the local
mock contract:

| Deferred concept | Why it is deferred |
| --- | --- |
| Denied topics | No application-specific topic policy is defined. |
| Word filters | No approved blocked-word list is defined. |
| Contextual grounding checks | No source, query, response, or retrieval runtime exists for grounding evaluation. |
| Provider traces | P8e makes no provider call and retains no provider intervention evidence. |

A future gateway could place real controls before a model request, after a
model response, and before an agent or tool action. P8e adds none of those
runtime paths. Human approval and action authorization remain external workflow
controls, even if a future model or provider policy is also used.

## Relationship To Other Controls

GaaS is different from the existing token budget guardrail. Token budget checks constrain prompt size and estimated cost. GaaS represents policy and safety verdicts from synthetic risk signals.

GaaS can be reused by:

- GenAI / LLM Gateway flows before a model request proceeds.
- Governed RAG flows before retrieval evidence is returned.
- AgentOps flows before a tool action is authorised.
- AI-assisted delivery flows before a generated change moves through review.

## Public-Safe Boundaries

This implementation deliberately avoids:

- real PII detection
- real jailbreak or prompt-injection classification
- model moderation APIs
- provider integrations
- raw prompt or document handling
- persistent audit storage
- runtime enforcement outside the mock API

Those are future enterprise concerns that require approved data handling, provider review, security review, observability design, retention rules, and operating procedures.

## Evidence

Contracts and fixtures live under:

- `shared/schemas/guardrails-as-a-service/`
- `shared/examples/guardrails-as-a-service/`

The static Bedrock concept mapping is:

- `shared/schemas/guardrails-as-a-service/bedrock-guardrails-mapping.schema.json`
- `shared/examples/guardrails-as-a-service/bedrock-guardrails-mapping.mock.json`

The local API route and deterministic policy live under:

- `providers/aws/app/api/src/routes/guardrailAssessment.ts`
- `providers/aws/app/api/src/lib/guardrailPolicy.ts`

The mock eval report includes `guardrails-as-a-service-contract` as a tested evidence case.

P8e evidence may include only synthetic correlation metadata, a local policy
profile, deterministic local reason code, local trace correlation identifier,
mapping version, and contract-test result. It must not include raw content,
provider traces, provider identifiers, account identifiers, ARNs, model
identifiers, or a provider-enforcement claim.
