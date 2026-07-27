import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/control-plane-evidence");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/control-plane-evidence");
const DOC_PATH = resolve(process.cwd(), "../../../../docs/evidence/control-plane-evidence-scenarios.md");

test("control-plane evidence scenarios cover key governance outcomes", async () => {
  const schema = await readJson("evidence-scenarios.schema.json", SCHEMA_DIR);
  const fixture = await readJson("evidence-scenarios.mock.json", EXAMPLE_DIR);

  assertMatchesSchema(fixture, schema);

  assert.deepEqual(fixture.scenarios.map((scenario: any) => scenario.outcome), [
    "allowed",
    "denied",
    "approval-required",
    "blocked-before-runtime",
    "retired-source-blocked"
  ]);
  assert.equal(fixture.boundaries.containsSensitiveData, false);
  assert.equal(fixture.boundaries.containsPromptTranscript, false);
  assert.equal(fixture.boundaries.executesRuntimeAction, false);
  assert.equal(fixture.boundaries.callsProvider, false);
  assert.equal(fixture.boundaries.deploysCloudResources, false);
  assert.equal(fixture.boundaries.persistsAuditRecords, false);
});

test("control-plane evidence scenarios distinguish runtime, capability, and knowledge lifecycle controls", async () => {
  const fixture = await readJson("evidence-scenarios.mock.json", EXAMPLE_DIR);
  const lanes = new Set(fixture.scenarios.flatMap((scenario: any) => scenario.evidenceRefs.map((ref: any) => ref.lane)));

  assert.ok(lanes.has("runtime-agentops"));
  assert.ok(lanes.has("capability-governance"));
  assert.ok(lanes.has("rag-knowledge-lifecycle"));
  assert.ok(lanes.has("guardrails-as-a-service"));

  const blockedCapability = fixture.scenarios.find((scenario: any) => scenario.outcome === "blocked-before-runtime");
  const retiredSource = fixture.scenarios.find((scenario: any) => scenario.outcome === "retired-source-blocked");

  assert.equal(blockedCapability.evidenceRefs.every((ref: any) => ref.lane === "capability-governance"), true);
  assert.equal(retiredSource.evidenceRefs.every((ref: any) => ref.lane === "rag-knowledge-lifecycle"), true);
});

test("control-plane evidence scenario documentation explains the demo purpose and boundary", async () => {
  const documentation = await readFile(DOC_PATH, "utf8");

  assert.match(documentation, /## Scenario Outcomes/);
  assert.match(documentation, /P6d is one end-to-end evidence map\. P6e is a scenario pack/);
  assert.match(documentation, /does not:\n\n- execute agent actions/);
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if ("const" in schema) assert.equal(value, schema.const, `${path} must equal ${schema.const}`);
  if (Array.isArray(schema.enum)) assert.ok(schema.enum.includes(value), `${path} must be documented`);

  if (schema.type === "object" || schema.properties) {
    assert.ok(isRecord(value), `${path} must be an object`);
    for (const key of schema.required ?? []) assert.ok(key in value, `${path} missing ${key}`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) assert.ok(key in schema.properties, `${path}.${key} is not documented`);
    }
    for (const [key, propertySchema] of Object.entries<any>(schema.properties ?? {})) {
      if (key in value) assertMatchesSchema(value[key], propertySchema, `${path}.${key}`);
    }
    return;
  }

  if (schema.type === "array" || schema.items) {
    assert.ok(Array.isArray(value), `${path} must be an array`);
    if (typeof schema.minItems === "number") assert.ok(value.length >= schema.minItems, `${path} must have at least ${schema.minItems} items`);
    if (typeof schema.maxItems === "number") assert.ok(value.length <= schema.maxItems, `${path} must have at most ${schema.maxItems} items`);
    for (const [index, item] of value.entries()) assertMatchesSchema(item, schema.items ?? {}, `${path}[${index}]`);
    return;
  }

  if (schema.type === "string") {
    assert.equal(typeof value, "string", `${path} must be a string`);
    const stringValue = value as string;
    if (typeof schema.minLength === "number") assert.ok(stringValue.length >= schema.minLength, `${path} must be at least ${schema.minLength} characters`);
    if (typeof schema.pattern === "string") assert.match(stringValue, new RegExp(schema.pattern), `${path} must match ${schema.pattern}`);
  }

  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${path} must be a boolean`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
