import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/control-plane-evidence");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/control-plane-evidence");
const REPOSITORY_ROOT = resolve(process.cwd(), "../../../..");

test("control-plane evidence map links all current synthetic governance lanes", async () => {
  const schema = await readJson("evidence-map.schema.json", SCHEMA_DIR);
  const fixture = await readJson("evidence-map.mock.json", EXAMPLE_DIR);

  assertMatchesSchema(fixture, schema);

  assert.deepEqual(fixture.evidenceLanes.map((lane: any) => lane.lane), [
    "runtime-agentops",
    "capability-governance",
    "rag-knowledge-lifecycle",
    "guardrails-as-a-service",
    "ai-assisted-review-evidence"
  ]);
  assert.deepEqual(fixture.evidenceLanes.map((lane: any) => lane.source), ["P6a", "P6b", "P6c", "P2", "P5b"]);
  assert.equal(fixture.evidenceLanes.length, 5);

  assert.ok(schema.required.includes("workloadDependencyCorrelation"));
  const correlation = fixture.workloadDependencyCorrelation;
  assert.equal(correlation.workloadId, "synthetic-agent-rag-inference");
  assert.equal(correlation.supplierAssessmentId, "synthetic-managed-ai-service");
  assert.equal(
    correlation.supplierDecisionId,
    "synthetic-managed-ai-service:2026-08-31T01:00:00.000Z"
  );
  assert.ok(
    correlation.evidencePaths.includes(
      "shared/examples/ai-workload-admission/managed-ai-service.admission.json"
    )
  );
  for (const evidencePath of correlation.evidencePaths) {
    JSON.parse(await readFile(resolve(REPOSITORY_ROOT, evidencePath), "utf8"));
  }

  assert.equal(fixture.boundaries.containsSensitiveData, false);
  assert.equal(fixture.boundaries.containsPromptTranscript, false);
  assert.equal(fixture.boundaries.executesRuntimeAction, false);
  assert.equal(fixture.boundaries.callsProvider, false);
  assert.equal(fixture.boundaries.deploysCloudResources, false);
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
    if (schema.format === "date-time") assert.ok(!Number.isNaN(Date.parse(stringValue)), `${path} must be a date-time string`);
  }

  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${path} must be a boolean`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
