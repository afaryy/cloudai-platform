import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { estimateMockCostUsd, estimateTokens } from "../src/lib/tokenEstimator.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/mock-genai-api");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/mock-genai-api");

test("demo chat request fixture matches the documented request contract", async () => {
  const fixture = await readJson("chat-request.allowed.json", EXAMPLE_DIR);
  const schema = await readJson("chat-request.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
});

test("demo chat response fixture matches the documented response contract", async () => {
  const requestFixture = await readJson("chat-request.allowed.json", EXAMPLE_DIR);
  const fixture = await readJson("chat-response.mock.json", EXAMPLE_DIR);
  const schema = await readJson("chat-response.schema.json", SCHEMA_DIR);
  const expectedResponse = `Mock CloudAI response: received ${requestFixture.prompt.length} characters and routed through the mock GenAI gateway.`;
  const expectedInputTokens = estimateTokens(requestFixture.prompt);
  const expectedOutputTokens = estimateTokens(expectedResponse);

  assertMatchesSchema(fixture, schema);
  assert.equal(fixture.response, expectedResponse);
  assert.equal(fixture.metadata.modelName, requestFixture.modelName);
  assert.equal(fixture.metadata.estimatedInputTokens, expectedInputTokens);
  assert.equal(fixture.metadata.estimatedOutputTokens, expectedOutputTokens);
  assert.equal(fixture.metadata.estimatedCostUsd, estimateMockCostUsd({
    inputTokens: expectedInputTokens,
    outputTokens: expectedOutputTokens
  }));
});

test("demo token budget error fixture matches the documented error contract", async () => {
  const fixture = await readJson("chat-error-token-budget.json", EXAMPLE_DIR);
  const schema = await readJson("error-response.schema.json", SCHEMA_DIR);

  assertMatchesSchema(fixture, schema);
});

test("demo request log fixture keeps prompt text out of local observability examples", async () => {
  const fixture = await readJson("request-log.mock.json", EXAMPLE_DIR);

  assert.equal(fixture.event, "mock_api_request");
  assert.equal(fixture.mode, "mock");
  assert.equal(fixture.method, "POST");
  assert.equal(fixture.route, "/chat");
  assert.equal(typeof fixture.requestId, "string");
  assert.equal(typeof fixture.statusCode, "number");
  assert.equal(typeof fixture.durationMs, "number");
  assert.equal(typeof fixture.timestamp, "string");
  assert.equal(typeof fixture.estimatedCostUsd, "number");
  assert.ok(!("prompt" in fixture), "request log fixture must not include prompt text");
  assert.ok(!("requestBody" in fixture), "request log fixture must not include request bodies");
});

async function readJson(fileName: string, directory: string): Promise<any> {
  const raw = await readFile(resolve(directory, fileName), "utf8");
  return JSON.parse(raw);
}

function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (Array.isArray(schema.anyOf)) {
    const matched = schema.anyOf.some((candidate: any) => matchesSchema(value, candidate, path));
    assert.ok(matched, `${path} must match one of the allowed schema variants`);
    return;
  }

  if (Array.isArray(schema.enum)) {
    assert.ok(schema.enum.includes(value), `${path} must be one of the documented enum values`);
  }

  if (schema.type === "object") {
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

  if (schema.type === "string") {
    assert.equal(typeof value, "string", `${path} must be a string`);
    const stringValue = value as string;

    if (typeof schema.minLength === "number") {
      assert.ok(stringValue.length >= schema.minLength, `${path} must be at least ${schema.minLength} characters`);
    }

    if (typeof schema.maxLength === "number") {
      assert.ok(stringValue.length <= schema.maxLength, `${path} must be at most ${schema.maxLength} characters`);
    }

    if (typeof schema.pattern === "string") {
      assert.match(stringValue, new RegExp(schema.pattern), `${path} must match pattern ${schema.pattern}`);
    }

    if (schema.format === "date-time") {
      assert.ok(!Number.isNaN(Date.parse(stringValue)), `${path} must be a date-time string`);
    }
  }

  if (schema.type === "number") {
    assert.equal(typeof value, "number", `${path} must be a number`);
    const numberValue = value as number;

    if (typeof schema.minimum === "number") {
      assert.ok(numberValue >= schema.minimum, `${path} must be at least ${schema.minimum}`);
    }
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
