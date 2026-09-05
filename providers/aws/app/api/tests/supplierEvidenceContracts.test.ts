import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertMatchesSchema } from "./helpers/schemaAssertion.js";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-supplier-evidence");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-supplier-evidence");

const SCHEMA_NAMES = [
  "synthetic-evidence-manifest",
  "evidence-candidate",
  "human-review-record",
  "versioned-evidence-record"
] as const;

const FIXTURE_NAMES = [
  "managed-service.manifest.json",
  "managed-service.candidate.json",
  "managed-service.review.json",
  "managed-service.record.json",
  "revoked.record.json"
] as const;

const FIXTURE_SCHEMAS = {
  "managed-service.manifest.json": "synthetic-evidence-manifest",
  "managed-service.candidate.json": "evidence-candidate",
  "managed-service.review.json": "human-review-record",
  "managed-service.record.json": "versioned-evidence-record",
  "revoked.record.json": "versioned-evidence-record"
} as const;

test("supplier evidence contracts are closed and versioned", async () => {
  for (const name of SCHEMA_NAMES) {
    const schema = await readJson(`${name}.schema.json`, SCHEMA_DIR);
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.schemaVersion.const, "1.0");
  }
});

test("synthetic supplier evidence fixtures match their closed contracts", async () => {
  for (const file of FIXTURE_NAMES) {
    const fixture = await readJson(file, EXAMPLE_DIR);
    const schema = await readJson(`${FIXTURE_SCHEMAS[file]}.schema.json`, SCHEMA_DIR);
    assertMatchesSchema(fixture, schema);
  }
});

test("public fixtures contain metadata only", async () => {
  for (const file of FIXTURE_NAMES) {
    const text = await readFile(resolve(EXAMPLE_DIR, file), "utf8");
    for (const prohibited of [
      "rawEvidence",
      "documentContent",
      "personalName",
      "prompt",
      "credential",
      "signature",
      "questionnaire"
    ]) {
      assert.equal(text.includes(prohibited), false, `${file} contains prohibited field: ${prohibited}`);
    }
  }
});

test("manifest contract rejects undocumented, personal, version, and digest failures", async () => {
  const schema = await readJson("synthetic-evidence-manifest.schema.json", SCHEMA_DIR);
  const fixture = await readJson("managed-service.manifest.json", EXAMPLE_DIR);

  assert.throws(
    () => assertMatchesSchema({ ...fixture, undocumentedField: "synthetic" }, schema),
    /undocumentedField is not documented/
  );
  assert.throws(
    () => assertMatchesSchema({ ...fixture, personalName: "Synthetic Reviewer" }, schema),
    /personalName is not documented/
  );
  assert.throws(
    () => assertMatchesSchema({ ...fixture, schemaVersion: "2.0" }, schema),
    /documented constant/
  );

  const { contentDigest: _removed, ...withoutDigest } = fixture;
  assert.throws(() => assertMatchesSchema(withoutDigest, schema), /missing required field: contentDigest/);
});

test("review contract rejects fields that conflict with the review state", async () => {
  const schema = await readJson("human-review-record.schema.json", SCHEMA_DIR);
  const fixture = await readJson("managed-service.review.json", EXAMPLE_DIR);

  assert.throws(
    () =>
      assertMatchesSchema(
        {
          ...fixture,
          reviewAction: "rejected",
          reasonCodes: ["human-rejected"]
        },
        schema
      ),
    /exactly one documented variant/
  );
});

test("record contract rejects fields that conflict with the lifecycle state", async () => {
  const schema = await readJson("versioned-evidence-record.schema.json", SCHEMA_DIR);
  const current = await readJson("managed-service.record.json", EXAMPLE_DIR);
  const revoked = await readJson("revoked.record.json", EXAMPLE_DIR);

  assert.throws(
    () =>
      assertMatchesSchema(
        {
          ...current,
          revocationReasonCode: "source-revoked",
          revokedAt: "2026-09-06T00:00:00.000Z"
        },
        schema
      ),
    /exactly one documented variant/
  );
  assert.throws(
    () =>
      assertMatchesSchema(
        {
          ...revoked,
          recordState: "current"
        },
        schema
      ),
    /exactly one documented variant/
  );
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}
