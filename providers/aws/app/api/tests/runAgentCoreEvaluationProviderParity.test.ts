import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  parseProviderParityArguments,
  runProviderParityEvaluation,
  validateProviderParityEnvironment,
  type ProviderParityRunOptions
} from "../src/scripts/runAgentCoreEvaluationProviderParity.js";
import {
  ProviderParityError,
  type AgentCoreEvaluateClient,
  type ProviderEvaluationRequest,
  type ProviderEvaluationResponse
} from "../src/evals/agentCoreEvaluationProviderTypes.js";

const ROOT = resolve(process.cwd(), "../../../..");
const EXAMPLE_DIR = resolve(ROOT, "shared/examples/agent-evaluation-telemetry");
const VALID_DIRECT_ENVIRONMENT: NodeJS.ProcessEnv = {
  PROVIDER_PARITY_MODE: "direct-spans",
  CONFIRMATION: "I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY",
  AGENTCORE_EVALUATION_READY: "true",
  AGENTCORE_EVALUATION_MAX_CALLS: "6",
  AWS_REGION: "ap-southeast-2",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: "a".repeat(40)
};

test("rejects every invalid direct-mode preflight before constructing the client", async (t) => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "agentcore-provider-parity-preflight-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const base = directOptions(resolve(temporaryDirectory, "report.json"));
  const wrongPolicyPath = resolve(temporaryDirectory, "wrong-policy.json");
  const malformedScenarioPath = resolve(temporaryDirectory, "malformed-scenarios.json");
  const malformedFixturePath = resolve(temporaryDirectory, "malformed-fixtures.json");
  const policy = JSON.parse(await readFile(base.policyPath, "utf8")) as Record<string, unknown>;
  policy.maximumProviderCalls = 5;
  await writeFile(wrongPolicyPath, JSON.stringify(policy), "utf8");
  const scenarios = JSON.parse(await readFile(base.scenarioPath, "utf8")) as Array<Record<string, unknown>>;
  const matchingScenario = scenarios.find((scenario) => scenario.scenarioId === "synthetic-cited-answer")!;
  delete matchingScenario.expectedToolTrajectory;
  await writeFile(malformedScenarioPath, JSON.stringify(scenarios), "utf8");
  const fixtures = JSON.parse(await readFile(base.fixturePaths[0], "utf8")) as Array<Record<string, unknown>>;
  const matchingFixture = fixtures.find((fixture) => fixture.scenarioId === "synthetic-cited-answer")!;
  delete matchingFixture.spans;
  await writeFile(malformedFixturePath, JSON.stringify(fixtures), "utf8");

  const cases: Array<{
    name: string;
    mutate: (options: ProviderParityRunOptions) => void;
    code: ProviderParityError["code"];
  }> = [
    { name: "missing confirmation", mutate: (options) => { delete options.environment.CONFIRMATION; }, code: "provider_confirmation_required" },
    { name: "wrong confirmation", mutate: (options) => { options.environment.CONFIRMATION = "yes"; }, code: "provider_confirmation_required" },
    { name: "readiness is not exactly true", mutate: (options) => { options.environment.AGENTCORE_EVALUATION_READY = "TRUE"; }, code: "provider_readiness_required" },
    { name: "call cap is not exactly six", mutate: (options) => { options.environment.AGENTCORE_EVALUATION_MAX_CALLS = "7"; }, code: "provider_call_budget_invalid" },
    { name: "region is outside the review", mutate: (options) => { options.environment.AWS_REGION = "us-east-1"; }, code: "provider_region_invalid" },
    { name: "source ref is not main", mutate: (options) => { options.environment.GITHUB_REF = "refs/heads/feature"; }, code: "provider_source_ref_invalid" },
    { name: "source commit is malformed", mutate: (options) => { options.environment.GITHUB_SHA = "abc123"; }, code: "provider_source_commit_invalid" },
    { name: "output path is missing", mutate: (options) => { delete options.outputPath; }, code: "provider_output_path_required" },
    { name: "scenario file is missing", mutate: (options) => { options.scenarioPath = resolve(temporaryDirectory, "missing-scenarios.json"); }, code: "provider_input_file_invalid" },
    { name: "first fixture file is missing", mutate: (options) => { options.fixturePaths[0] = resolve(temporaryDirectory, "missing-fixture.json"); }, code: "provider_input_file_invalid" },
    { name: "policy file is missing", mutate: (options) => { options.policyPath = resolve(temporaryDirectory, "missing-policy.json"); }, code: "provider_input_file_invalid" },
    { name: "matching scenario has a malformed shape", mutate: (options) => { options.scenarioPath = malformedScenarioPath; }, code: "provider_input_file_invalid" },
    { name: "matching fixture has a malformed shape", mutate: (options) => { options.fixturePaths[0] = malformedFixturePath; }, code: "provider_input_file_invalid" },
    { name: "policy maximum is not six", mutate: (options) => { options.policyPath = wrongPolicyPath; }, code: "provider_call_count_invalid" }
  ];

  for (const { name, mutate, code } of cases) {
    const options = structuredClone(base);
    mutate(options);
    let factoryCalls = 0;
    await assert.rejects(
      runProviderParityEvaluation(options, () => {
        factoryCalls += 1;
        return passingClient();
      }),
      (error: unknown) => error instanceof ProviderParityError && error.code === code,
      name
    );
    assert.equal(factoryCalls, 0, `${name}: client factory was called`);
  }
});

