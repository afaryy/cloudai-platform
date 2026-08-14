import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/agentcore-readiness");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agentcore-readiness");
const P8I_DOC_PATH = resolve(process.cwd(), "../../../../docs/solutions/p8i-agentcore-synthetic-contract-pack.md");
const SOLUTIONS_INDEX_PATH = resolve(process.cwd(), "../../../../docs/solutions/README.md");

test("AgentCore readiness request captures a metadata-only knowledge lookup boundary", async () => {
  const schema = await readJson("knowledge-lookup-admission-request.schema.json", SCHEMA_DIR);
  const request = {
    requestId: "synthetic-request-allowed-001",
    owner: "synthetic-owner-platform",
    workloadIdentity: "synthetic-workload-knowledge-lookup",
    route: "gateway-only",
    capability: "knowledge-search",
    accessMode: "read-only",
    knowledgeBoundaryId: "synthetic-approved-handbook",
    riskTier: "standard",
    sessionLimit: 3,
    budgetLimit: 10,
    requestedAt: "2026-08-14T00:00:00Z"
  };

  assertMatchesSchema(request, schema);
  assert.throws(
    () => assertMatchesSchema({ ...request, rawPrompt: "not allowed" }, schema),
    /not documented/
  );
});

test("six AgentCore readiness scenarios remain distinct and match their contracts", async () => {
  const requestSchema = await readJson("knowledge-lookup-admission-request.schema.json", SCHEMA_DIR);
  const boundarySchema = await readJson("approved-knowledge-boundary.schema.json", SCHEMA_DIR);
  const decisionSchema = await readJson("gateway-admission-decision.schema.json", SCHEMA_DIR);
  const closureSchema = await readJson("emergency-disable-closure.schema.json", SCHEMA_DIR);

  const allowed = await loadScenario("allowed-gateway-lookup");
  const retired = await loadScenario("retired-source-denied");
  const approval = await loadScenario("high-risk-approval-required");
  const blocked = await loadScenario("policy-blocked");
  const bypass = await loadScenario("direct-runtime-bypass");
  const disabled = await loadScenario("emergency-disabled", true);

  for (const scenario of [allowed, retired, approval, blocked, bypass, disabled]) {
    assertMatchesSchema(scenario.request, requestSchema);
    assertMatchesSchema(scenario.boundary, boundarySchema);
    assertMatchesSchema(scenario.decision, decisionSchema);
    assertScenarioRelationships(scenario);
  }
  assertMatchesSchema(disabled.closure, closureSchema);

  assert.equal(allowed.decision.decision, "admit");
  assert.equal(retired.boundary.lifecycleStatus, "retired");
  assert.equal(retired.decision.decision, "deny");
  assert.equal(approval.decision.decision, "approval-required");
  assert.equal(blocked.decision.decision, "blocked");
  assert.equal(bypass.decision.decision, "deny");
  assert.equal(disabled.decision.decision, "disabled");
  assert.equal(disabled.closure.newRequests, "rejected");
});

test("AgentCore readiness relationships fail closed when governance boundaries change", async () => {
  const requestSchema = await readJson("knowledge-lookup-admission-request.schema.json", SCHEMA_DIR);
  const boundarySchema = await readJson("approved-knowledge-boundary.schema.json", SCHEMA_DIR);
  const decisionSchema = await readJson("gateway-admission-decision.schema.json", SCHEMA_DIR);
  const closureSchema = await readJson("emergency-disable-closure.schema.json", SCHEMA_DIR);
  const allowed = await loadScenario("allowed-gateway-lookup");
  const bypass = await loadScenario("direct-runtime-bypass");
  const disabled = await loadScenario("emergency-disabled", true);

  assertAdmittedLookupIsBounded(allowed);
  assertBypassIsDenied(bypass);
  assertEmergencyDisableClosesAdmission(disabled);

  assert.throws(() => assertMatchesSchema({ ...allowed.request, owner: "" }, requestSchema), /must not be empty/);
  assert.throws(() => assertMatchesSchema({ ...allowed.boundary, rawSourceText: "not allowed" }, boundarySchema), /not documented/);
  assert.throws(() => assertMatchesSchema({ ...allowed.decision.evidence, rawPrompt: "not allowed" }, decisionSchema.properties.evidence), /not documented/);
  assert.throws(() => assertMatchesSchema({ ...disabled.closure, newRequests: "allowed" }, closureSchema), /documented enum values/);
});

