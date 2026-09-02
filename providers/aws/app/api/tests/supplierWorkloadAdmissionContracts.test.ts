import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertMatchesSchema } from "./helpers/schemaAssertion.js";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-workload-admission");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-workload-admission");

test("conditional supplier acceptance is bounded and metadata-only", async () => {
  const schema = await readJson("conditional-supplier-acceptance.schema.json", SCHEMA_DIR);
  const acceptance = await readJson("dedicated-ai-capacity.acceptance.json", EXAMPLE_DIR);

  assertMatchesSchema(acceptance, schema);
  assert.equal(acceptance.acceptanceState, "accepted");
  assert.deepEqual(acceptance.acceptedEvidenceFamilies, ["sustainability-location"]);
  assert.equal(acceptance.acceptedByRole, "platform-governance-reviewer");
  assert.ok(acceptance.evidenceReferences.every((value: string) => value.startsWith("https://example.com/")));

  assert.throws(
    () => assertMatchesSchema({ ...acceptance, rawApproval: "not-allowed" }, schema),
    /not documented/
  );
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}
