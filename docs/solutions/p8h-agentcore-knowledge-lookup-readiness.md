# P8h AgentCore Knowledge-Lookup Readiness

## Purpose and Boundary

P8h is a gateway-first reference architecture for a future, read-only
knowledge-lookup capability using Amazon Bedrock AgentCore. It is a design
artifact, not an AgentCore deployment or a chatbot implementation.

It composes existing CloudAI Platform evidence into one future operating model:
governed entry, non-human identity, approved knowledge scope, Guardrails,
metadata-only observability, cost accountability, and a named human owner.

P8h creates no AgentCore resource, Bedrock call, Terraform, IAM policy,
container, workflow, retrieval source, or cloud runtime.

## Future Capability

The future capability answers questions from an approved knowledge boundary.
It may return an answer with approved supporting evidence or an explicit
inability-to-answer result. It must not write to enterprise systems, act on a
user's behalf, or make external calls.

The initial capability is deliberately limited to synthetic, read-only
knowledge lookup:

- no tools or action APIs;
- no memory or durable conversation state;
- no browser, code execution, or outbound third-party access;
- no customer, employer, internal, confidential, or production data;
- no autonomous remediation, approval, or deployment action.

## Gateway-First Reference Architecture

```text
Approved user or client
        ↓
AgentCore Gateway
  identity + authorization + Guardrail + metadata-only telemetry
        ↓
Future AgentCore Runtime
  read-only orchestration; no tools, memory, writes, browser, or outbound access
        ↓
Approved knowledge boundary
  separately approved retrieval source and classification policy
```

The Gateway is the required future entry point. A later implementation must
technically prevent callers from bypassing the Gateway to invoke the runtime
directly. The future runtime has one workload identity, least-privilege access,
an explicit disable path, and a named human owner accountable for its purpose,
quality, cost, and operational response.

## Control and Evidence Map

| Future control | P8h reference responsibility | Existing portfolio evidence | Deferred external control |
| --- | --- | --- | --- |
| Request boundary | The Gateway is the sole approved entry point. | [P1 GenAI / LLM Gateway](./genai-llm-gateway.md) | AgentCore Gateway resource and runtime-bypass-prevention policy. |
| Owner and authorisation | A named owner approves a request outcome before runtime execution. | [P6 AI Traffic Governance](../practices/ai-traffic-governance.md) | Runtime identity configuration and production access review. |
| Knowledge scope | Read only approved, classified, lifecycle-managed knowledge. | [RAG knowledge lifecycle](./rag-knowledge-lifecycle.md) | Retrieval store, source onboarding, and data-access policy. |
| Guardrails | Apply provider Guardrails at the Gateway/model path and retain metadata-safe evidence only. | [Guardrails as a Service](./guardrails-as-a-service.md), P8f attachment and P8g evaluation in the [Bedrock sandbox design](./p8-real-bedrock-sandbox-design.md) | AgentCore Gateway policy configuration and broader safety evaluation. |
| Observability | Retain only metadata needed for ownership, latency, failure, and evidence. | [AI Platform Security and Operations Controls](../practices/ai-platform-security-operations-controls.md) | CloudWatch/ADOT setup, log destination, retention, and redaction policy. |
| Cost and operations | Define request/session limits, owner, incident path, and disable mechanism. | [AI Platform Security and Operations Controls](../practices/ai-platform-security-operations-controls.md) | AgentCore pricing model, budgets, alarms, and operational runbook. |

These are separate evidence sources. P8h does not claim they are already
integrated with AgentCore.

The [P8i local synthetic contract pack](p8i-agentcore-synthetic-contract-pack.md)
adds fail-closed metadata contracts for the same future admission and closure
expectations. It remains local evidence only: it does not add AgentCore
integration, a live runtime, or a replacement for the stop gates below.

## Required Stop Gates Before Runtime Work

Any real AgentCore POC requires a separately reviewed design that identifies:

1. supported region and service availability;
2. runtime protocol, deployment artifact, model boundary, and execution model;
3. approved knowledge source, data classification, lifecycle owner, and
   retrieval boundary;
4. Gateway authorization model and a technical restriction preventing runtime
   bypass;
5. workload identity, named owner, least-privilege scope, and emergency
   disable path;
6. Guardrail policy, evaluation dataset, and evidence-retention boundary;
7. telemetry fields, log destination, retention, redaction, alerting, and
   incident response policy;
8. request/session cost limits, budgets, chargeback owner, and service quota;
9. a separate Terraform, IAM, apply, and teardown plan with manual approvals.

If any gate is unknown, work stops at design. Do not copy an unreviewed agent
example, widen an existing Bedrock role, or create a generic runtime merely to
demonstrate a service.

## What This Demonstrates

P8h demonstrates Cloud & AI Platform Engineering judgment: an agent is a
governed workload rather than an autonomous chatbot. Its design connects
gateway enforcement, workload identity, approved knowledge, Guardrails,
observability, FinOps, and human accountability before a runtime is allowed to
operate.

## What This Does Not Claim

P8h does not demonstrate a deployed AgentCore agent, a working retrieval
system, production data access, autonomous tool use, provider validation, or
operational AgentCore service experience. It is a reference architecture for a
later, separately approved POC.

## Sources

- [AgentCore Runtime and harness](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-vs-runtime.html)
- [AgentCore Gateway Runtime targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-http-runtime.html)
- [Inbound and outbound authorization](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html)
- [AgentCore observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)
- [AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html)
