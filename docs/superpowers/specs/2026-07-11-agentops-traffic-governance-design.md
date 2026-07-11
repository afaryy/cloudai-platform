# P6a AgentOps / AI Traffic Governance Design

## Goal

Add a deterministic, mock-only runtime governance decision to the existing CloudAI mock API. The slice demonstrates how an approved agent session can request a tool action and receive `allow`, `deny`, `approval-required`, or `paused` with traceable policy, approval, audit, and budget evidence.

## Scope

This is P6a: Runtime AgentOps / AI Traffic Governance. It does not implement P6b Capability Governance or P6c RAG Knowledge Lifecycle.

The implementation adds:

- five JSON Schema contracts under `shared/schemas/agentops-governance/`;
- four synthetic fixture scenarios under `shared/examples/agentops-governance/`;
- a deterministic `POST /agent-actions/authorize` endpoint;
- route, schema, fixture, and evaluation tests;
- API and architecture documentation.

## Non-Goals

The slice must not add:

- agent runtime, agent loop, tool executor, shell access, or workflow engine;
- model, provider, cloud, MCP, API, or external-network calls;
- credentials, secrets, account identifiers, billing integration, or cloud deployment;
- prompt, tool-input payload, raw business data, or sensitive-data logging;
- capability registry, signature, scan, or admission implementation;
- actual RAG source ingestion or lifecycle enforcement.

## Existing Pattern

The existing API exposes deterministic mock routes through `createMockApiServer`, route handlers under `providers/aws/app/api/src/routes/`, JSON schemas under `shared/schemas/`, and synthetic fixtures under `shared/examples/`. It uses `HttpError` for invalid requests, emits metadata-only request logs, and tests routes through a local HTTP server.

P6a follows that pattern. The endpoint produces a decision record; it does not execute the requested action.

## API Contract

### Endpoint

`POST /agent-actions/authorize`

### Request Shape

```json
{
  "requestId": "agent_req_demo_0001",
  "session": {
    "sessionId": "agent_session_demo_0001",
    "agentId": "demo-knowledge-agent",
    "owner": "platform-demo-owner",
    "delegatedUser": "synthetic-user",
    "riskTier": "standard",
    "status": "active"
  },
  "action": {
    "toolId": "knowledge-search",
    "actionClass": "read",
    "leastPrivilegeScope": "synthetic-public-knowledge"
  },
  "governance": {
    "policyProfile": "agentops-demo-governed",
    "approvalId": null,
    "budgetLimit": 10,
    "budgetConsumed": 2
  }
}
```

The request intentionally carries identifiers and classifications only. It never carries a tool payload, prompt, credential, URL, or real data.

### Response Shape

```json
{
  "requestId": "agent_req_demo_0001",
  "decision": {
    "verdict": "allow",
    "reasonCode": "read_only_action_allowed",
    "policyId": "agentops-demo-governed"
  },
  "approval": {
    "required": false,
    "approvalId": null
  },
  "runtimeControl": {
    "state": "active",
    "budgetLimit": 10,
    "budgetConsumed": 2,
    "remainingBudget": 8
  },
  "audit": {
    "traceId": "trace_agent_req_demo_0001",
    "eventId": "audit_agent_req_demo_0001",
    "recordedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

The response is a synthetic authorisation decision. A verdict never invokes a tool or changes external state.

## Deterministic Decision Rules

Rules apply in this order:

1. If session status is `paused` or `terminated`, return `paused`.
2. If `budgetConsumed` is greater than or equal to `budgetLimit`, return `deny` with `budget_limit_exceeded` and a paused runtime control state.
3. If tool ID is not in the local allow-list, return `deny` with `tool_not_allowed`.
4. If action class is `write` or `high-impact` and no approval ID is provided, return `approval-required` with `human_approval_required`.
5. If action class is `write` or `high-impact` and a matching synthetic approval ID is provided, return `allow` with `approved_high_impact_action`.
6. A `read` action from an active session with an allowed tool and remaining budget returns `allow` with `read_only_action_allowed`.

The local allow-list contains only synthetic tool IDs and does not describe an executable integration.

## Contracts

Create the following schemas:

| Schema | Purpose |
|---|---|
| `agent-session.schema.json` | Identity, owner, delegated user, risk tier, and session state. |
| `tool-authorisation-request.schema.json` | Requested synthetic tool action, policy profile, approval reference, and budget inputs. |
| `tool-authorisation-decision.schema.json` | Verdict, policy evidence, approval requirement, runtime control, and audit metadata. |
| `human-approval-decision.schema.json` | Synthetic approval identifier, action fingerprint, role, decision, and expiry. |
| `agent-action-audit-event.schema.json` | Metadata-only trace and decision evidence without prompt or payload fields. |

Use JSON Schema draft 2020-12, `additionalProperties: false`, and existing `synthetic-public` conventions where classification is needed.

## Fixtures

Create four fixtures:

| Fixture | Expected Verdict | Why |
|---|---|---|
| `agent-action.allowed-read.json` | `allow` | Active session, approved synthetic read tool, remaining budget. |
| `agent-action.approval-required.json` | `approval-required` | High-impact action has no approval reference. |
| `agent-action.denied-tool.json` | `deny` | Tool is outside the local synthetic allow-list. |
| `agent-action.paused-budget.json` | `deny` with paused runtime state | Budget is exhausted, so no action can proceed. |

Fixtures must use only synthetic identifiers and URLs from `example.com` if a URL is required.

## Errors

Malformed requests return existing `HttpError` responses:

- `400 empty_body` for an empty body;
- `400 invalid_json` for malformed JSON;
- `400 invalid_agent_action_request` for missing, extra, or wrongly typed contract fields.

Policy outcomes such as denial, approval-required, and pause are valid `200` decision responses. They are not transport errors.

## Observability and Audit Boundary

The route request logger continues to emit only method, route, status, duration, request identifier, timestamp, and error code where applicable.

The AgentOps audit contract records only:

- request, session, agent, trace, and event identifiers;
- tool ID and action class;
- policy ID, verdict, reason code, approval reference, runtime state, and budget values;
- synthetic timestamp.

It must not include prompt text, request body, tool input, tool output, credentials, URLs, or any raw data.

## Tests

Add focused tests that prove:

1. each fixture matches the documented schema;
2. active read-only request returns `allow` with audit and budget evidence;
3. high-impact request without approval returns `approval-required` and does not execute anything;
4. unsupported tool returns `deny` with policy and audit metadata;
5. exhausted budget returns a paused state and no allow verdict;
6. paused session cannot return `allow` even for a read-only request;
7. invalid top-level properties return `400 invalid_agent_action_request`;
8. serialized route and audit evidence omit prompt-like, payload, credential, and tool-output fields;
9. mock gateway evaluation report includes a P6a AgentOps evidence case.

The full existing API suite must continue to pass.

## Documentation

Update:

- `providers/aws/app/api/README.md` with endpoint usage and explicit no-execution boundary;
- `docs/ai-traffic-governance.md` with P6a as a mock decision layer, not a runtime gateway;
- the project demo or walkthrough only if the endpoint is already part of the supported local demo path.

## Acceptance Criteria

- The endpoint returns deterministic governance decisions for the four fixture scenarios.
- All response and fixture evidence is synthetic and metadata-only.
- No code path makes model, tool, provider, network, or cloud calls.
- No route logs request bodies or sensitive-like fields.
- Existing and new tests pass.
- The public documentation makes P6a's boundary unambiguous.
