# P6a AgentOps / AI Traffic Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic mock AgentOps decision endpoint that returns evidence for allowed, denied, approval-required, and paused agent actions without executing a tool or calling a provider.

**Architecture:** The endpoint validates a metadata-only agent action request, applies ordered local policy rules, and returns a typed decision record with approval, budget, and audit evidence. Five JSON schemas and four synthetic fixtures document the control contracts; route, contract, evaluation, and documentation changes keep the API demo coherent.

**Tech Stack:** TypeScript, Node.js built-in HTTP server and test runner, JSON Schema draft 2020-12, pnpm.

## Global Constraints

- Keep all P6a inputs, outputs, fixtures, and tests synthetic and metadata-only.
- Do not add an agent runtime, tool executor, model/provider call, external network call, cloud deployment, credential, secret, or sensitive-data path.
- The endpoint makes a decision only; it never invokes the requested tool.
- Policy outcomes use HTTP `200`; malformed contracts use existing `HttpError` `400` responses.
- Existing request logs must not capture request bodies, prompts, tool inputs, tool outputs, URLs, credentials, or raw data.
- Run API tests with `PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test`; localhost route tests require the approved unsandboxed command.

---

## File Structure

### Create

- `shared/schemas/agentops-governance/agent-session.schema.json`: agent session identity and state contract.
- `shared/schemas/agentops-governance/tool-authorisation-request.schema.json`: metadata-only authorisation request contract.
- `shared/schemas/agentops-governance/tool-authorisation-decision.schema.json`: endpoint decision response contract.
- `shared/schemas/agentops-governance/human-approval.schema.json`: standalone synthetic approval-evidence contract.
- `shared/schemas/agentops-governance/agent-action-audit-event.schema.json`: metadata-only audit-evidence contract.
- `shared/examples/agentops-governance/agent-action.allowed-read.json`: allowed read fixture.
- `shared/examples/agentops-governance/agent-action.approval-required.json`: high-impact action without approval fixture.
- `shared/examples/agentops-governance/agent-action.denied-tool.json`: disallowed tool fixture.
- `shared/examples/agentops-governance/agent-action.paused-budget.json`: exhausted-budget fixture.
- `providers/aws/app/api/src/lib/agentOpsPolicy.ts`: deterministic local decision engine.
- `providers/aws/app/api/src/routes/agentActionAuthorisation.ts`: validation-to-decision route handler.
- `providers/aws/app/api/tests/agentOpsContracts.test.ts`: schema and fixture coverage.
- `providers/aws/app/api/tests/agentActionAuthorisation.test.ts`: HTTP route behavior coverage.

### Modify

- `providers/aws/app/api/src/types.ts`: add request, decision, approval, runtime-control, and audit types.
- `providers/aws/app/api/src/lib/validation.ts`: add strict AgentOps request normalisation.
- `providers/aws/app/api/src/server.ts`: route `POST /agent-actions/authorize` and write metadata-only request log.
- `providers/aws/app/api/src/evals/mockGatewayEvals.ts`: add P6a decision evidence to the local eval report.
- `shared/examples/mock-genai-api/eval-result.mock.json`: update report totals and add the P6a eval record.
- `providers/aws/app/api/tests/mockGatewayEvals.test.ts`: assert the new P6a eval result.
- `providers/aws/app/api/README.md`: document endpoint, fixtures, and no-execution boundary.
- `docs/ai-traffic-governance.md`: mark P6a as a deterministic mock decision layer.
- `docs/demo-script.md`: add a local P6a endpoint demonstration after governed RAG.

## Task 1: Define AgentOps Contracts and Synthetic Fixtures

**Files:**
- Create: the five schemas and four fixture files listed above.
- Test: `providers/aws/app/api/tests/agentOpsContracts.test.ts`.

**Interfaces:**
- Produces a request contract with required `requestId`, `session`, `action`, and `governance` fields.
- Produces a response contract with required `requestId`, `decision`, `approval`, `runtimeControl`, and `audit` fields.
- Uses `verdict` values `allow`, `deny`, `approval-required`, and `paused`.

- [x] **Step 1: Write failing schema and fixture tests**

Create `agentOpsContracts.test.ts` with the same recursive JSON Schema assertion style used by `ragGovernanceContracts.test.ts`. Test that all four fixtures match the request schema and assert their expected session/action combinations:

