# Governed Workflow Evidence Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a metadata-only mock workflow evaluation endpoint that composes CloudAI governance evidence into deterministic `approved`, `approval-required`, or `blocked` decisions.

**Architecture:** `POST /workflow-runs/evaluate` normalizes a strict workflow contract, invokes the existing AgentOps and Guardrails policies, reads local capability and knowledge-source records, and passes lane outcomes to a separate verifier. The verifier produces a compact, redacted evidence bundle without executing models, tools, retrieval, workflows, or cloud actions.

**Tech Stack:** TypeScript 5.8, Node.js built-in HTTP server and test runner, JSON Schema fixtures, pnpm.

## Global Constraints

- Maintain mock-only, deterministic behavior; do not call providers, models, tools, retrieval, or cloud APIs.
- Accept metadata only; reject `prompt`, `content`, `toolInput`, `toolOutput`, `credentials`, `sourceDocument`, and `executionResult` as unsupported fields.
- Return control outcomes and synthetic identifiers only; never echo raw request payloads in evidence or logs.
- Keep existing routes and contracts backward compatible.
- Run `pnpm test` from `providers/aws/app/api` before each commit.

---

### Task 1: Define the workflow evidence contract, fixtures, and strict request validation

**Files:**
- Create: `shared/schemas/workflow-evidence/workflow-run-request.schema.json`
- Create: `shared/schemas/workflow-evidence/workflow-evidence-bundle.schema.json`
- Create: `shared/examples/workflow-evidence/allowed-read.request.json`
- Create: `shared/examples/workflow-evidence/approval-required-write.request.json`
- Create: `shared/examples/workflow-evidence/blocked-retired-source.request.json`
- Modify: `providers/aws/app/api/src/types.ts`
- Modify: `providers/aws/app/api/src/lib/validation.ts`
- Create: `providers/aws/app/api/tests/workflowEvidenceContracts.test.ts`
- Modify: `providers/aws/app/api/tests/validation.test.ts`

**Interfaces:**
- Consumes: existing `AgentActionAuthorisationRequest`, `GuardrailAssessmentRequest`, and `AgentRiskTier` types.
- Produces: `WorkflowRunRequest`, `WorkflowEvidenceBundle`, and `normalizeWorkflowRunRequest(input: unknown): WorkflowRunRequest`.

- [ ] **Step 1: Write the failing contract and validation tests**

```ts
test("workflow request fixture is strict metadata-only input", async () => {
  const fixture = await readJson("allowed-read.request.json", EXAMPLE_DIR);
  const schema = await readJson("workflow-run-request.schema.json", SCHEMA_DIR);
  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.workflowId, "workflow_demo_allowed_0001");
  assert.equal("prompt" in fixture, false);
  assert.equal("toolInput" in fixture, false);
});

test("workflow request normalization rejects raw execution payload fields", () => {
  assert.throws(
    () => normalizeWorkflowRunRequest({ ...allowedRequest, executionResult: "not accepted" }),
    (error: any) => error.code === "invalid_workflow_run_request"
  );
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow request|workflow request normalization"`

Expected: FAIL because the workflow fixture, schema, and `normalizeWorkflowRunRequest` do not exist.

- [ ] **Step 3: Add the request and response types plus strict normalizer**

Add these types to `providers/aws/app/api/src/types.ts`:

```ts
export type WorkflowVerdict = "approved" | "approval-required" | "blocked";
export type WorkflowAcceptanceCheck =
  | "capability-admitted"
  | "source-active"
  | "guardrails-allow"
  | "within-budget";

export type WorkflowRunRequest = {
  workflowId: string;
  objective: string;
  owner: string;
  riskTier: AgentRiskTier;
  agentAction: AgentActionAuthorisationRequest;
  capability: { capabilityId: string; admissionStatus: "admitted" | "blocked" };
  knowledgeSource: { sourceId: string; allowedKnowledgeBase: string };
  guardrails: GuardrailAssessmentRequest;
  acceptanceChecks: WorkflowAcceptanceCheck[];
};
```

Add `normalizeWorkflowRunRequest` to `validation.ts`. It must call `assertOnlyKeys` at the request and nested-object level, trim every required string, require a non-empty `objective`, require a non-empty unique `acceptanceChecks` array, reuse `readAgentRiskTier`, `readAgentSession`, `readAgentAction`, `readAgentGovernance`, `readGuardrailSurface`, and `readGuardrailSignals`, and throw `HttpError(400, ..., "invalid_workflow_run_request")` for malformed or unsupported fields.

- [ ] **Step 4: Add schemas and all three request fixtures**

