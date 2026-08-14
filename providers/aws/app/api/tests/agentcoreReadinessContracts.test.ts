import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/agentcore-readiness");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agentcore-readiness");

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
    for (const [index, item] of value.entries()) {
      assertMatchesSchema(item, schema.items, `${path}[${index}]`);
    }
    return;
  }

  if (schema.type === "string") assert.equal(typeof value, "string", `${path} must be a string`);
  if (schema.type === "number") assert.equal(typeof value, "number", `${path} must be a number`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
