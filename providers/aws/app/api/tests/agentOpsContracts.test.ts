import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agentops-governance");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/agentops-governance");

test("AgentOps fixtures match the authorisation request contract", async () => {
  const schema = await readJson("tool-authorisation-request.schema.json", SCHEMA_DIR);
  const fixtures = await Promise.all([
    readJson("agent-action.allowed-read.json", EXAMPLE_DIR),
    readJson("agent-action.approval-required.json", EXAMPLE_DIR),
    readJson("agent-action.denied-tool.json", EXAMPLE_DIR),
    readJson("agent-action.paused-budget.json", EXAMPLE_DIR)
  ]);

  for (const fixture of fixtures) {
    assertMatchesSchema(fixture, schema);
  }

  assert.equal(fixtures[0].action.actionClass, "read");
  assert.equal(fixtures[1].action.actionClass, "high-impact");
  assert.equal(fixtures[2].action.toolId, "unapproved-tool");
  assert.equal(fixtures[3].governance.budgetConsumed, fixtures[3].governance.budgetLimit);
});

test("AgentOps authorisation request rejects tool input payload fields", async () => {
  const schema = await readJson("tool-authorisation-request.schema.json", SCHEMA_DIR);
  const fixture = await readJson("agent-action.allowed-read.json", EXAMPLE_DIR);

  assert.throws(
    () => assertMatchesSchema({ ...fixture, toolInput: "not accepted" }, schema),
    /not documented/
  );
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if ("const" in schema) {
    assert.deepEqual(value, schema.const, `${path} must equal the documented constant`);
  }

  for (const subSchema of schema.allOf ?? []) {
    assertMatchesSchema(value, subSchema, path);
  }

  if (schema.if && schema.then && matchesSchema(value, schema.if, path)) {
    assertMatchesSchema(value, schema.then, path);
  }

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
      if (key in value) {
        assertMatchesSchema(value[key], propertySchema, `${path}.${key}`);
      }
    }

    return;
  }

  if (schema.type === "array" || schema.items || typeof schema.minItems === "number") {
    assert.ok(Array.isArray(value), `${path} must be an array`);

    if (typeof schema.minItems === "number") {
      assert.ok(value.length >= schema.minItems, `${path} must include at least ${schema.minItems} item(s)`);
    }

    if (schema.items) {
      for (const [index, item] of value.entries()) {
        assertMatchesSchema(item, schema.items, `${path}[${index}]`);
      }
    }

    return;
  }

  if (schema.type === "string") {
    assert.equal(typeof value, "string", `${path} must be a string`);
  }

  if (schema.type === "number") {
    assert.equal(typeof value, "number", `${path} must be a number`);
  }

  if (schema.type === "boolean") {
    assert.equal(typeof value, "boolean", `${path} must be a boolean`);
  }

  if (schema.type === "null") {
    assert.equal(value, null, `${path} must be null`);
  }
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