Use JSON Schema draft 2020-12 with `additionalProperties: false` for every input object. The allowed fixture must use:

```json
{
  "workflowId": "workflow_demo_allowed_0001",
  "objective": "Summarize approved synthetic platform guidance.",
  "owner": "platform-demo-owner",
  "riskTier": "standard",
  "capability": { "capabilityId": "knowledge-search", "admissionStatus": "admitted" },
  "knowledgeSource": { "sourceId": "demo-platform-handbook-001", "allowedKnowledgeBase": "demo-platform-handbook" },
  "acceptanceChecks": ["capability-admitted", "source-active", "guardrails-allow", "within-budget"]
}
```

Complete it with an active, standard-risk `knowledge-search` read action and a `none` guardrail signal. Make the approval fixture a `write` action with `approvalId: null`; make the blocked fixture reference `legacy-platform-handbook-001` and `legacy-platform-handbook` while keeping other lanes eligible.

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow request|workflow request normalization"`

Expected: PASS.

- [ ] **Step 6: Commit the contract foundation**

```bash
git add shared/schemas/workflow-evidence shared/examples/workflow-evidence \
  providers/aws/app/api/src/types.ts providers/aws/app/api/src/lib/validation.ts \
  providers/aws/app/api/tests/workflowEvidenceContracts.test.ts providers/aws/app/api/tests/validation.test.ts
git commit -m "feat: define workflow evidence contract"
```

### Task 2: Implement separate evidence lanes and the workflow verifier

**Files:**
- Create: `providers/aws/app/api/src/lib/workflowEvidencePolicy.ts`
- Modify: `providers/aws/app/api/src/lib/knowledgeSourceRegistry.ts`
- Modify: `providers/aws/app/api/src/types.ts`
- Create: `providers/aws/app/api/tests/workflowEvidencePolicy.test.ts`

**Interfaces:**
- Consumes: `WorkflowRunRequest`, `authoriseAgentAction`, `assessGuardrailSignals`, local capability admission metadata, and local knowledge-source metadata.
- Produces: `evaluateWorkflowRun(request: WorkflowRunRequest): WorkflowEvidenceBundle` and `verifyWorkflowEvidence(lanes: WorkflowEvidenceLanes, checks: WorkflowAcceptanceCheck[]): WorkflowVerification`.

- [ ] **Step 1: Write failing verifier tests for the three outcomes and precedence**

```ts
test("allowed read workflow is approved with four passing evidence lanes", () => {
  const evidence = evaluateWorkflowRun(allowedRequest);
  assert.equal(evidence.verdict, "approved");
  assert.deepEqual(evidence.finalReasons, ["all_required_evidence_verified"]);
  assert.equal(evidence.lanes.agentOps.status, "pass");
  assert.equal(evidence.lanes.knowledgeSource.status, "pass");
});

test("write workflow without approval is approval-required", () => {
  const evidence = evaluateWorkflowRun(approvalRequiredRequest);
  assert.equal(evidence.verdict, "approval-required");
  assert.ok(evidence.finalReasons.includes("human_approval_required"));
});

test("retired source blocks the workflow before any execution", () => {
  const evidence = evaluateWorkflowRun(blockedRequest);
  assert.equal(evidence.verdict, "blocked");
  assert.ok(evidence.finalReasons.includes("knowledge_source_retired"));
  assert.equal(evidence.boundaries.executesRuntimeAction, false);
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow is approved|workflow without approval|retired source blocks"`

Expected: FAIL because `workflowEvidencePolicy.ts` and the evaluation types do not exist.

- [ ] **Step 3: Expose metadata-only knowledge source lookup and define evidence types**

Add `findKnowledgeSourceById(sourceId: string): KnowledgeSourceRecord | undefined` to `knowledgeSourceRegistry.ts`. Export the record and lifecycle types without changing `requireActiveKnowledgeSource` behavior.

Add these response types to `types.ts`:

```ts
export type WorkflowLaneStatus = "pass" | "approval-required" | "blocked";
export type WorkflowEvidenceBundle = {
  workflowId: string;
  mode: "mock";
  verdict: WorkflowVerdict;
  finalReasons: string[];
  lanes: Record<string, { status: WorkflowLaneStatus; reasonCode: string; evidenceId: string }>;
  verification: { acceptanceChecks: Array<{ name: WorkflowAcceptanceCheck; passed: boolean }>; verifiedAt: string };
  boundaries: {
    executesRuntimeAction: false;
    callsModel: false;
    callsTool: false;
    performsRetrieval: false;
    deploysCloudResources: false;
    persistsAuditRecords: false;
  };
};
```

