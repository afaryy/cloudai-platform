import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/rag-governance");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/rag-governance");

test("governed RAG request fixture matches the request contract", async () => {
  const fixture = await readJson("rag-request.allowed.json", EXAMPLE_DIR);
  const schema = await readJson("rag-request.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.dataClassification, "synthetic-public");
  assert.equal(fixture.retrieval.allowedKnowledgeBases.includes("demo-platform-handbook"), true);
  assert.equal(fixture.governance.requireCitations, true);
  assert.equal(fixture.governance.allowExternalEgress, false);
});

test("governed RAG response fixture matches the response contract", async () => {
  const fixture = await readJson("rag-response.governed.json", EXAMPLE_DIR);
  const schema = await readJson("rag-response.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.response.citations.length > 0, true);
  assert.equal(fixture.governance.egressDecision.allowed, true);
  assert.equal(fixture.governance.egressDecision.scope, "controlled_response");
  assert.equal(fixture.governance.egressDecision.reason, "controlled_response_allowed_with_synthetic_sources");
  assert.equal(fixture.retrieval.sources[0].citationUrl, fixture.response.citations[0].citationUrl);
  assert.equal(typeof fixture.audit.requestId, "string");
});

test("RAG response contract rejects met citation requirement without citation evidence", async () => {
  const fixture = await readJson("rag-response.governed.json", EXAMPLE_DIR);
  const schema = await readJson("rag-response.schema.json", SCHEMA_DIR);
  const missingCitationEvidence = {
    ...fixture,
    response: {
      ...fixture.response,
      citations: []
    }
  };

  assert.throws(
    () => assertMatchesSchema(missingCitationEvidence, schema),
    /must include at least 1 item/
  );
});

test("RAG egress blocked fixture documents denied data egress shape", async () => {
  const fixture = await readJson("rag-egress-blocked.json", EXAMPLE_DIR);
  const schema = await readJson("rag-response.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.governance.egressDecision.allowed, false);
  assert.equal(fixture.governance.egressDecision.scope, "external_network");
  assert.equal(fixture.governance.egressDecision.reason, "external_egress_not_allowed_for_demo_policy");
  assert.deepEqual(fixture.response.citations, []);
});

async function readJson(fileName: string, directory: string): Promise<any> {
  const raw = await readFile(resolve(directory, fileName), "utf8");
  return JSON.parse(raw);
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
    const stringValue = value as string;

    if (schema.format === "date-time") {
      assert.ok(!Number.isNaN(Date.parse(stringValue)), `${path} must be a date-time string`);
    }
  }

  if (schema.type === "number") {
    assert.equal(typeof value, "number", `${path} must be a number`);
  }

  if (schema.type === "boolean") {
    assert.equal(typeof value, "boolean", `${path} must be a boolean`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesSchema(value: unknown, schema: any, path: string): boolean {
  try {
    assertMatchesSchema(value, schema, path);
    return true;
  } catch {
    return false;
  }
}