```ts
test("AgentOps fixtures match the request contract", async () => {
  const schema = await readJson("tool-authorisation-request.schema.json", SCHEMA_DIR);
  const fixtures = await Promise.all([
    readJson("agent-action.allowed-read.json", EXAMPLE_DIR),
    readJson("agent-action.approval-required.json", EXAMPLE_DIR),
    readJson("agent-action.denied-tool.json", EXAMPLE_DIR),
    readJson("agent-action.paused-budget.json", EXAMPLE_DIR)
  ]);

  for (const fixture of fixtures) assertMatchesSchema(fixture, schema);
  assert.equal(fixtures[0].action.actionClass, "read");
  assert.equal(fixtures[1].action.actionClass, "high-impact");
  assert.equal(fixtures[2].action.toolId, "unapproved-tool");
  assert.equal(fixtures[3].governance.budgetConsumed, fixtures[3].governance.budgetLimit);
});
```

Add a negative assertion that a request containing `toolInput` is rejected by the schema because `additionalProperties` is false.

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- --test-name-pattern="AgentOps fixtures"
```

Expected: compilation fails because the test and schema/fixture directories do not exist.

- [x] **Step 3: Create the schemas**

Implement `agent-session.schema.json` with this nested object shape:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["sessionId", "agentId", "owner", "delegatedUser", "riskTier", "status"],
  "properties": {
    "sessionId": { "type": "string" },
    "agentId": { "type": "string" },
    "owner": { "type": "string" },
    "delegatedUser": { "type": "string" },
    "riskTier": { "type": "string", "enum": ["standard", "high"] },
    "status": { "type": "string", "enum": ["active", "paused", "terminated"] }
  }
}
```

Implement `tool-authorisation-request.schema.json` with nested `session`, `action`, and `governance` objects. Require `action.toolId`, `action.actionClass`, and `action.leastPrivilegeScope`; allow only `read`, `write`, and `high-impact` action classes. Require governance `policyProfile`, `approvalId`, `budgetLimit`, and `budgetConsumed`; use `anyOf` for `approvalId` as string or null.

Implement `tool-authorisation-decision.schema.json` with these exact nested contracts:

```json
"decision": {
  "required": ["verdict", "reasonCode", "policyId"],
  "properties": {
    "verdict": { "enum": ["allow", "deny", "approval-required", "paused"] },
    "reasonCode": { "enum": ["read_only_action_allowed", "approved_high_impact_action", "human_approval_required", "tool_not_allowed", "budget_limit_exceeded", "session_not_active"] },
    "policyId": { "type": "string" }
  }
}
```

Require `approval.required`, `approval.approvalId`, `runtimeControl.state`, `budgetLimit`, `budgetConsumed`, `budgetRemaining`, and `audit.traceId`, `eventId`, `recordedAt`.

Implement standalone approval and audit schemas with `additionalProperties: false`; neither schema can contain raw action input/output fields.

- [x] **Step 4: Create synthetic fixtures**

Use shared session and governance values, changing only fields needed by each scenario. The allowed fixture must be:

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

The approval-required fixture uses `actionClass: "high-impact"` and `approvalId: null`. The denied-tool fixture uses `toolId: "unapproved-tool"`. The paused-budget fixture uses `budgetLimit: 10` and `budgetConsumed: 10`.

- [x] **Step 5: Run schema and fixture tests**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- --test-name-pattern="AgentOps"
```

Expected: schema/fixture tests pass; route tests are still absent.

- [ ] **Step 6: Commit the contracts and fixtures**

```bash
git add shared/schemas/agentops-governance shared/examples/agentops-governance providers/aws/app/api/tests/agentOpsContracts.test.ts
git commit -m "feat(p6): add agentops governance contracts"
```

## Task 2: Implement the Deterministic Decision Engine

**Files:**
- Create: `providers/aws/app/api/src/lib/agentOpsPolicy.ts`.
- Modify: `providers/aws/app/api/src/types.ts`, `providers/aws/app/api/src/lib/validation.ts`.
- Test: `providers/aws/app/api/tests/agentActionAuthorisation.test.ts`.

**Interfaces:**
- Consumes: `AgentActionAuthorisationRequest` from `types.ts`.
- Produces: `AgentActionAuthorisationDecision` from `types.ts`.
- Exposes: `normalizeAgentActionAuthorisationRequest(input: unknown)` and `authoriseAgentAction(request)`.

- [x] **Step 1: Write failing unit tests for rule order**

Start the new route test file by importing the future direct route handler. Test exhausted budget before disallowed tool, and paused session before read permission:

```ts
test("paused session cannot return allow for an approved read action", () => {
  const decision = postAgentActionAuthorisation({
    ...allowedReadFixture,
    session: { ...allowedReadFixture.session, status: "paused" }
  });

  assert.equal(decision.decision.verdict, "paused");
  assert.equal(decision.decision.reasonCode, "session_not_active");
});