- [ ] **Step 4: Implement lane mapping and independent verifier**

In `workflowEvidencePolicy.ts`, call `authoriseAgentAction(request.agentAction)` and `assessGuardrailSignals(request.guardrails)`. Map AgentOps `allow` to `pass`, `approval-required` to `approval-required`, and `deny` or `paused` to `blocked`. Map capability `admitted` to `pass` and `blocked` to `blocked`. Map an existing active knowledge source whose knowledge-base list includes the requested boundary to `pass`; map missing, paused, or retired sources to `blocked`, with a retired source returning reason `knowledge_source_retired`. Map guardrail `allow` to `pass`, `approval-required` or `redact` to `approval-required`, and `deny` to `blocked`.

Calculate `within-budget` from the AgentOps lane: it passes only when `budgetConsumed < budgetLimit`. `verifyWorkflowEvidence` must evaluate each declared acceptance check from the lane statuses, apply blocked-before-approval-required precedence, and return `all_required_evidence_verified` only for an approved run. Use the fixed evaluation timestamp `2026-07-17T00:00:00.000Z` so fixtures and tests remain deterministic.

- [ ] **Step 5: Expand tests to prove redaction and precedence**

Add assertions that serialized evidence contains none of `objective`, `prompt`, `toolInput`, `toolOutput`, `credentials`, `sourceDocument`, or `executionResult`; add one unit test in which an unapproved write action also has a retired source and assert the result is `blocked`.

- [ ] **Step 6: Run the focused tests to verify they pass**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow"`

Expected: PASS.

- [ ] **Step 7: Commit the policy composer**

```bash
git add providers/aws/app/api/src/lib/workflowEvidencePolicy.ts \
  providers/aws/app/api/src/lib/knowledgeSourceRegistry.ts providers/aws/app/api/src/types.ts \
  providers/aws/app/api/tests/workflowEvidencePolicy.test.ts
git commit -m "feat: evaluate workflow governance evidence"
```

### Task 3: Expose the endpoint and prove schema/fixture/API behavior

**Files:**
- Create: `providers/aws/app/api/src/routes/workflowEvidence.ts`
- Modify: `providers/aws/app/api/src/server.ts`
- Modify: `providers/aws/app/api/tests/workflowEvidenceContracts.test.ts`
- Create: `providers/aws/app/api/tests/workflowEvidenceRoute.test.ts`
- Modify: `providers/aws/app/api/tests/schemaContracts.test.ts`
- Modify: `providers/aws/app/api/tests/fixtureContracts.test.ts`
- Modify: `shared/schemas/mock-genai-api/error-response.schema.json`
- Modify: `providers/aws/app/api/src/evals/mockGatewayEvals.ts`
- Modify: `providers/aws/app/api/tests/mockGatewayEvals.test.ts`

**Interfaces:**
- Consumes: `normalizeWorkflowRunRequest` and `evaluateWorkflowRun`.
- Produces: `postWorkflowEvidence(body: unknown): WorkflowEvidenceBundle` at `POST /workflow-runs/evaluate`.

- [ ] **Step 1: Write the failing endpoint and schema tests**

```ts
test("POST /workflow-runs/evaluate returns the allowed evidence bundle", async () => {
  const response = await postWorkflowEvidence(await readJson("allowed-read.request.json"));
  assert.equal(response.status, 200);
  assert.equal(response.body.workflowId, "workflow_demo_allowed_0001");
  assert.equal(response.body.verdict, "approved");
  assert.equal(response.body.boundaries.callsTool, false);
});

test("workflow evidence response fixture matches its strict schema", async () => {
  assertMatchesSchema(await readJson("allowed-read.evidence.json"), await readSchema("workflow-evidence-bundle.schema.json"));
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow-runs/evaluate|workflow evidence response fixture"`

Expected: FAIL because the route and response fixtures do not exist.

- [ ] **Step 3: Add the route and server branch**

Create `workflowEvidence.ts`:

```ts
export function postWorkflowEvidence(body: unknown): WorkflowEvidenceBundle {
  return evaluateWorkflowRun(normalizeWorkflowRunRequest(body));
}
```

In `server.ts`, import this route and add a `POST /workflow-runs/evaluate` branch before the generic 404. Return HTTP 200 for every normalized workflow result, and write a request log containing only `workflowId` as the request ID, route metadata, and the fixed verifier timestamp. Do not log the objective or any nested request data.

- [ ] **Step 4: Add evidence fixtures, strict response schema, and eval case**

