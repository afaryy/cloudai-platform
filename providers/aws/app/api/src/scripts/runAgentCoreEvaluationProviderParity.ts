import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createAwsAgentCoreEvaluateClient } from "../clients/agentCoreEvaluationClient.js";
import {
  assertProviderParityGate,
  buildProviderParityReport,
  sanitizeProviderResult,
  type ProviderEvaluationPair
} from "../evals/agentCoreEvaluationProviderGate.js";
import { buildProviderEvaluationRequests } from "../evals/agentCoreEvaluationRequestBuilder.js";
import {
  ProviderParityError,
  type AgentCoreEvaluateClient,
  type ProviderEvaluationRequest,
  type ProviderParityErrorCode,
  type ProviderParityPolicy,
  type ProviderParityReport
} from "../evals/agentCoreEvaluationProviderTypes.js";
import type {
  EvaluationConvention,
  EvaluationScenario,
  TelemetryFixture
} from "../evals/agentEvaluationTelemetryTypes.js";

export type ProviderParityMode = "validate" | "direct-spans";
export type ProviderParityRunOptions = {
  mode: ProviderParityMode;
  scenarioPath: string;
  fixturePaths: [string, string];
  policyPath: string;
  outputPath?: string;
  generatedAt: string;
  githubRunId: string;
  environment: NodeJS.ProcessEnv;
};
export type ProviderParityRunResult =
  | { mode: "validate"; status: "passed"; requestCount: 6 }
  | { mode: "direct-spans"; status: "passed"; report: ProviderParityReport };
export type AgentCoreEvaluateClientFactory = () => AgentCoreEvaluateClient;

export type ProviderParityEnvironmentConfiguration =
  | { mode: "validate"; sourceCommit: string }
  | {
    mode: "direct-spans";
    sourceCommit: string;
    region: "ap-southeast-2";
  };

const CONFIRMATION = "I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY";
const CALL_BUDGET = 6;
const EVALUATORS = [
  "Builtin.Correctness",
  "Builtin.ToolSelectionAccuracy",
  "Builtin.GoalSuccessRate"
] as const;

export function validateProviderParityEnvironment(
  environment: NodeJS.ProcessEnv,
  mode: ProviderParityMode = environment.PROVIDER_PARITY_MODE === "direct-spans" ? "direct-spans" : "validate"
): ProviderParityEnvironmentConfiguration {
  if (mode === "validate") {
    const sourceCommit = environment.GITHUB_SHA;
    if (sourceCommit !== "local" && !isCommitSha(sourceCommit)) {
      throw new ProviderParityError("provider_source_commit_invalid");
    }
    return { mode, sourceCommit };
  }

  if (environment.PROVIDER_PARITY_MODE !== "direct-spans" || environment.CONFIRMATION !== CONFIRMATION) {
    throw new ProviderParityError("provider_confirmation_required");
  }
  if (environment.AGENTCORE_EVALUATION_READY !== "true") {
    throw new ProviderParityError("provider_readiness_required");
  }
  if (environment.AGENTCORE_EVALUATION_MAX_CALLS !== String(CALL_BUDGET)) {
    throw new ProviderParityError("provider_call_budget_invalid");
  }
  if (environment.AWS_REGION !== "ap-southeast-2") {
    throw new ProviderParityError("provider_region_invalid");
  }
  if (environment.GITHUB_REF !== "refs/heads/main") {
    throw new ProviderParityError("provider_source_ref_invalid");
  }
  if (!isCommitSha(environment.GITHUB_SHA)) {
    throw new ProviderParityError("provider_source_commit_invalid");
  }
  return {
    mode,
    sourceCommit: environment.GITHUB_SHA,
    region: "ap-southeast-2"
  };
}