test("exhausted budget returns deny with paused runtime state", () => {
  const decision = postAgentActionAuthorisation(pausedBudgetFixture);

  assert.equal(decision.decision.verdict, "deny");
  assert.equal(decision.decision.reasonCode, "budget_limit_exceeded");
  assert.equal(decision.runtimeControl.state, "paused");
});
```

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- --test-name-pattern="paused session|exhausted budget"
```

Expected: compilation fails because `postAgentActionAuthorisation` and AgentOps types do not exist.

- [x] **Step 3: Add exact TypeScript types and normalisation**

Add these types to `src/types.ts`:

```ts
export type AgentActionVerdict = "allow" | "deny" | "approval-required" | "paused";

export type AgentActionAuthorisationRequest = {
  requestId: string;
  session: {
    sessionId: string;
    agentId: string;
    owner: string;
    delegatedUser: string;
    riskTier: "standard" | "high";
    status: "active" | "paused" | "terminated";
  };
  action: {
    toolId: string;
    actionClass: "read" | "write" | "high-impact";
    leastPrivilegeScope: string;
  };
  governance: {
    policyProfile: string;
    approvalId: string | null;
    budgetLimit: number;
    budgetConsumed: number;
  };
};
```

Add the matching response type with `decision`, `approval`, `runtimeControl`, and `audit` fields defined in the design spec.

Add strict request validation in `validation.ts`. Use local key arrays and existing `assertOnlyKeys` / `readRequiredString` helpers. Reject non-object values, missing fields, unknown keys, unsupported enums, blank strings, and negative budgets with `new HttpError(400, ..., "invalid_agent_action_request")`. Treat `budgetConsumed >= budgetLimit` as a deterministic policy decision, not a malformed contract.

- [x] **Step 4: Implement `authoriseAgentAction`**

Create `agentOpsPolicy.ts` with the fixed profile and allow-list:

```ts
const AGENTOPS_POLICY_ID = "agentops-demo-governed";
const ALLOWED_TOOL_IDS = ["knowledge-search", "case-summary"] as const;

export function authoriseAgentAction(
  request: AgentActionAuthorisationRequest
): AgentActionAuthorisationDecision {
  if (request.session.status !== "active") {
    return buildDecision(request, "paused", "session_not_active", "paused");
  }
  if (request.governance.budgetConsumed >= request.governance.budgetLimit) {
    return buildDecision(request, "deny", "budget_limit_exceeded", "paused");
  }
  if (!ALLOWED_TOOL_IDS.includes(request.action.toolId as typeof ALLOWED_TOOL_IDS[number])) {
    return buildDecision(request, "deny", "tool_not_allowed", "active");
  }
  if (request.action.actionClass !== "read" && request.governance.approvalId === null) {
    return buildDecision(request, "approval-required", "human_approval_required", "active");
  }
  return buildDecision(
    request,
    "allow",
    request.action.actionClass === "read" ? "read_only_action_allowed" : "approved_high_impact_action",
    "active"
  );
}
```

`buildDecision` must derive deterministic `traceId` and `eventId` from `requestId`, calculate `budgetRemaining` with `Math.max(0, budgetLimit - budgetConsumed)`, preserve a non-null approval ID, and use a fixed mock timestamp `2026-07-11T00:00:00.000Z`.