Create `allowed-read.evidence.json`, `approval-required-write.evidence.json`, and `blocked-retired-source.evidence.json` from actual deterministic responses. The response schema must require `workflowId`, `mode`, `verdict`, `finalReasons`, `lanes`, `verification`, and `boundaries`, with `additionalProperties: false` at every documented object level.

Add `workflow-evidence-evaluation` to `runMockGatewayEvals`. It must verify the allowed fixture result is approved, includes four accepted checks, contains no objective text, and declares no execution boundaries as false.

Add `invalid_workflow_run_request` to the error schema enum and test that a raw `prompt` field receives that code from the route.

- [ ] **Step 5: Run API and contract tests to verify they pass**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow|error response schema|mock gateway eval"`

Expected: PASS.

- [ ] **Step 6: Run the full API test suite**

Run: `cd providers/aws/app/api && pnpm test`

Expected: PASS with no existing test regressions.

- [ ] **Step 7: Commit the public mock endpoint**

```bash
git add providers/aws/app/api/src/routes/workflowEvidence.ts providers/aws/app/api/src/server.ts \
  providers/aws/app/api/src/evals/mockGatewayEvals.ts providers/aws/app/api/tests \
  shared/schemas/workflow-evidence shared/examples/workflow-evidence \
  shared/schemas/mock-genai-api/error-response.schema.json
git commit -m "feat: add workflow evidence endpoint"
```

### Task 4: Integrate the pattern into architecture, solution, and demo documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/ai-traffic-governance.md`
- Modify: `docs/cloudai-platform-solution-walkthrough.md`
- Modify: `docs/control-plane-evidence-map.md`
- Modify: `docs/current-status.md`
- Modify: `docs/demo-script.md`
- Modify: `providers/aws/app/api/README.md`

**Interfaces:**
- Consumes: the endpoint, three request fixtures, three evidence fixtures, and workflow schemas delivered by Tasks 1–3.
- Produces: consistent portfolio narrative and runnable local commands for the workflow-evidence demonstration.

- [ ] **Step 1: Write failing documentation-presence tests**

Add tests that assert the API README contains `POST /workflow-runs/evaluate`, architecture contains `Workflow Evidence Verifier`, and the demo script contains the allowed fixture path plus the phrase `evidence bundle`.

- [ ] **Step 2: Run documentation tests to verify they fail**

Run: `cd providers/aws/app/api && pnpm test -- --test-name-pattern "workflow evidence documentation"`

Expected: FAIL because the documentation has not named the endpoint or verifier.

- [ ] **Step 3: Update architecture and solution narrative**

Add a workflow-evidence pattern beneath AI Traffic Governance: declared task contract → control lanes → independent verifier → compact evidence verdict. Explain that fan-out is conceptual evidence composition only, not concurrent runtime execution. In the solution walkthrough, map AgentOps, capability admission, RAG lifecycle, guardrails, and budget state to the returned evidence lanes. In the evidence map, add the workflow-evidence bundle as a synthesis view rather than a new source of truth.

- [ ] **Step 4: Update runnable API, README, status, and demo material**

Document the route, strict metadata-only boundary, three fixture outcomes, and this runnable command in the API README and demo script:

```bash
curl -s http://localhost:3000/workflow-runs/evaluate \
  -H "content-type: application/json" \
  -d @../../../../shared/examples/workflow-evidence/allowed-read.request.json
```

Update root README and current status to present this as a completed local mock feature, with no claim of a deployed orchestration engine, agent runtime, live PR integration, or persistent audit store.

- [ ] **Step 5: Run documentation and full API tests to verify they pass**

Run: `cd providers/aws/app/api && pnpm test`

Expected: PASS.

- [ ] **Step 6: Review documentation quality and commit**

Run: `git diff --check && rg -n 'TBD|TODO|real agent runtime|autonomous' README.md docs providers/aws/app/api/README.md`

Expected: no whitespace errors; every reference to future runtime behavior is explicitly bounded as future or mock-only.

```bash
git add README.md docs providers/aws/app/api/README.md providers/aws/app/api/tests
git commit -m "docs: explain governed workflow evidence"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 implement the declared task contract, separate evidence lanes, independent verifier, three deterministic scenarios, strict schemas, redaction, endpoint, fixtures, and eval; Task 4 integrates all required architecture, solution, README, demo, and status documentation.
- **Placeholder scan:** No `TBD`, `TODO`, vague “appropriate handling,” or undefined implementation steps remain.
- **Type consistency:** `WorkflowRunRequest` is normalized in Task 1, consumed by `evaluateWorkflowRun` in Task 2, then exposed by `postWorkflowEvidence` in Task 3. The output is consistently named `WorkflowEvidenceBundle`.
