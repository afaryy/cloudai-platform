import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateSupplierReadiness } from "../src/governance/supplierReadinessEvaluator.js";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-supplier-readiness");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-supplier-readiness");
const SCENARIOS = [
  "managed-ai-service",
  "dedicated-ai-capacity",
  "missing-critical-evidence",
  "stale-assessment",
  "expired-remediation",
  "revoked-evidence"
] as const;

const REASSESSMENT_TRIGGERS = [
  "supplier-service-change",
  "model-or-tool-change",
  "data-or-subprocessor-change",
  "location-or-capacity-change",
  "control-or-assurance-change",
  "contract-or-regulatory-change"
] as const;

test("supplier readiness schemas make freshness, revocation, and reassessment explicit", async () => {
  const assessmentSchema = await readJson("supplier-assessment.schema.json", SCHEMA_DIR);
  const decisionSchema = await readJson("supplier-readiness-decision.schema.json", SCHEMA_DIR);
  const evidenceSchema = assessmentSchema.properties.evidenceFamilies.items;

  assert.ok(assessmentSchema.required.includes("reassessmentTriggers"));
  assert.deepEqual(assessmentSchema.properties.reassessmentTriggers.items.enum, REASSESSMENT_TRIGGERS);
  assert.ok(evidenceSchema.required.includes("evidenceState"));
  assert.ok(evidenceSchema.required.includes("observedAt"));
  assert.ok(evidenceSchema.required.includes("validUntil"));
  assert.deepEqual(evidenceSchema.properties.evidenceState.enum, ["current", "revoked"]);
  assert.equal(decisionSchema.properties.schemaVersion.const, "1.1");
  assert.ok(decisionSchema.required.includes("decisionId"));
  assert.ok(decisionSchema.required.includes("scope"));

  const reasonCodes = decisionSchema.properties.reasonCodes.items.enum;
  for (const reasonCode of [
    "time-boundary-invalid",
    "evidence-revoked",
    "assessment-review-expired",
    "evidence-expired",
    "conditional-remediation-expired"
  ]) {
    assert.ok(reasonCodes.includes(reasonCode), `decision schema missing reason code: ${reasonCode}`);
  }
});

test("synthetic supplier assessments match closed metadata-only schemas", async () => {
  const assessmentSchema = await readJson("supplier-assessment.schema.json", SCHEMA_DIR);
  const decisionSchema = await readJson("supplier-readiness-decision.schema.json", SCHEMA_DIR);

  for (const scenario of SCENARIOS) {
    const assessment = await readJson(`${scenario}.assessment.json`, EXAMPLE_DIR);
    const decision = await readJson(`${scenario}.decision.json`, EXAMPLE_DIR);

    assertMatchesSchema(assessment, assessmentSchema);
    assertMatchesSchema(decision, decisionSchema);
    assert.equal(assessment.assessmentId, decision.assessmentId);
    assert.equal(decision.decisionId, `${decision.assessmentId}:${decision.evaluatedAt}`);
    assert.equal(decision.scope, assessment.scope);
    assert.ok(assessment.evidenceReferences.every((reference: string) => reference.startsWith("https://example.com/")));
  }
});

test("recorded supplier decisions are reproducible through the deterministic evaluator", async () => {
  const expectedOutcomes = {
    "managed-ai-service": "eligible",
    "dedicated-ai-capacity": "conditional",
    "missing-critical-evidence": "not-eligible",
    "stale-assessment": "not-eligible",
    "expired-remediation": "not-eligible",
    "revoked-evidence": "not-eligible"
  } as const;

  for (const scenario of SCENARIOS) {
    const assessment = await readJson(`${scenario}.assessment.json`, EXAMPLE_DIR);
    const recordedDecision = await readJson(`${scenario}.decision.json`, EXAMPLE_DIR);
    const evaluatedDecision = evaluateSupplierReadiness(assessment, recordedDecision.evaluatedAt);

    assert.equal(recordedDecision.decision, expectedOutcomes[scenario]);
    assert.deepEqual(evaluatedDecision, recordedDecision);
  }
});

test("supplier assessment schema rejects raw or undocumented evidence payloads", async () => {
  const schema = await readJson("supplier-assessment.schema.json", SCHEMA_DIR);
  const assessment = await readJson("managed-ai-service.assessment.json", EXAMPLE_DIR);

  assert.throws(
    () => assertMatchesSchema({ ...assessment, rawEvidence: "synthetic-secret-shaped-value" }, schema),
    /rawEvidence is not documented/
  );
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (schema.const !== undefined) {
    assert.deepEqual(value, schema.const, `${path} must match the documented constant`);
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
    if (schema.minItems !== undefined) assert.ok(value.length >= schema.minItems, `${path} has too few items`);
    if (schema.maxItems !== undefined) assert.ok(value.length <= schema.maxItems, `${path} has too many items`);
    if (schema.uniqueItems) {
      assert.equal(new Set(value.map((item) => JSON.stringify(item))).size, value.length, `${path} items must be unique`);
    }
    for (const [index, item] of value.entries()) {
      assertMatchesSchema(item, schema.items, `${path}[${index}]`);
    }
    return;
  }
  if (schema.type === "string") {
    assert.ok(typeof value === "string", `${path} must be a string`);
    if (schema.minLength !== undefined) assert.ok(value.length >= schema.minLength, `${path} is too short`);
    if (schema.format === "date-time") {
      assert.ok(Number.isFinite(Date.parse(value)), `${path} must be a valid date-time`);
    }
  }
  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${path} must be a boolean`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
