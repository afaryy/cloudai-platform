import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(process.cwd(), "../../../..");
const EXAMPLES = resolve(ROOT, "shared/examples/agent-evaluation-telemetry");
const SCHEMAS = resolve(ROOT, "shared/schemas/agent-evaluation-telemetry");

test("provider-parity-v1 fixes three evaluators, thresholds, tolerance, and six calls", async () => {
  const policy = JSON.parse(await readFile(
    resolve(EXAMPLES, "provider-parity-thresholds.v1.json"), "utf8"));
  assert.deepEqual(policy, {
    contractVersion: "1.0",
    profileId: "provider-parity-v1",
    scenarioId: "synthetic-cited-answer",
    evaluatorThresholds: {
      "Builtin.Correctness": 0.70,
      "Builtin.ToolSelectionAccuracy": 0.70,
      "Builtin.GoalSuccessRate": 0.70
    },
    maximumParityDelta: 0.20,
    maximumProviderCalls: 6
  });
});

test("provider-direct schema is closed and contains no raw-content fields", async () => {
  const schema = JSON.parse(await readFile(
    resolve(SCHEMAS, "provider-parity-report.schema.json"), "utf8"));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.evidenceLevel.const, "provider-direct");
  const serialized = JSON.stringify(schema).toLowerCase();
  for (const forbidden of [
    "prompt", "response", "assertion", "trajectory", "toolarguments",
    "toolresult", "sessionspans", "explanation", "errormessage",
    "accountid", "resourcearn", "endpoint"
  ]) assert.equal(serialized.includes(`\"${forbidden}\"`), false, forbidden);
});