test("CLI parser strips only one leading package-manager separator", () => {
  assert.deepEqual(parseProviderParityArguments(["--", "--mode", "validate"]), { mode: "validate" });

  for (const arguments_ of [
    ["--mode", "--", "validate"],
    ["--", "--", "--mode", "validate"],
    ["--", "--mode", "validate", "--"]
  ]) {
    assert.throws(
      () => parseProviderParityArguments(arguments_),
      (error: unknown) => error instanceof ProviderParityError && error.code === "provider_policy_invalid"
    );
  }
});

test("validate mode runs six deterministic fake evaluations without protected-cloud fields or an artifact", async (t) => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "agentcore-provider-parity-validate-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const outputPath = resolve(temporaryDirectory, "must-not-exist.json");
  const requests: ProviderEvaluationRequest[] = [];
  let activeCalls = 0;
  let maximumActiveCalls = 0;
  const client: AgentCoreEvaluateClient = {
    async evaluate(request) {
      activeCalls += 1;
      maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
      requests.push(request);
      await new Promise<void>((done) => setImmediate(done));
      activeCalls -= 1;
      return passingResponse(request);
    }
  };
  let factoryCalls = 0;

  assert.deepEqual(validateProviderParityEnvironment({ GITHUB_SHA: "local" }, "validate"), {
    mode: "validate",
    sourceCommit: "local"
  });
  const result = await runProviderParityEvaluation({
    ...baseOptions("validate", { GITHUB_SHA: "local" }),
    outputPath
  }, () => {
    factoryCalls += 1;
    return client;
  });

  assert.deepEqual(result, { mode: "validate", status: "passed", requestCount: 6 });
  assert.equal(factoryCalls, 1);
  assert.equal(maximumActiveCalls, 1);
  assert.deepEqual(requests.map((request) => request.evaluatorId), [
    "Builtin.Correctness",
    "Builtin.ToolSelectionAccuracy",
    "Builtin.GoalSuccessRate",
    "Builtin.Correctness",
    "Builtin.ToolSelectionAccuracy",
    "Builtin.GoalSuccessRate"
  ]);
  await assert.rejects(readFile(outputPath), { code: "ENOENT" });
  assert.equal(JSON.stringify(result).includes("provider-direct"), false);
});

