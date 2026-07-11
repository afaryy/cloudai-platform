import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/rag-knowledge-lifecycle");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/rag-knowledge-lifecycle");

test("RAG knowledge lifecycle records document active and retired source states", async () => {
  const schema = await readJson("knowledge-source-lifecycle.schema.json", SCHEMA_DIR);
  const active = await readJson("demo-platform-handbook.active.json", EXAMPLE_DIR);
  const retired = await readJson("legacy-platform-handbook.retired.json", EXAMPLE_DIR);

  assertMatchesSchema(active, schema);
  assertMatchesSchema(retired, schema);
  assert.equal(active.lifecycleStatus, "active");
  assert.equal(active.allowedKnowledgeBases.includes("demo-platform-handbook"), true);
  assert.equal(retired.lifecycleStatus, "retired");
  assert.equal(retired.allowedKnowledgeBases.includes("legacy-platform-handbook"), true);
  assert.notEqual(retired.lifecycleStatus, "active");
});

test("RAG lifecycle contract rejects undocumented source metadata", async () => {
  const schema = await readJson("knowledge-source-lifecycle.schema.json", SCHEMA_DIR);
  const active = await readJson("demo-platform-handbook.active.json", EXAMPLE_DIR);

  assert.throws(
    () => assertMatchesSchema({ ...active, rawDocument: "not allowed" }, schema),
    /not documented/
  );
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
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
    for (const [index, item] of value.entries()) assertMatchesSchema(item, schema.items, `${path}[${index}]`);
    return;
  }

  if (schema.type === "string") assert.equal(typeof value, "string", `${path} must be a string`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
