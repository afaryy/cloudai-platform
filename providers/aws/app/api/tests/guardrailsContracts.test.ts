import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/guardrails-as-a-service");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/guardrails-as-a-service");

test("GaaS fixtures document allow, redact, deny, and approval-required verdicts", async () => {
  const requestSchema = await readJson("guardrail-assessment-request.schema.json", SCHEMA_DIR);
  const verdictSchema = await readJson("guardrail-verdict.schema.json", SCHEMA_DIR);
  const fixtures = await Promise.all([
    readJson("safe-allow.request.json", EXAMPLE_DIR),
    readJson("pii-redact.request.json", EXAMPLE_DIR),
    readJson("jailbreak-deny.request.json", EXAMPLE_DIR),
    readJson("high-risk-review.request.json", EXAMPLE_DIR),
    readJson("safe-allow.verdict.json", EXAMPLE_DIR),
    readJson("pii-redact.verdict.json", EXAMPLE_DIR),
    readJson("jailbreak-deny.verdict.json", EXAMPLE_DIR),
    readJson("high-risk-review.verdict.json", EXAMPLE_DIR)
  ]);

  for (const fixture of fixtures.slice(0, 4)) assertMatchesSchema(fixture, requestSchema);
  for (const fixture of fixtures.slice(4)) assertMatchesSchema(fixture, verdictSchema);

  assert.deepEqual(fixtures.slice(4).map((fixture) => fixture.verdict), ["allow", "redact", "deny", "approval-required"]);
  assert.equal("content" in fixtures[0], false);
  assert.ok(requestSchema.properties.syntheticSignals.oneOf, "schema must keep none separate from risk signals");
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (Array.isArray(schema.oneOf)) assert.ok(schema.oneOf.some((option: any) => matchesSchema(value, option, path)), `${path} must match one documented variant`);
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
    if (typeof schema.maxItems === "number") assert.ok(value.length <= schema.maxItems, `${path} must have at most ${schema.maxItems} items`);
    for (const [index, item] of value.entries()) assertMatchesSchema(item, schema.items ?? {}, `${path}[${index}]`);
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