- [x] **Step 5: Run focused unit tests**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- --test-name-pattern="paused session|exhausted budget|approval|required|disallowed tool"
```

Expected: all new decision-rule tests pass.

- [ ] **Step 6: Commit the decision engine**

```bash
git add providers/aws/app/api/src/types.ts providers/aws/app/api/src/lib/validation.ts providers/aws/app/api/src/lib/agentOpsPolicy.ts providers/aws/app/api/tests/agentActionAuthorisation.test.ts
git commit -m "feat(p6): add deterministic agent action policy"
```

## Task 3: Expose the AgentOps Decision Through the Mock API

**Files:**
- Create: `providers/aws/app/api/src/routes/agentActionAuthorisation.ts`.
- Modify: `providers/aws/app/api/src/server.ts`, `providers/aws/app/api/tests/agentActionAuthorisation.test.ts`.

**Interfaces:**
- Consumes: HTTP JSON request matching `AgentActionAuthorisationRequest`.
- Produces: `AgentActionAuthorisationDecision` with HTTP `200` for all valid policy outcomes.
- Route: `POST /agent-actions/authorize`.

- [x] **Step 1: Write failing endpoint tests**

Add HTTP tests following `ragQuery.test.ts`:

```ts
test("POST /agent-actions/authorize returns approval-required evidence", async () => {
  const response = await postAgentAction(approvalRequiredFixture);

  assert.equal(response.status, 200);
  assert.equal(response.body.decision.verdict, "approval-required");
  assert.equal(response.body.decision.reasonCode, "human_approval_required");
  assert.equal(response.body.approval.required, true);
  assert.equal(response.body.audit.traceId, `trace_${approvalRequiredFixture.requestId}`);
});

test("POST /agent-actions/authorize rejects extra contract fields", async () => {
  const response = await postAgentAction({ ...allowedReadFixture, toolInput: "not accepted" });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "invalid_agent_action_request");
});
```

Capture the injected logger event in the allowed-read test and verify its serialised form omits `prompt`, `requestBody`, `toolInput`, `toolOutput`, `credential`, and `url`.

- [x] **Step 2: Run endpoint tests to verify they fail**

Run the localhost tests with the required permission:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- --test-name-pattern="agent-actions/authorize"
```

Expected: route is `404` because `server.ts` has no AgentOps branch.

- [x] **Step 3: Add route handler and server branch**

Create `src/routes/agentActionAuthorisation.ts`:

```ts
import type { AgentActionAuthorisationDecision } from "../types.js";
import { authoriseAgentAction } from "../lib/agentOpsPolicy.js";
import { normalizeAgentActionAuthorisationRequest } from "../lib/validation.js";

export function postAgentActionAuthorisation(body: unknown): AgentActionAuthorisationDecision {
  return authoriseAgentAction(normalizeAgentActionAuthorisationRequest(body));
}
```

In `server.ts`, import the handler and add the branch before `/chat`:

```ts
if (method === "POST" && route === "/agent-actions/authorize") {
  const body = await readJsonBody(request);
  const decision = postAgentActionAuthorisation(body);
  writeJson(response, 200, decision);
  writeRequestLog(logger, buildRequestLogEvent({
    requestId: decision.requestId,
    method,
    route,
    statusCode: 200,
    durationMs: Date.now() - startedAt,
    timestamp: decision.audit.recordedAt
  }));
  return;
}
```

Do not add decision body fields to `RequestLogEvent`; route/method/status/request ID/timestamp are sufficient for API logging.

- [x] **Step 4: Run endpoint and full test suite**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test
```

Expected: all existing tests and new AgentOps endpoint tests pass.

- [ ] **Step 5: Commit the endpoint**

```bash
git add providers/aws/app/api/src/routes/agentActionAuthorisation.ts providers/aws/app/api/src/server.ts providers/aws/app/api/tests/agentActionAuthorisation.test.ts
git commit -m "feat(p6): add mock agent action authorisation endpoint"
```

## Task 4: Add Evaluation Evidence and Documentation

**Files:**
- Modify: `providers/aws/app/api/src/evals/mockGatewayEvals.ts`, `shared/examples/mock-genai-api/eval-result.mock.json`, `providers/aws/app/api/tests/mockGatewayEvals.test.ts`, `providers/aws/app/api/README.md`, `docs/ai-traffic-governance.md`, `docs/demo-script.md`.
- Test: `providers/aws/app/api/tests/mockGatewayEvals.test.ts` and full API suite.

**Interfaces:**
- Consumes: `postAgentActionAuthorisation` and the allowed-read fixture values.
- Produces: one mock eval result with ID `agentops-runtime-decision-contract` and category `contract`.

- [x] **Step 1: Write failing eval test**

Extend the expected report from six to seven cases:

```ts
assert.equal(report.totalCases, 7);
assert.deepEqual(report.results.map((result) => result.id), [
  "allowed-chat-request",
  "token-budget-blocked-request",
  "unsupported-model-request",
  "response-metadata-present",
  "request-log-omits-prompt",
  "governed-rag-query-contract",
  "agentops-runtime-decision-contract"
]);
```

Add an assertion that the result is passed and its evidence mentions policy verdict, audit metadata, and no tool execution.

- [x] **Step 2: Run the focused eval test to verify it fails**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test -- --test-name-pattern="AgentOps evidence|default mock gateway eval"
```