export async function runProviderParityEvaluation(
  options: ProviderParityRunOptions,
  clientFactory: AgentCoreEvaluateClientFactory
): Promise<ProviderParityRunResult> {
  const configuration = validateProviderParityEnvironment(options.environment, options.mode);
  if (options.mode === "direct-spans" && !options.outputPath) {
    throw new ProviderParityError("provider_output_path_required");
  }

  const { scenario, fixtures, policy } = await loadReviewedInputs(options);
  let requests: ProviderEvaluationRequest[];
  try {
    requests = fixtures.flatMap((fixture) => buildProviderEvaluationRequests(fixture, scenario, policy));
  } catch (error: unknown) {
    if (error instanceof ProviderParityError) throw error;
    throw new ProviderParityError("provider_input_file_invalid");
  }
  if (requests.length !== CALL_BUDGET) {
    throw new ProviderParityError("provider_call_count_invalid");
  }

  const startedAt = Date.now();
  let client: AgentCoreEvaluateClient;
  try {
    client = clientFactory();
  } catch {
    throw new ProviderParityError("provider_request_failed");
  }

  if (options.mode === "direct-spans") {
    console.info(`agentcore-provider-parity-start mode=${options.mode} call_budget=6`);
  }
  const pairs: ProviderEvaluationPair[] = [];
  for (const [index, request] of requests.entries()) {
    const convention = fixtures[Math.floor(index / EVALUATORS.length)]!.convention;
    let response;
    try {
      response = await client.evaluate(request);
    } catch {
      throw new ProviderParityError("provider_request_failed");
    }
    const pair = { convention, request, response };
    sanitizeProviderResult(pair, policy);
    pairs.push(pair);
    if (options.mode === "direct-spans") {
      console.info(
        `agentcore-provider-evaluation-complete convention=${convention} evaluator=${request.evaluatorId}`
      );
    }
  }

  if (options.mode === "validate") {
    assertValidatedPairCoverage(pairs, policy);
    return { mode: "validate", status: "passed", requestCount: 6 };
  }

  const report = buildProviderParityReport({
    pairs,
    policy,
    generatedAt: options.generatedAt,
    sourceCommit: configuration.sourceCommit,
    githubRunId: options.githubRunId,
    durationBucket: durationBucket(Date.now() - startedAt)
  });
  assertProviderParityGate(report);
  try {
    await writeFile(options.outputPath!, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } catch {
    throw new ProviderParityError("provider_artifact_write_failed");
  }
  console.info("agentcore-provider-parity-passed evidence_level=provider-direct calls=6");
  return { mode: "direct-spans", status: "passed", report };
}

async function loadReviewedInputs(options: ProviderParityRunOptions): Promise<{
  scenario: EvaluationScenario;
  fixtures: [TelemetryFixture, TelemetryFixture];
  policy: ProviderParityPolicy;
}> {
  let scenarios: unknown;
  let fixtureGroups: [unknown, unknown];
  let policy: unknown;
  try {
    [scenarios, fixtureGroups, policy] = await Promise.all([
      readJson(options.scenarioPath),
      Promise.all([readJson(options.fixturePaths[0]), readJson(options.fixturePaths[1])]),
      readJson(options.policyPath)
    ]);
  } catch {
    throw new ProviderParityError("provider_input_file_invalid");
  }
  if (!Array.isArray(scenarios) || !Array.isArray(fixtureGroups[0]) || !Array.isArray(fixtureGroups[1])) {
    throw new ProviderParityError("provider_input_file_invalid");
  }

  const matchingScenarios = scenarios.filter(isFixedScenario);
  const otelFixtures = fixtureGroups[0].filter((value): value is TelemetryFixture =>
    isFixedFixture(value, "otel-genai"));
  const openInferenceFixtures = fixtureGroups[1].filter((value): value is TelemetryFixture =>
    isFixedFixture(value, "openinference"));
  if (matchingScenarios.length !== 1 || otelFixtures.length !== 1 || openInferenceFixtures.length !== 1 ||
    !isRecord(policy)) {
    throw new ProviderParityError("provider_input_file_invalid");
  }
  return {
    scenario: matchingScenarios[0],
    fixtures: [otelFixtures[0], openInferenceFixtures[0]],
    policy: policy as ProviderParityPolicy
  };
}

function assertValidatedPairCoverage(pairs: ProviderEvaluationPair[], policy: ProviderParityPolicy): void {
  if (pairs.length !== CALL_BUDGET) throw new ProviderParityError("provider_call_count_invalid");
  const results = pairs.map((pair) => sanitizeProviderResult(pair, policy));
  for (const evaluatorId of EVALUATORS) {
    const otel = results.find((result) => result.convention === "otel-genai" && result.evaluatorId === evaluatorId);
    const openInference = results.find((result) =>
      result.convention === "openinference" && result.evaluatorId === evaluatorId);
    if (!otel || !openInference) throw new ProviderParityError("provider_result_coverage_invalid");
    if (Math.abs(otel.score - openInference.score) > policy.maximumParityDelta) {
      throw new ProviderParityError("provider_parity_delta_exceeded");
    }
  }
}

function isFixedScenario(value: unknown): value is EvaluationScenario {
  return isRecord(value) && value.scenarioId === "synthetic-cited-answer";
}

function isFixedFixture(value: unknown, convention: EvaluationConvention): value is TelemetryFixture {
  return isRecord(value) && value.scenarioId === "synthetic-cited-answer" && value.convention === convention;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCommitSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

function durationBucket(milliseconds: number): ProviderParityReport["durationBucket"] {
  if (milliseconds < 60_000) return "under-1m";
  if (milliseconds < 300_000) return "under-5m";
  if (milliseconds < 900_000) return "under-15m";
  return "15m-or-more";
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

type ParsedCli = { mode: ProviderParityMode; outputPath?: string };

export function parseProviderParityArguments(arguments_: string[]): ParsedCli {
  const argumentsWithoutSeparator = arguments_[0] === "--" ? arguments_.slice(1) : arguments_;
  if (argumentsWithoutSeparator.length === 2 && argumentsWithoutSeparator[0] === "--mode" &&
    argumentsWithoutSeparator[1] === "validate") {
    return { mode: "validate" };
  }
  if (argumentsWithoutSeparator.length === 4 && argumentsWithoutSeparator[0] === "--mode" &&
    argumentsWithoutSeparator[1] === "direct-spans" && argumentsWithoutSeparator[2] === "--output" &&
    isCliValue(argumentsWithoutSeparator[3])) {
    return { mode: "direct-spans", outputPath: resolve(argumentsWithoutSeparator[3]) };
  }
  throw new ProviderParityError(argumentsWithoutSeparator[1] === "direct-spans"
    ? "provider_output_path_required"
    : "provider_policy_invalid");
}

function isCliValue(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && !value.startsWith("-");
}

async function main(): Promise<void> {
  const cli = parseProviderParityArguments(process.argv.slice(2));
  const exampleDirectory = resolve(process.cwd(), "../../../../shared/examples/agent-evaluation-telemetry");
  const environment = cli.mode === "validate" && process.env.GITHUB_SHA === undefined
    ? { ...process.env, GITHUB_SHA: "local" }
    : process.env;
  const options: ProviderParityRunOptions = {
    mode: cli.mode,
    scenarioPath: resolve(exampleDirectory, "scenarios.v1.json"),
    fixturePaths: [
      resolve(exampleDirectory, "otel-genai.traces.v1.json"),
      resolve(exampleDirectory, "openinference.traces.v1.json")
    ],
    policyPath: resolve(exampleDirectory, "provider-parity-thresholds.v1.json"),
    ...(cli.outputPath ? { outputPath: cli.outputPath } : {}),
    generatedAt: new Date().toISOString(),
    githubRunId: process.env.GITHUB_RUN_ID ?? "local",
    environment
  };
  const factory = cli.mode === "validate"
    ? () => deterministicValidationClient()
    : () => createAwsAgentCoreEvaluateClient("ap-southeast-2");
  await runProviderParityEvaluation(options, factory);
  if (cli.mode === "validate") {
    console.info("agentcore-provider-parity-passed evidence_level=local-contract calls=6");
  }
}

function deterministicValidationClient(): AgentCoreEvaluateClient {
  return {
    async evaluate(request: ProviderEvaluationRequest) {
      return {
        evaluationResults: [{
          evaluatorId: request.evaluatorId,
          value: 0.9,
          label: "validated",
          context: request.evaluationReferenceInputs[0]!.context,
          tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        }]
      };
    }
  };
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryPoint === import.meta.url) {
  main().catch((error: unknown) => {
    const code: ProviderParityErrorCode = error instanceof ProviderParityError
      ? error.code
      : "provider_request_failed";
    console.error(`agentcore-provider-parity-failed code=${code}`);
    process.exitCode = 1;
  });
}
