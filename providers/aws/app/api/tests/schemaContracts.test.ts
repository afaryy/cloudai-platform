import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { MockBedrockClient } from "../src/clients/mockBedrockClient.js";
import { postChat } from "../src/routes/chat.js";
import { createMockApiServer } from "../src/server.js";
import { DEFAULT_POLICY_PROFILE } from "../src/lib/policyProfile.js";
import { normalizeChatRequest } from "../src/lib/validation.js";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/mock-genai-api");

test("chat request schema documents the current request contract", async () => {
  const schema = await readSchema("chat-request.schema.json");

  assert.deepEqual(schema.required, ["prompt"]);
  assert.equal(schema.additionalProperties, true);
  assert.equal(schema.properties.prompt.type, "string");
  assert.equal(schema.properties.prompt.maxLength, DEFAULT_POLICY_PROFILE.maxPromptCharacters);
  assert.equal(schema.properties.prompt.pattern, ".*\\S.*");
  assert.deepEqual(schema.properties.modelName.anyOf[0].enum, [...DEFAULT_POLICY_PROFILE.allowedModelNames]);
  assert.equal(schema.properties.modelName.anyOf[1].pattern, "^\\s*$");
});

test("chat request schema reflects current normalization behavior", async () => {
  const schema = await readSchema("chat-request.schema.json");
  const normalized = normalizeChatRequest({
    prompt: " hello ",
    modelName: " ",
    extraDemoField: "accepted but ignored"
  });

  assert.equal(schema.additionalProperties, true);
  assert.equal(normalized.prompt, "hello");
  assert.equal(normalized.modelName, "mock-bedrock-claude");
});

test("chat response schema documents metadata fields", async () => {
  const schema = await readSchema("chat-response.schema.json");
  const metadata = schema.properties.metadata;

  assert.equal(Array.isArray(metadata.anyOf), true);
  assert.equal(metadata.anyOf.length, 2);
  assert.deepEqual(metadata.anyOf[0].required, [
    "requestId",
    "modelName",
    "estimatedInputTokens",
    "estimatedOutputTokens",
    "estimatedCostUsd",
    "usage",
    "timestamp"
  ]);
  assert.deepEqual(metadata.anyOf[1].required, ["requestId", "modelName", "usage", "timestamp"]);
  assert.equal(metadata.anyOf[1].properties.usage.properties.source.const, "provider-reported");
});

test("chat response schema matches an actual mock response payload", async () => {
  const schema = await readSchema("chat-response.schema.json");
  const response = await postChat(new MockBedrockClient(), {
    prompt: "Summarize the CloudAI control plane."
  });

  assertMatchesObjectSchema(response, schema);
});

test("error response schema documents mock API error codes", async () => {
  const schema = await readSchema("error-response.schema.json");
  const errorCodes = schema.properties.error.properties.code.enum;

  assert.ok(errorCodes.includes("empty_prompt"));
  assert.ok(errorCodes.includes("invalid_guardrail_assessment_request"));
  assert.ok(errorCodes.includes("token_budget_exceeded"));
  assert.ok(errorCodes.includes("unsupported_model"));
});

test("error response schema matches an actual validation error payload", async () => {
  const schema = await readSchema("error-response.schema.json");
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: " " })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assertMatchesObjectSchema(body, schema);
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

async function readSchema(fileName: string): Promise<any> {
  const raw = await readFile(resolve(SCHEMA_DIR, fileName), "utf8");
  return JSON.parse(raw);
}

function assertMatchesObjectSchema(value: unknown, schema: any): void {
  assert.ok(isRecord(value));
  assert.equal(schema.type, "object");

  for (const requiredKey of schema.required ?? []) {
    assert.ok(requiredKey in value, `missing required field: ${requiredKey}`);
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      assert.ok(key in schema.properties, `unexpected field: ${key}`);
    }
  }

  for (const [key, propertySchema] of Object.entries<any>(schema.properties ?? {})) {
    if (!(key in value)) {
      continue;
    }

    assertMatchesPropertySchema(value[key], propertySchema, key);
  }
}

function assertMatchesPropertySchema(value: unknown, schema: any, path: string): void {
  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.some((candidate: any) => {
      try {
        assertMatchesPropertySchema(value, candidate, path);
        return true;
      } catch {
        return false;
      }
    });
    assert.ok(matches, `${path} must match one of the documented schema variants`);
    return;
  }

  if (schema.type === "object") {
    assertMatchesObjectSchema(value, schema);
    return;
  }

  if (schema.type === "string") {
    assert.equal(typeof value, "string", `${path} must be a string`);
  }

  if (schema.type === "number") {
    assert.equal(typeof value, "number", `${path} must be a number`);
  }

  if (Array.isArray(schema.enum)) {
    assert.ok(schema.enum.includes(value), `${path} must be one of the documented enum values`);
  }
}

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