Expected: the report still has six results.

- [x] **Step 3: Add the eval case and refresh fixture**

In `mockGatewayEvals.ts`, import `postAgentActionAuthorisation` and append this exact evaluator:

```ts
function evaluateAgentOpsRuntimeDecision(): MockGatewayEvalResult {
  const decision = postAgentActionAuthorisation({
    requestId: "agent_req_eval_0001",
    session: {
      sessionId: "agent_session_eval_0001",
      agentId: "demo-knowledge-agent",
      owner: "platform-demo-owner",
      delegatedUser: "synthetic-user",
      riskTier: "standard",
      status: "active"
    },
    action: {
      toolId: "knowledge-search",
      actionClass: "read",
      leastPrivilegeScope: "synthetic-public-knowledge"
    },
    governance: {
      policyProfile: "agentops-demo-governed",
      approvalId: null,
      budgetLimit: 10,
      budgetConsumed: 2
    }
  });
  const serialized = JSON.stringify(decision);
  const passed = decision.decision.verdict === "allow"
    && decision.decision.reasonCode === "read_only_action_allowed"
    && Boolean(decision.audit.traceId)
    && !serialized.includes("toolInput");

  return {
    id: "agentops-runtime-decision-contract",
    category: "contract",
    description: "Mock AgentOps decision returns policy, budget, and audit evidence without tool execution.",
    passed,
    evidence: passed
      ? "Allowed read action returned policy verdict, audit metadata, and no tool execution."
      : "AgentOps runtime decision evidence was incomplete."
  };
}
```

Update `eval-result.mock.json` totals and append the matching result object.

- [x] **Step 4: Document the endpoint and boundary**

Add `POST /agent-actions/authorize` to the API README endpoint list, request/response example, four fixture names, and a clear statement that it returns a decision only and does not execute tools.

In `docs/ai-traffic-governance.md`, add a P6a section that maps the route to agent identity, least-privilege action class, policy verdict, approval boundary, audit event, and budget state. State that it is not an agent runtime, traffic proxy, or enforcement integration.

In `docs/demo-script.md`, add one curl request using `agent-action.allowed-read.json` and explain the expected `allow` verdict, trace/audit metadata, and no-execution boundary.

- [x] **Step 5: Run full verification**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test
git diff --check
rg -n 'toolInput|toolOutput|requestBody|prompt|credential|secret' shared/examples/agentops-governance providers/aws/app/api/src/routes/agentActionAuthorisation.ts
```

Expected: all tests pass, diff check has no output, and the safety scan finds only explicit documentation/assertion references rather than any fixture or route payload fields.

- [ ] **Step 6: Commit evaluation and documentation**

```bash
git add providers/aws/app/api/src/evals/mockGatewayEvals.ts shared/examples/mock-genai-api/eval-result.mock.json providers/aws/app/api/tests/mockGatewayEvals.test.ts providers/aws/app/api/README.md docs/ai-traffic-governance.md docs/demo-script.md
git commit -m "docs(p6): document agentops decision evidence"
```

## Plan Self-Review

- Spec coverage: Tasks 1-4 cover contracts, fixtures, decision order, route, logging boundary, evaluation, documentation, and full verification.
- Placeholder scan: no implementation step relies on unspecified behavior; all verdicts, reason codes, paths, and commands are named.
- Type consistency: `AgentActionAuthorisationRequest`, `AgentActionAuthorisationDecision`, `normalizeAgentActionAuthorisationRequest`, `authoriseAgentAction`, and `postAgentActionAuthorisation` use the same names throughout.
- Scope check: P6a remains one deterministic mock decision layer. Capability admission and RAG lifecycle remain separate P6b/P6c work.