test("AgentCore readiness decision requires trusted policy and Guardrail metadata", async () => {
  const decisionSchema = await readJson("gateway-admission-decision.schema.json", SCHEMA_DIR);
  const allowed = await loadScenario("allowed-gateway-lookup");
  const withoutPolicy = { ...allowed.decision };
  const withoutGuardrail = { ...allowed.decision };

  delete withoutPolicy.policy;
  delete withoutGuardrail.guardrail;

  assert.throws(() => assertMatchesSchema(withoutPolicy, decisionSchema), /missing required field: policy/);
  assert.throws(() => assertMatchesSchema(withoutGuardrail, decisionSchema), /missing required field: guardrail/);
  assert.throws(
    () => assertMatchesSchema({ ...allowed.decision, policy: { ...allowed.decision.policy, policyId: "non-synthetic-policy" } }, decisionSchema),
    /synthetic pattern/
  );
  assert.throws(
    () => assertMatchesSchema({ ...allowed.decision, guardrail: { ...allowed.decision.guardrail, guardrailId: "non-synthetic-guardrail" } }, decisionSchema),
    /synthetic pattern/
  );
});

test("AgentCore readiness schema validation rejects empty capability lists and invalid timestamps", async () => {
  const requestSchema = await readJson("knowledge-lookup-admission-request.schema.json", SCHEMA_DIR);
  const boundarySchema = await readJson("approved-knowledge-boundary.schema.json", SCHEMA_DIR);
  const allowed = await loadScenario("allowed-gateway-lookup");

  assert.throws(
    () => assertMatchesSchema({ ...allowed.boundary, approvedForCapabilities: [] }, boundarySchema),
    /at least 1 item/
  );
  assert.throws(
    () => assertMatchesSchema({ ...allowed.request, requestedAt: "not-a-timestamp" }, requestSchema),
    /ISO date-time/
  );
  assert.throws(
    () => assertMatchesSchema({ ...allowed.request, requestedAt: "2026-08-14" }, requestSchema),
    /ISO date-time/
  );
});

test("AgentCore readiness rejects invalid request, boundary, and decision combinations", async () => {
  const allowed = await loadScenario("allowed-gateway-lookup");
  const retired = await loadScenario("retired-source-denied");
  const blocked = await loadScenario("policy-blocked");
  const bypass = await loadScenario("direct-runtime-bypass");

  assert.throws(() => assertScenarioRelationships({ ...allowed, request: { ...allowed.request, route: "direct-runtime" } }), /direct-runtime bypass/);
  assert.throws(() => assertScenarioRelationships({ ...retired, decision: { ...retired.decision, decision: "admit" } }), /retired/);
  assert.throws(() => assertScenarioRelationships({ ...blocked, decision: { ...blocked.decision, guardrailSignal: "allow" } }), /blocked/);
  assert.throws(() => assertScenarioRelationships({ ...bypass, decision: { ...bypass.decision, decision: "admit" } }), /bypass/);
});

test("P8i documentation states the complete non-claim boundary", async () => {
  const documentation = await readFile(P8I_DOC_PATH, "utf8");
  const solutionsIndex = await readFile(SOLUTIONS_INDEX_PATH, "utf8");

  assert.match(documentation, /Implemented — local synthetic contract pack/);
  assert.match(documentation, /AgentCore-ready control-plane design/);
  assert.match(documentation, /no AgentCore integration or live runtime validation/);
  assert.match(documentation, /no provider call, retrieval, embeddings, vector index, or customer data/);
  assert.match(solutionsIndex, /p8i-agentcore-synthetic-contract-pack\.md/);
});

