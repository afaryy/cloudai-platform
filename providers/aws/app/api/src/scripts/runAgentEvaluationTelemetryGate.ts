import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  assertEvaluationGate,
  evaluateAgentSession
} from "../evals/agentEvaluationTelemetryGate.js";
import { normalizeEvaluationTelemetry } from "../evals/agentEvaluationTelemetryNormalizer.js";
import type {
  AgentEvaluationReport,
  EvaluationConvention,
  EvaluationScenario,
  TelemetryFixture,
  ThresholdPolicy
} from "../evals/agentEvaluationTelemetryTypes.js";

export type AgentEvaluationGateRunOptions = {
  scenarioPath: string;
  fixturePaths: string[];
  thresholdPath: string;
  outputPath: string;
  generatedAt: string;
  sourceCommit: string;
};

export type GateRunSummary = {
  contractVersion: "1.0";
  thresholdVersion: "1.0";
  evidenceLevel: "local-contract";
  generatedAt: string;
  sourceCommit: string;
  totalScenarioCount: number;
  passedScenarioCount: number;
  failedScenarioCount: number;
  status: "passed" | "failed";
  results: AgentEvaluationReport[];
};

const REQUIRED_CONVENTIONS: EvaluationConvention[] = ["otel-genai", "openinference"];

export async function runAgentEvaluationTelemetryGate(
  options: AgentEvaluationGateRunOptions
): Promise<GateRunSummary> {
  const [scenarios, policy, fixtureGroups] = await Promise.all([
    readJson<EvaluationScenario[]>(options.scenarioPath),
    readJson<ThresholdPolicy>(options.thresholdPath),
    Promise.all(options.fixturePaths.map((filePath) => readJson<TelemetryFixture[]>(filePath)))
  ]);
  const fixtures = fixtureGroups.flat();
  validateCoverage(scenarios, fixtures);

  const results = fixtures.map((fixture) => {
    const scenario = scenarios.find((candidate) => candidate.scenarioId === fixture.scenarioId);
    if (!scenario) throw new Error("agent_evaluation_scenario_missing");
    return evaluateAgentSession(normalizeEvaluationTelemetry(fixture), scenario, policy);
  });
  const passedScenarioCount = results.filter((result) => result.status === "passed").length;
  const summary: GateRunSummary = {
    contractVersion: "1.0",
    thresholdVersion: policy.contractVersion,
    evidenceLevel: "local-contract",
    generatedAt: options.generatedAt,
    sourceCommit: options.sourceCommit,
    totalScenarioCount: results.length,
    passedScenarioCount,
    failedScenarioCount: results.length - passedScenarioCount,
    status: passedScenarioCount === results.length ? "passed" : "failed",
    results
  };

  await writeFile(options.outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  if (summary.status !== "passed") {
    throw new Error("agent_evaluation_gate_failed");
  }
  for (const report of results) {
    assertEvaluationGate(report);
  }
  return summary;
}

function validateCoverage(scenarios: EvaluationScenario[], fixtures: TelemetryFixture[]): void {
  if (scenarios.length === 0 || fixtures.length === 0) {
    throw new Error("agent_evaluation_input_empty");
  }
  for (const scenario of scenarios) {
    const conventions = new Set(
      fixtures.filter((fixture) => fixture.scenarioId === scenario.scenarioId)
        .map((fixture) => fixture.convention)
    );
    if (REQUIRED_CONVENTIONS.some((convention) => !conventions.has(convention))) {
      throw new Error("agent_evaluation_convention_coverage_missing");
    }
  }
  if (fixtures.some((fixture) => !scenarios.some((scenario) => scenario.scenarioId === fixture.scenarioId))) {
    throw new Error("agent_evaluation_scenario_missing");
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export function parseAgentEvaluationOutputPath(arguments_: string[]): string {
  const normalizedArguments = arguments_.filter((argument) => argument !== "--");
  const outputIndex = normalizedArguments.indexOf("--output");
  const outputPath = outputIndex >= 0 ? normalizedArguments[outputIndex + 1] : undefined;
  if (!outputPath || normalizedArguments.length !== 2) {
    throw new Error("agent_evaluation_output_path_required");
  }
  return resolve(outputPath);
}

async function main(): Promise<void> {
  const exampleDirectory = resolve(process.cwd(), "../../../../shared/examples/agent-evaluation-telemetry");
  const outputPath = parseAgentEvaluationOutputPath(process.argv.slice(2));
  await runAgentEvaluationTelemetryGate({
    scenarioPath: resolve(exampleDirectory, "scenarios.v1.json"),
    fixturePaths: [
      resolve(exampleDirectory, "otel-genai.traces.v1.json"),
      resolve(exampleDirectory, "openinference.traces.v1.json")
    ],
    thresholdPath: resolve(exampleDirectory, "thresholds.v1.json"),
    outputPath,
    generatedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA ?? "local"
  });
  console.info("agent-evaluation-gate-passed");
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryPoint === import.meta.url) {
  main().catch((error: unknown) => {
    const code = error instanceof Error ? error.message : "unknown_error";
    console.error(`agent-evaluation-gate-failed code=${code}`);
    process.exitCode = 1;
  });
}