test("direct mode performs exactly six serial calls in convention and evaluator order", async (t) => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "agentcore-provider-parity-direct-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const outputPath = resolve(temporaryDirectory, "report.json");
  const calls: Array<{ convention: string; evaluatorId: string }> = [];
  let activeCalls = 0;
  let maximumActiveCalls = 0;
  let factoryCalls = 0;

  const result = await runProviderParityEvaluation(directOptions(outputPath), () => {
    factoryCalls += 1;
    return {
      async evaluate(request) {
        activeCalls += 1;
        maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
        calls.push({
          convention: conventionFor(request),
          evaluatorId: request.evaluatorId
        });
        await new Promise<void>((done) => setImmediate(done));
        activeCalls -= 1;
        return passingResponse(request);
      }
    };
  });

  assert.equal(factoryCalls, 1);
  assert.equal(maximumActiveCalls, 1);
  assert.deepEqual(calls, [
    { convention: "otel-genai", evaluatorId: "Builtin.Correctness" },
    { convention: "otel-genai", evaluatorId: "Builtin.ToolSelectionAccuracy" },
    { convention: "otel-genai", evaluatorId: "Builtin.GoalSuccessRate" },
    { convention: "openinference", evaluatorId: "Builtin.Correctness" },
    { convention: "openinference", evaluatorId: "Builtin.ToolSelectionAccuracy" },
    { convention: "openinference", evaluatorId: "Builtin.GoalSuccessRate" }
  ]);
  assert.equal(result.mode, "direct-spans");
  assert.equal(result.report.providerCallCount, 6);
  assert.equal(result.report.evidenceLevel, "provider-direct");
  assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), result.report);
});

test("sanitizes a provider exception on call four and makes a seventh call impossible", async (t) => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "agentcore-provider-parity-error-"));
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));
  const outputPath = resolve(temporaryDirectory, "report.json");
  let callCount = 0;
  const providerMessage = "sensitive provider response and account 123456789012";

  await assert.rejects(
    runProviderParityEvaluation(directOptions(outputPath), () => ({
      async evaluate(request) {
        callCount += 1;
        if (callCount === 4) throw new Error(providerMessage);
        return passingResponse(request);
      }
    })),
    (error: unknown) => {
      assert.ok(error instanceof ProviderParityError);
      assert.equal(error.code, "provider_request_failed");
      assert.equal(error.message, "provider_request_failed");
      assert.equal(String(error).includes(providerMessage), false);
      return true;
    }
  );
  assert.equal(callCount, 4);
  assert.ok(callCount < 7);
  await assert.rejects(readFile(outputPath), { code: "ENOENT" });
});

function baseOptions(mode: ProviderParityRunOptions["mode"], environment: NodeJS.ProcessEnv): ProviderParityRunOptions {
  return {
    mode,
    scenarioPath: resolve(EXAMPLE_DIR, "scenarios.v1.json"),
    fixturePaths: [
      resolve(EXAMPLE_DIR, "otel-genai.traces.v1.json"),
      resolve(EXAMPLE_DIR, "openinference.traces.v1.json")
    ],
    policyPath: resolve(EXAMPLE_DIR, "provider-parity-thresholds.v1.json"),
    generatedAt: "2026-08-29T00:00:00.000Z",
    githubRunId: "123456",
    environment
  };
}

function directOptions(outputPath: string): ProviderParityRunOptions {
  return {
    ...baseOptions("direct-spans", structuredClone(VALID_DIRECT_ENVIRONMENT)),
    outputPath
  };
}

function passingClient(): AgentCoreEvaluateClient {
  return { evaluate: async (request) => passingResponse(request) };
}

function passingResponse(request: ProviderEvaluationRequest): ProviderEvaluationResponse {
  return {
    evaluationResults: [{
      evaluatorId: request.evaluatorId,
      value: 0.9,
      label: "pass",
      context: structuredClone(request.evaluationReferenceInputs[0]!.context),
      tokenUsage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 }
    }]
  };
}

function conventionFor(request: ProviderEvaluationRequest): string {
  const scope = request.evaluationInput.sessionSpans[0]?.scope as { name?: unknown } | undefined;
  return typeof scope?.name === "string" && scope.name.startsWith("opentelemetry.")
    ? "otel-genai"
    : "openinference";
}