async function loadScenario(prefix: string, includeClosure = false): Promise<any> {
  const scenario = {
    request: await readJson(`${prefix}.request.json`, EXAMPLE_DIR),
    boundary: await readJson(`${prefix}.boundary.json`, EXAMPLE_DIR),
    decision: await readJson(`${prefix}.decision.json`, EXAMPLE_DIR)
  } as Record<string, any>;

  if (includeClosure) {
    scenario.closure = await readJson(`${prefix}.closure.json`, EXAMPLE_DIR);
  }

  return scenario;
}

function assertAdmittedLookupIsBounded(scenario: any): void {
  assert.equal(scenario.request.route, "gateway-only");
  assert.equal(scenario.request.capability, "knowledge-search");
  assert.equal(scenario.request.accessMode, "read-only");
  assert.ok(scenario.request.owner.length > 0);
  assert.ok(scenario.request.workloadIdentity.length > 0);
  assert.equal(scenario.boundary.knowledgeBoundaryId, scenario.request.knowledgeBoundaryId);
  assert.equal(scenario.boundary.lifecycleStatus, "active");
  assert.equal(scenario.boundary.classification, "synthetic-internal");
  assert.deepEqual(scenario.boundary.approvedForCapabilities, ["knowledge-search"]);
  assert.equal(scenario.decision.requestId, scenario.request.requestId);
  assert.equal(scenario.decision.decision, "admit");
  assert.equal(scenario.decision.policySignal, "allow");
  assert.equal(scenario.decision.guardrailSignal, "allow");
  assert.equal(scenario.decision.session.state, "within-limit");
  assert.ok(scenario.decision.budget.consumed < scenario.decision.budget.limit);
  assert.equal(scenario.decision.evidence.redactionStatus, "metadata-only");
}

function assertBypassIsDenied(scenario: any): void {
  assert.equal(scenario.request.route, "direct-runtime");
  assert.equal(scenario.decision.requestId, scenario.request.requestId);
  assert.equal(scenario.decision.decision, "deny");
  assert.equal(scenario.decision.policySignal, "deny");
  assert.match(scenario.decision.reasonCode, /bypass/);
  assert.equal(scenario.decision.evidence.redactionStatus, "metadata-only");
}

function assertEmergencyDisableClosesAdmission(scenario: any): void {
  assert.equal(scenario.decision.requestId, scenario.request.requestId);
  assert.equal(scenario.decision.decision, "disabled");
  assert.equal(scenario.decision.policySignal, "disabled");
  assert.equal(scenario.closure.workloadIdentity, scenario.request.workloadIdentity);
  assert.equal(scenario.closure.closureStatus, "disabled");
  assert.equal(scenario.closure.newRequests, "rejected");
  assert.equal(scenario.closure.evidenceId, scenario.decision.evidence.evidenceId);
}

