import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(process.cwd(), "../../../..");
const SCHEMA_DIR = resolve(ROOT, "shared/schemas/agent-evaluation-telemetry");
const EXAMPLE_DIR = resolve(ROOT, "shared/examples/agent-evaluation-telemetry");

test("agent evaluation telemetry contracts define both supported conventions", async () => {
  const [otelFixtures, openInferenceFixtures] = await Promise.all([
    readJson("otel-genai.traces.v1.json"),
    readJson("openinference.traces.v1.json")
  ]);

  assert.ok(Array.isArray(otelFixtures));
  assert.ok(Array.isArray(openInferenceFixtures));
  assert.ok(otelFixtures.every((fixture: any) => fixture.convention === "otel-genai"));
  assert.ok(openInferenceFixtures.every((fixture: any) => fixture.convention === "openinference"));
  assert.ok(otelFixtures.flatMap((fixture: any) => fixture.spans).every((span: any) =>
    span.scopeName.startsWith("opentelemetry.instrumentation.")));
  assert.ok(openInferenceFixtures.flatMap((fixture: any) => fixture.spans).every((span: any) =>
    span.scopeName.startsWith("openinference.instrumentation.")));
});

test("agent evaluation scenarios preserve the six fixed behavioural cases", async () => {
  const scenarios = await readJson("scenarios.v1.json");

  assert.deepEqual(scenarios.map((scenario: any) => scenario.scenarioId), [
    "synthetic-cited-answer",
    "synthetic-citation-missing",
    "synthetic-stale-source",
    "synthetic-provider-timeout",
    "synthetic-denied-tool",
    "synthetic-human-approval-boundary"
  ]);
  assert.ok(scenarios.every((scenario: any) => scenario.thresholdProfile === "strict-v1"));
  assert.ok(scenarios.every((scenario: any) => scenario.syntheticOnly === true));
});

test("strict threshold policy requires every dimension to pass", async () => {
  const policy = await readJson("thresholds.v1.json");

  assert.equal(policy.contractVersion, "1.0");
  assert.equal(policy.profileId, "strict-v1");
  assert.deepEqual(policy.minimumScores, {
    telemetry_compatibility: 1,
    trace_completeness: 1,
    tool_trajectory_accuracy: 1,
    behavioural_outcome: 1,
    goal_success: 1
  });
});

test("schemas describe fixture, scenario, threshold, and safe report boundaries", async () => {
  const schemaNames = [
    "telemetry-fixture.schema.json",
    "evaluation-scenario.schema.json",
    "threshold-policy.schema.json",
    "evaluation-report.schema.json"
  ];

  const schemas = await Promise.all(schemaNames.map(async (name) => {
    const raw = await readFile(resolve(SCHEMA_DIR, name), "utf8");
    return JSON.parse(raw);
  }));

  assert.ok(schemas.every((schema) => schema.$schema === "https://json-schema.org/draft/2020-12/schema"));
  assert.ok(schemas.every((schema) => schema.additionalProperties === false));

  const reportSchema = schemas[3];
  const serialized = JSON.stringify(reportSchema).toLowerCase();
  for (const forbidden of ["credential", "secret", "endpoint", "accountid", "resourcearn", "prompt", "response", "toolarguments", "tooloutput"]) {
    assert.equal(serialized.includes(`\"${forbidden}\"`), false, `report schema must not expose ${forbidden}`);
  }
});

async function readJson(fileName: string): Promise<any> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8"));
}
