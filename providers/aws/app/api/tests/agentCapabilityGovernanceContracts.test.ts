import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agent-capability-governance");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/agent-capability-governance");
const DOC_PATH = resolve(process.cwd(), "../../../../docs/agent-capability-governance.md");

const SCENARIOS = ["knowledge-search", "external-export", "change-summary"] as const;
const CONTRACTS = [
  ["capability", "capability-record.schema.json"],
  ["skill-card", "skill-card.schema.json"],
  ["evidence", "capability-evidence.schema.json"],
  ["decision", "capability-admission-decision.schema.json"]
] as const;

test("approved capability is supported by complete synthetic governance evidence", async () => {
  const capability = await readJson("knowledge-search.capability.json", EXAMPLE_DIR);
  const skillCard = await readJson("knowledge-search.skill-card.json", EXAMPLE_DIR);
  const evidence = await readJson("knowledge-search.evidence.json", EXAMPLE_DIR);
  const decision = await readJson("knowledge-search.decision.json", EXAMPLE_DIR);

  assert.equal(capability.capabilityId, "synthetic-knowledge-search");
  assert.equal(skillCard.capabilityId, capability.capabilityId);
  assert.equal(evidence.capabilityId, capability.capabilityId);
  assert.equal(decision.capabilityId, capability.capabilityId);
  assert.equal(evidence.scan.status, "passed");
  assert.equal(evidence.evaluation.status, "passed");
  assert.equal(evidence.integrity.status, "not-implemented");
  assert.equal(decision.decision, "approved");
  assert.equal(capability.declaredPermissions.network.length, 0);
});

test("all capability governance fixtures match their closed schemas", async () => {
  for (const scenario of SCENARIOS) {
    for (const [recordType, schemaName] of CONTRACTS) {
      const fixture = await readJson(`${scenario}.${recordType}.json`, EXAMPLE_DIR);
      const schema = await readJson(schemaName, SCHEMA_DIR);
      assertMatchesSchema(fixture, schema);
    }
  }
});

test("blocked and approval-required capabilities remain distinct from approved assets", async () => {
  const blockedEvidence = await readJson("external-export.evidence.json", EXAMPLE_DIR);
  const blockedDecision = await readJson("external-export.decision.json", EXAMPLE_DIR);
  const reviewDecision = await readJson("change-summary.decision.json", EXAMPLE_DIR);

  assert.equal(blockedEvidence.scan.status, "failed");
  assert.equal(blockedDecision.decision, "blocked");
  assert.equal(reviewDecision.decision, "approval-required");
  assert.notEqual(blockedDecision.decision, "approved");
  assert.notEqual(reviewDecision.decision, "approved");
});

test("capability governance documentation distinguishes admission from runtime controls", async () => {
  const documentation = await readFile(DOC_PATH, "utf8");

  assert.match(documentation, /## Capability Governance/);
  assert.match(documentation, /## Runtime Governance/);
  assert.match(documentation, /No agent runtime, tool executor, provider call, cloud deployment, or traffic proxy is implemented/);
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (Array.isArray(schema.anyOf)) {
    assert.ok(schema.anyOf.some((subSchema: any) => matchesSchema(value, subSchema, path)));
    return;
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
  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${path} must be a boolean`);
}

function matchesSchema(value: unknown, schema: any, path: string): boolean {
  try {
    assertMatchesSchema(value, schema, path);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
