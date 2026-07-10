import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createMockApiServer } from "../src/server.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/rag-governance");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/rag-governance");

test("GET /rag/status describes local RAG governance workflow boundaries", async () => {
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/rag/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.workflow, "local-rag-governance");
    assert.equal(body.mode, "mock");
    assert.equal(body.status, "available");
    assert.equal(body.boundaries.embeddings, false);
    assert.equal(body.boundaries.vectorIndex, false);
    assert.equal(body.boundaries.modelCalls, false);
    assert.equal(body.boundaries.cloudDeployment, false);
    assert.equal(body.boundaries.pythonExecutionFromApi, false);
    assert.ok(body.artifacts.chunkExport.endsWith("cloudai-rag-chunks.json"));
    assert.ok(body.artifacts.evalDataset.endsWith("cloudai-rag-eval-dataset.json"));
    assert.ok(body.artifacts.scoreReport.endsWith("cloudai-rag-score-report.json"));
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("GET /rag/artifacts returns contract and sample artifact metadata", async () => {
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/rag/artifacts`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.mode, "mock");
    assert.equal(body.artifacts.length, 6);
    assert.deepEqual(
      body.artifacts.map((artifact: any) => artifact.kind),
      ["schema", "schema", "sample-output", "sample-output", "sample-output", "documentation"]
    );
    assert.equal(
      body.artifacts.some((artifact: any) => artifact.path === "shared/schemas/rag-governance/rag-request.schema.json"),
      true
    );
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("RAG status fixture matches the documented status schema", async () => {
  const fixture = await readJson("rag-status.mock.json", EXAMPLE_DIR);
  const schema = await readJson("rag-status.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.boundaries.cloudDeployment, false);
  assert.equal(fixture.boundaries.modelCalls, false);
});

test("RAG artifacts fixture matches the documented artifacts schema", async () => {
  const fixture = await readJson("rag-artifacts.mock.json", EXAMPLE_DIR);
  const schema = await readJson("rag-artifacts.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.artifacts.length, 6);
});

async function readJson(fileName: string, directory: string): Promise<any> {
  const raw = await readFile(resolve(directory, fileName), "utf8");
  return JSON.parse(raw);
}

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (Array.isArray(schema.enum)) {
    assert.ok(schema.enum.includes(value), `${path} must be one of the documented enum values`);
  }

  if ("const" in schema) {
    assert.deepEqual(value, schema.const, `${path} must equal the documented constant`);
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

  if (schema.type === "array") {
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

  if (schema.type === "boolean") {
    assert.equal(typeof value, "boolean", `${path} must be a boolean`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
