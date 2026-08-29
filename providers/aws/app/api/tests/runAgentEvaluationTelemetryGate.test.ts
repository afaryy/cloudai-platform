import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  parseAgentEvaluationOutputPath,
  runAgentEvaluationTelemetryGate
} from "../src/scripts/runAgentEvaluationTelemetryGate.js";
import type { TelemetryFixture } from "../src/evals/agentEvaluationTelemetryTypes.js";

const ROOT = resolve(process.cwd(), "../../../..");
const EXAMPLE_DIR = resolve(ROOT, "shared/examples/agent-evaluation-telemetry");

test("runner evaluates both conventions and writes a passing metadata-only report", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "cloudai-agent-eval-"));
  const outputPath = resolve(directory, "report.json");

  const summary = await runAgentEvaluationTelemetryGate({
    scenarioPath: resolve(EXAMPLE_DIR, "scenarios.v1.json"),
    fixturePaths: [
      resolve(EXAMPLE_DIR, "otel-genai.traces.v1.json"),
      resolve(EXAMPLE_DIR, "openinference.traces.v1.json")
    ],
    thresholdPath: resolve(EXAMPLE_DIR, "thresholds.v1.json"),
    outputPath,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "test-commit"
  });

  assert.equal(summary.totalScenarioCount, 12);
  assert.equal(summary.passedScenarioCount, 12);
  assert.equal(summary.failedScenarioCount, 0);
  assert.equal(summary.status, "passed");
  assert.ok(summary.results.every((result) => result.status === "passed"));
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), summary);
});

test("runner rejects a below-threshold fixture and writes only a failed report", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "cloudai-agent-eval-failed-"));
  const sourceFixtures = JSON.parse(await readFile(resolve(EXAMPLE_DIR, "otel-genai.traces.v1.json"), "utf8")) as TelemetryFixture[];
  const cited = sourceFixtures.find((fixture) => fixture.scenarioId === "synthetic-cited-answer");
  assert.ok(cited);
  const toolSpan = cited.spans.find((span) => span.attributes["gen_ai.operation.name"] === "execute_tool");
  assert.ok(toolSpan);
  toolSpan.attributes["gen_ai.tool.name"] = "wrong_tool";
  const fixturePath = resolve(directory, "failed-fixtures.json");
  const outputPath = resolve(directory, "failed-report.json");
  await writeFile(fixturePath, `${JSON.stringify(sourceFixtures, null, 2)}\n`, "utf8");

  await assert.rejects(() => runAgentEvaluationTelemetryGate({
    scenarioPath: resolve(EXAMPLE_DIR, "scenarios.v1.json"),
    fixturePaths: [
      fixturePath,
      resolve(EXAMPLE_DIR, "openinference.traces.v1.json")
    ],
    thresholdPath: resolve(EXAMPLE_DIR, "thresholds.v1.json"),
    outputPath,
    generatedAt: "2026-08-29T00:00:00.000Z",
    sourceCommit: "test-commit"
  }), /agent_evaluation_gate_failed/);

  const report = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(report.status, "failed");
  assert.equal(report.failedScenarioCount, 1);
  assert.equal(report.results.find((result: any) =>
    result.scenarioId === "synthetic-cited-answer").status, "failed");
});

test("required pull-request job runs the local gate without AWS credentials or AgentCore calls", async () => {
  const workflow = await readFile(resolve(ROOT, ".github/workflows/ci.yml"), "utf8");
  const jobStart = workflow.indexOf("  mock-genai-api:");
  const nextJob = workflow.indexOf("  agentcore-rag-runtime:");
  assert.ok(jobStart >= 0 && nextJob > jobStart);
  const job = workflow.slice(jobStart, nextJob);

  assert.match(job, /Run framework-neutral agent evaluation quality gate/);
  assert.match(job, /pnpm agent-eval:gate -- --output "\$RUNNER_TEMP\/agent-evaluation-report\.json"/);
  assert.match(job, /if-no-files-found: error/);
  assert.match(job, /retention-days: 7/);
  assert.equal(/configure-aws-credentials|agentcore\s+(run|invoke|eval)/i.test(job), false);
});

test("CLI parser accepts the pnpm argument separator before output", () => {
  assert.equal(
    parseAgentEvaluationOutputPath(["--", "--output", "/private/tmp/agent-evaluation-report.json"]),
    "/private/tmp/agent-evaluation-report.json"
  );
});
