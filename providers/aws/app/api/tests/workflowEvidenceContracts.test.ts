import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/workflow-evidence");

test("workflow request fixture is strict metadata-only input", async () => {
  const fixture = await readJson("allowed-read.request.json");

  assert.equal(fixture.workflowId, "workflow_demo_allowed_0001");
  assert.equal("prompt" in fixture, false);
  assert.equal("toolInput" in fixture, false);
  assert.equal(fixture.acceptanceChecks.includes("within-budget"), true);
});

async function readJson(fileName: string): Promise<any> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8"));
}