function assertScenarioRelationships(scenario: any): void {
  const { request, boundary, decision } = scenario;

  assert.equal(boundary.knowledgeBoundaryId, request.knowledgeBoundaryId, "knowledge boundary must match the request");
  assert.equal(decision.requestId, request.requestId, "decision must match the request");
  assert.equal(decision.session.limit, request.sessionLimit, "session limit must match the request");
  assert.equal(decision.budget.limit, request.budgetLimit, "budget limit must match the request");
  assert.equal(decision.policy.trustStatus, "trusted", "policy metadata must be trusted");
  assert.equal(decision.guardrail.trustStatus, "trusted", "Guardrail metadata must be trusted");

  if (request.route === "direct-runtime") {
    assert.equal(decision.decision, "deny", "direct-runtime bypass must be denied");
    assert.equal(decision.policySignal, "deny", "direct-runtime bypass must be denied by policy");
    assert.match(decision.reasonCode, /bypass/, "direct-runtime denial must retain a bypass reason");
    return;
  }

  if (boundary.lifecycleStatus === "retired") {
    assert.equal(decision.decision, "deny", "retired source must be denied");
    assert.equal(decision.policySignal, "deny", "retired source must be denied by policy");
    assert.match(decision.reasonCode, /retired/, "retired source denial must retain a lifecycle reason");
    return;
  }

  if (decision.guardrailSignal === "blocked") {
    assert.equal(decision.decision, "blocked", "blocked Guardrail signal must block admission");
    assert.equal(decision.policySignal, "deny", "blocked Guardrail signal must deny by policy");
    assert.equal(decision.session.state, "closed", "blocked Guardrail signal must close the session");
    return;
  }

  if (decision.decision === "blocked") {
    assert.equal(decision.guardrailSignal, "blocked", "blocked decision must carry a blocked Guardrail signal");
    assert.equal(decision.policySignal, "deny", "blocked decision must have deny policy state");
    assert.equal(decision.session.state, "closed", "blocked decision must close the session");
    return;
  }

  if (decision.decision === "disabled") {
    assert.equal(decision.policySignal, "disabled", "disabled workload must have disabled policy state");
    assert.ok(scenario.closure, "disabled workload must include closure evidence");
    assertEmergencyDisableClosesAdmission(scenario);
    return;
  }

  if (request.riskTier === "elevated") {
    assert.equal(decision.decision, "approval-required", "elevated-risk lookup must require approval");
    assert.equal(decision.policySignal, "review", "elevated-risk lookup must be in review state");
    assert.equal(decision.guardrailSignal, "allow", "approval-required lookup must retain allow Guardrail state");
    assert.equal(decision.session.state, "approval-pending", "elevated-risk lookup must await approval");
    return;
  }

  assert.equal(request.route, "gateway-only", "admitted lookup must use gateway-only route");
  assert.equal(boundary.lifecycleStatus, "active", "admitted lookup must use an active source");
  assert.equal(decision.decision, "admit", "standard active lookup must be admitted");
  assert.equal(decision.policySignal, "allow", "admitted lookup must have allow policy state");
  assert.equal(decision.guardrailSignal, "allow", "admitted lookup must have allow Guardrail state");
  assert.equal(decision.session.state, "within-limit", "admitted lookup must remain within its session limit");
  assert.equal(decision.budget.state, "within-limit", "admitted lookup must remain within its budget limit");
  assert.ok(decision.budget.consumed < decision.budget.limit, "admitted lookup must retain budget headroom");
}

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if ("const" in schema) {
    assert.deepEqual(value, schema.const, `${path} must equal the documented constant`);
  }

  if (Array.isArray(schema.enum)) {
    assert.ok(schema.enum.includes(value), `${path} must be one of the documented enum values`);
  }

  if (schema.type === "object" || schema.properties) {
    assert.ok(isRecord(value), `${path} must be an object`);
    for (const requiredKey of schema.required ?? []) {
      assert.ok(requiredKey in value, `${path} missing required field: ${requiredKey}`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(key in schema.properties, `${path}.${key} is not documented`);
      }
    }
    for (const [key, propertySchema] of Object.entries<any>(schema.properties ?? {})) {
      if (key in value) assertMatchesSchema(value[key], propertySchema, `${path}.${key}`);
    }
    return;
  }

  if (schema.type === "array" || schema.items) {
    assert.ok(Array.isArray(value), `${path} must be an array`);
    if (typeof schema.minItems === "number") {
      assert.ok(value.length >= schema.minItems, `${path} must include at least ${schema.minItems} item(s)`);
    }
    for (const [index, item] of value.entries()) {
      assertMatchesSchema(item, schema.items, `${path}[${index}]`);
    }
    return;
  }

  if (schema.type === "string") {
    if (typeof value !== "string") assert.fail(`${path} must be a string`);
    if (typeof schema.minLength === "number") {
      assert.ok(value.length >= schema.minLength, `${path} must not be empty`);
    }
    if (typeof schema.pattern === "string") {
      assert.ok(new RegExp(schema.pattern).test(value), `${path} must match the documented synthetic pattern`);
    }
    if (schema.format === "date-time") {
      assert.ok(isRfc3339DateTime(value), `${path} must be an ISO date-time`);
    }
  }

  if (schema.type === "number") {
    if (typeof value !== "number") assert.fail(`${path} must be a number`);
    if (typeof schema.minimum === "number") {
      assert.ok(value >= schema.minimum, `${path} must meet the documented minimum`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRfc3339DateTime(value: string): boolean {
  const rfc3339DateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  return rfc3339DateTime.test(value) && !Number.isNaN(Date.parse(value));
}
