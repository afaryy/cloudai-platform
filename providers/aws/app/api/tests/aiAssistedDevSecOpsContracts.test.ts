import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-assisted-devsecops");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-assisted-devsecops");

test("AI-assisted DevSecOps evidence fixtures match the review evidence contract", async () => {
  const schema = await readJson("review-evidence.schema.json", SCHEMA_DIR);
  const fixtures = await Promise.all([
    readJson("ai-review-summary.mock.json", EXAMPLE_DIR),
    readJson("threat-model-checklist.mock.json", EXAMPLE_DIR),
    readJson("ci-failure-summary.mock.json", EXAMPLE_DIR),
    readJson("release-note-draft.mock.json", EXAMPLE_DIR)
  ]);

  for (const fixture of fixtures) assertMatchesSchema(fixture, schema);

  assert.deepEqual(fixtures.map((fixture) => fixture.evidenceType), [
    "ai-review-summary",
    "threat-model-checklist",
    "ci-failure-summary",
    "release-note-draft"
  ]);
  assert.ok(fixtures.every((fixture) => fixture.safeContext.containsSensitiveData === false));
  assert.ok(fixtures.every((fixture) => fixture.safeContext.containsPromptTranscript === false));
  assert.ok(fixtures.every((fixture) => fixture.humanReview.notes.length > 10));
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
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) assert.ok(key in schema.properties, `${path}.${key} is not documented`);
    for (const [key, propertySchema] of Object.entries<any>(schema.properties ?? {})) if (key in value) assertMatchesSchema(value[key], propertySchema, `${path}.${key}`);
    return;
  }

  if (schema.type === "array" || schema.items) {
    assert.ok(Array.isArray(value), `${path} must be an array`);
    if (typeof schema.minItems === "number") assert.ok(value.length >= schema.minItems, `${path} must have at least ${schema.minItems} items`);
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
