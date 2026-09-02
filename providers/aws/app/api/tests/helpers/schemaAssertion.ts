import assert from "node:assert/strict";

export function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((candidate: any) => matchesSchema(value, candidate, path));
    assert.equal(matches.length, 1, `${path} must match exactly one documented variant`);
  }

  if ("const" in schema) assert.deepEqual(value, schema.const, `${path} must match the documented constant`);
  if (Array.isArray(schema.enum)) assert.ok(schema.enum.includes(value), `${path} must be documented`);

  if (schema.type === "object" || schema.properties) {
    assert.ok(isRecord(value), `${path} must be an object`);
    for (const key of schema.required ?? []) assert.ok(key in value, `${path} missing required field: ${key}`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert.ok(key in (schema.properties ?? {}), `${path}.${key} is not documented`);
      }
    }
    for (const [key, childSchema] of Object.entries<any>(schema.properties ?? {})) {
      if (key in value) assertMatchesSchema(value[key], childSchema, `${path}.${key}`);
    }
    return;
  }

  if (schema.type === "array" || schema.items) {
    assert.ok(Array.isArray(value), `${path} must be an array`);
    if (typeof schema.minItems === "number") assert.ok(value.length >= schema.minItems, `${path} has too few items`);
    if (typeof schema.maxItems === "number") assert.ok(value.length <= schema.maxItems, `${path} has too many items`);
    if (schema.uniqueItems) {
      assert.equal(new Set(value.map((item) => JSON.stringify(item))).size, value.length, `${path} items must be unique`);
    }
    for (const [index, item] of value.entries()) {
      assertMatchesSchema(item, schema.items ?? {}, `${path}[${index}]`);
    }
    return;
  }

  if (schema.type === "string") {
    assert.ok(typeof value === "string", `${path} must be a string`);
    const stringValue = value as string;
    if (typeof schema.minLength === "number") assert.ok(stringValue.length >= schema.minLength, `${path} is too short`);
    if (typeof schema.maxLength === "number") assert.ok(stringValue.length <= schema.maxLength, `${path} is too long`);
    if (typeof schema.pattern === "string") assert.match(stringValue, new RegExp(schema.pattern), `${path} has an invalid format`);
    if (schema.format === "date-time") assert.ok(Number.isFinite(Date.parse(stringValue)), `${path} must be a date-time`);
    if (schema.format === "uri") assert.doesNotThrow(() => new URL(stringValue), `${path} must be a URI`);
  }

  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${path} must be a boolean`);
  if (schema.type === "integer" || schema.type === "number") {
    assert.ok(typeof value === "number", `${path} must be a number`);
    const numberValue = value as number;
    if (schema.type === "integer") assert.ok(Number.isInteger(numberValue), `${path} must be an integer`);
    if (typeof schema.minimum === "number") assert.ok(numberValue >= schema.minimum, `${path} is below minimum`);
    if (typeof schema.maximum === "number") assert.ok(numberValue <= schema.maximum, `${path} is above maximum`);
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
