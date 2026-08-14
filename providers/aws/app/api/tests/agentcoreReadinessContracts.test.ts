import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/agentcore-readiness");

test("AgentCore readiness request accepts only a gateway-only read-only knowledge lookup", async () => {
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
    () => assertMatchesSchema({ ...request, route: "direct-runtime" }, schema),
    /documented enum values/
  );
});

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
