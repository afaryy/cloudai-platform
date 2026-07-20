# P8h AgentCore Knowledge-Lookup Readiness Design

## Purpose

P8h defines a public-safe, gateway-first reference architecture for one future
AgentCore capability: a read-only knowledge lookup. It follows the
live-validated P8f Guardrail-attached `Converse` boundary and P8g direct
Guardrail evaluation, but it does not deploy or call AgentCore.

The purpose is to show how an enterprise agent capability would compose the
repository's existing cloud, governance, Guardrail, AgentOps, RAG-lifecycle,
observability, and FinOps controls before any runtime is allowed to exist.

## Scope

P8h adds:

1. One architecture and control document for a future synthetic read-only
   knowledge-lookup capability.
2. A mapping between future AgentCore responsibilities and existing portfolio
   evidence from P1, P3, P6, P8f, and P8g.
3. Explicit ownership, identity, authorization, Guardrail, knowledge,
   observability, cost, and operational stop gates.
4. Public portfolio wording that distinguishes reference architecture from an
   implemented AgentCore runtime.

## Non-goals

P8h must not:

- create an AgentCore Runtime, Gateway, Memory, Identity, Browser, built-in
  tool, Policy, or any other AgentCore resource;
- create Terraform, IAM, containers, ECR images, application code, CI/CD
  workflow, log destination, budget, or cloud runtime;
- invoke AgentCore, Bedrock, a model, a Guardrail, retrieval service, API, or
  tool;
- add memory, write access, browser use, code execution, external outbound
  access, autonomous action, customer data, internal data, or real knowledge
  sources;
- claim provider validation, production readiness, private networking,
  successful retrieval, model quality, or AgentCore experience in production.

## Reference Architecture

The future capability has one required entry point:

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

The Gateway is the control point. A later implementation must prevent clients
from bypassing it to invoke the runtime directly. The future runtime has a
workload identity and a named human owner. It may return an answer or an
explicit inability-to-answer result; it must not act on enterprise systems.

## Control and Evidence Mapping

| Future control | P8h reference responsibility | Existing portfolio evidence | Deferred external control |
| --- | --- | --- | --- |
| Request boundary | Gateway is the sole approved entry point. | P1 governed gateway patterns. | AgentCore Gateway resource and bypass-prevention policy. |
| Owner and authorisation | Named human owner; request is allowed, denied, or approval-required before runtime. | P6a AgentOps decision contract. | Runtime identity configuration and production access review. |
| Knowledge scope | Read only approved, classified, lifecycle-managed knowledge. | P3 governed RAG and P6c knowledge lifecycle. | Retrieval store, source onboarding, and data-access policy. |
| Guardrails | Apply provider Guardrails at the Gateway/model path; retain only metadata-safe evidence. | P8f guarded `Converse` smoke and P8g three-case direct evaluation. | AgentCore Gateway policy configuration and broader safety evaluation. |
| Observability | Record metadata needed for ownership, latency, failures, and evidence. | P6f security and operations controls. | CloudWatch/ADOT setup, log destination, retention, and redaction policy. |
| Cost and operations | Define request/session limits, owner, incident path, and disable mechanism. | P1/P2 token-budget patterns and P6f FinOps controls. | AgentCore pricing model, budgets, alarms, and operational runbook. |

P8h treats the listed portfolio items as separate evidence. It does not claim
that they are already integrated with AgentCore.

## Required Stop Gates Before Any Runtime Work

Before an AgentCore implementation can begin, an approved follow-on design
must identify:

1. supported region and service availability;
2. runtime protocol, deployment artifact, and execution model;
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
9. separate Terraform/IAM/apply/teardown plan with manual approvals.

If any gate is unknown, P8h stops at design. It must not use a generic runtime,
copy an unreviewed agent example, or widen an existing Bedrock role.

## Portfolio Boundary

P8h demonstrates architecture judgment: an agent is a governed workload, not
an autonomous chatbot. It explains how gateway enforcement, non-human
identity, approved knowledge, Guardrails, observability, FinOps, and named
accountability would fit together.

P8h does not demonstrate a deployed AgentCore agent, a working retrieval
system, production data access, autonomous tool use, or operational service
experience. It is a reference design for a later, separately approved POC.

## Verification

Verification is limited to documentation-quality checks: Markdown links,
existing repository checks, accurate mapping references, public-safe wording,
and no new cloud or application surface. No AWS request is permitted.

## Sources

- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-vs-runtime.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-http-runtime.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html
