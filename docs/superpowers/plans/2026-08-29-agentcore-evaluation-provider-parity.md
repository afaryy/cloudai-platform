# AgentCore Evaluation Provider-Parity Stage A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected, framework-neutral AgentCore on-demand evaluation lane that submits one fixed synthetic cited-answer session in OpenTelemetry GenAI and OpenInference form, evaluates each with three fixed built-in evaluators, and publishes only fail-closed metadata evidence.

**Architecture:** Ordinary pull-request CI remains local and deterministic. A new manually dispatched Stage A workflow has a cloud-free `validate` job and an environment-protected `direct-spans` job; the latter obtains a dedicated OIDC role only after confirmation, readiness, source-revision, region, and six-call-budget checks succeed. Pure TypeScript converts the existing provider-neutral fixtures to AgentCore `sessionSpans`, an injected client isolates AWS access, and a separate gate sanitizes results and compares both conventions.

**Tech Stack:** TypeScript 5.9 / Node.js 22, Node test runner, JSON Schema 2020-12, `@aws-sdk/client-bedrock-agentcore` 3.1121.0, GitHub Actions OIDC, AWS CloudFormation, Ruby Minitest, cfn-lint.

**Spec:** `docs/superpowers/specs/2026-08-29-agentcore-evaluation-provider-parity-design.md`

## Global Constraints

- Stage A accepts only `synthetic-cited-answer`; all six scenarios under both conventions remain covered by the existing local `strict-v1` gate.
- Supported conventions are exactly `otel-genai` and `openinference` with scopes under `opentelemetry.instrumentation.*` and `openinference.instrumentation.*` respectively.
- Evaluators are exactly `Builtin.Correctness`, `Builtin.ToolSelectionAccuracy`, and `Builtin.GoalSuccessRate`.
- Threshold profile `provider-parity-v1` requires every evaluator score to be at least `0.70` and each cross-convention absolute delta to be at most `0.20`.
- A direct run makes exactly six serial `Evaluate` calls and has a hard maximum of six; evaluator IDs and thresholds are code-owned, not workflow inputs.
- The exact direct-run phrase is `I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY`.
- Direct execution requires `AGENTCORE_EVALUATION_READY=true`, `AGENTCORE_EVALUATION_MAX_CALLS=6`, `AWS_REGION=ap-southeast-2`, `refs/heads/main`, and a 40-character source SHA.
- Ordinary `pull_request` and `push` CI must never request an OIDC token, obtain AWS credentials, or call AgentCore Evaluations.
- Provider prompts, responses, assertions, trajectories, tool arguments/results, raw spans, request bodies, provider responses, explanations, error messages, account IDs, ARNs, endpoints, and environment values must never enter the evidence artifact or logs.
- Managed scores are quality evidence only; they never authorize IAM, admission, approval, execution, remediation, rollback, or deletion.
- Source implementation does not authorize an AWS call, CloudFormation plan/apply, IAM mutation, Runtime image release, CloudWatch change, or deletion.
- Stage B Runtime-to-CloudWatch evaluation is outside this implementation plan and requires its own reviewed spec after Stage A provider evidence succeeds.

## File Structure

### New files

- `shared/examples/agent-evaluation-telemetry/provider-parity-thresholds.v1.json` — fixed evaluator allowlist, score thresholds, parity tolerance, and call cap.
- `shared/schemas/agent-evaluation-telemetry/provider-parity-report.schema.json` — metadata-only provider-direct artifact contract.
- `providers/aws/app/api/src/evals/agentCoreEvaluationProviderTypes.ts` — Stage A request, result, report, policy, and injected-client types.
- `providers/aws/app/api/src/evals/agentCoreEvaluationRequestBuilder.ts` — validates the fixed fixture and constructs typed AgentCore requests with deterministic valid IDs.
- `providers/aws/app/api/src/evals/agentCoreEvaluationProviderGate.ts` — sanitizes results, enforces thresholds and parity, and constructs provider-direct evidence.
- `providers/aws/app/api/src/clients/agentCoreEvaluationClient.ts` — narrow injected client plus real AWS SDK adapter.
- `providers/aws/app/api/src/scripts/runAgentCoreEvaluationProviderParity.ts` — cloud-free validation and protected direct execution entry point.
- `providers/aws/app/api/tests/agentCoreEvaluationProviderContracts.test.ts` — policy and evidence schema boundary tests.
- `providers/aws/app/api/tests/agentCoreEvaluationRequestBuilder.test.ts` — request equivalence, ID, target, reference, and rejection tests.
- `providers/aws/app/api/tests/agentCoreEvaluationProviderGate.test.ts` — fake-client, partial-result, threshold, parity, and sanitization tests.
- `providers/aws/app/api/tests/runAgentCoreEvaluationProviderParity.test.ts` — preflight-before-client and exact-six-call runner tests.
- `providers/aws/app/api/tests/agentCoreEvaluationProviderWorkflow.test.ts` — static protected-workflow and no-AWS-PR boundary tests.
- `.github/workflows/agentcore-evaluation-provider-parity.yml` — manual validate/direct-spans workflow.

### Modified files

- `providers/aws/app/api/package.json` and `providers/aws/app/api/pnpm-lock.yaml` — pin AgentCore data-plane SDK and expose the Stage A CLI.
- `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` — add the dedicated evaluate-only OIDC role and output.
- `providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb` — prove trust and least privilege statically.
- `.github/workflows/update-aws-bootstrap.yml` — publish a masked environment handoff for the dedicated role after a separately approved bootstrap apply.
- `providers/aws/infra/bootstrap/README.md` — document role separation and CI/CD-only handoff.
- `docs/solutions/agent-evaluation-telemetry-runbook.md` — operator workflow, evidence levels, and Stage A/Stage B boundary.
- `docs/architecture/agentcore-governed-rag-poc.md` — add provider-direct evaluation lane without claiming Runtime telemetry ingestion.
- `docs/solutions/p8i-agentcore-rag-key-process-record.md` — record decisions, source state, and next approval gates.
- `docs/practices/current-status.md` — mark Stage A source implementation separately from provider validation.
- `providers/aws/app/api/README.md` — local validate command and protected execution boundary.
- `providers/aws/app/api/tests/agentEvaluationTelemetryDocumentation.test.ts` — prevent status overclaim and require new documentation terms.

---

### Task 1: Version the provider policy and metadata-only artifact contract

**Files:**
- Create: `shared/examples/agent-evaluation-telemetry/provider-parity-thresholds.v1.json`
- Create: `shared/schemas/agent-evaluation-telemetry/provider-parity-report.schema.json`
- Create: `providers/aws/app/api/src/evals/agentCoreEvaluationProviderTypes.ts`
- Create: `providers/aws/app/api/tests/agentCoreEvaluationProviderContracts.test.ts`

**Interfaces:**
- Consumes: `EvaluationConvention`, `EvaluationScenario`, and `TelemetryFixture` from `agentEvaluationTelemetryTypes.ts`.
- Produces: `ProviderEvaluatorId`, `ProviderParityPolicy`, `ProviderEvaluationRequest`, `ProviderEvaluationResponse`, `ProviderParityReport`, and `AgentCoreEvaluateClient` for Tasks 2–4.

- [ ] **Step 1: Write the failing contract test**

Create `providers/aws/app/api/tests/agentCoreEvaluationProviderContracts.test.ts` with tests that load both new JSON files and require the exact immutable policy:

```ts
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
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

Expected: FAIL because `provider-parity-thresholds.v1.json` and `provider-parity-report.schema.json` do not exist.

- [ ] **Step 3: Add the fixed policy file**

Create `provider-parity-thresholds.v1.json` with exactly the object asserted above. Do not add environment-variable interpolation or alternate evaluator IDs.

- [ ] **Step 4: Add the closed provider-direct report schema**

Define required top-level properties:

```json
{
  "contractVersion": "1.0",
  "thresholdVersion": "1.0",
  "evidenceLevel": "provider-direct",
  "generatedAt": "2026-08-29T00:00:00.000Z",
  "sourceCommit": "40-character Git SHA",
  "githubRunId": "numeric GitHub run ID",
  "regionLabel": "ap-southeast-2",
  "scenarioId": "synthetic-cited-answer",
  "status": "passed",
  "providerCallCount": 6,
  "durationBucket": "under-5m",
  "aggregateTokenUsage": { "inputTokens": 0, "outputTokens": 0, "totalTokens": 0 },
  "results": [],
  "parity": []
}
```

Each result permits only `convention`, `evaluatorId`, `level`, `score`, `label`, `threshold`, `passed`, `reasonCode`, and a token-usage object. Each parity item permits only `evaluatorId`, `otelGenaiScore`, `openInferenceScore`, `absoluteDelta`, `maximumDelta`, and `passed`. Use `additionalProperties: false` on every object, exact enums for conventions/evaluators/levels, `0..1` numeric bounds, a `^[a-z0-9_]+$` reason-code pattern, and `minimum: 0` integer token counts.

- [ ] **Step 5: Add exact TypeScript provider types**

Create `agentCoreEvaluationProviderTypes.ts` with these public contracts:

```ts
import type { EvaluationConvention } from "./agentEvaluationTelemetryTypes.js";

export type ProviderEvaluatorId =
  | "Builtin.Correctness"
  | "Builtin.ToolSelectionAccuracy"
  | "Builtin.GoalSuccessRate";
export type ProviderEvaluationLevel = "trace" | "tool-call" | "session";

export type ProviderParityErrorCode =
  | "provider_fixture_not_synthetic"
  | "provider_scenario_not_allowed"
  | "provider_scope_not_allowed"
  | "provider_required_span_missing"
  | "provider_session_count_invalid"
  | "provider_attribute_not_allowed"
  | "provider_policy_invalid"
  | "provider_call_count_invalid"
  | "provider_result_missing"
  | "provider_result_duplicate"
  | "provider_evaluator_unexpected"
  | "provider_result_failed"
  | "provider_reference_input_ignored"
  | "provider_score_invalid"
  | "provider_context_mismatch"
  | "provider_token_usage_invalid"
  | "provider_label_invalid"
  | "provider_score_below_threshold"
  | "provider_parity_delta_exceeded"
  | "provider_result_coverage_invalid"
  | "provider_confirmation_required"
  | "provider_readiness_required"
  | "provider_call_budget_invalid"
  | "provider_region_invalid"
  | "provider_source_ref_invalid"
  | "provider_source_commit_invalid"
  | "provider_output_path_required"
  | "provider_input_file_invalid"
  | "provider_request_failed"
  | "provider_artifact_write_failed";

export class ProviderParityError extends Error {
  constructor(public readonly code: ProviderParityErrorCode) {
    super(code);
    this.name = "ProviderParityError";
  }
}

export type ProviderParityPolicy = {
  contractVersion: "1.0";
  profileId: "provider-parity-v1";
  scenarioId: "synthetic-cited-answer";
  evaluatorThresholds: Record<ProviderEvaluatorId, number>;
  maximumParityDelta: number;
  maximumProviderCalls: 6;
};

export type ProviderEvaluationRequest = {
  evaluatorId: ProviderEvaluatorId;
  evaluationInput: { sessionSpans: Record<string, unknown>[] };
  evaluationTarget?: { traceIds: string[] } | { spanIds: string[] };
  evaluationReferenceInputs: Array<{
    context: { spanContext: { sessionId: string; traceId?: string; spanId?: string } };
    expectedResponse?: { text: string };
    assertions?: Array<{ text: string }>;
    expectedTrajectory?: { toolNames: string[] };
  }>;
};

export type ProviderEvaluationResponse = {
  evaluationResults?: Array<{
    evaluatorId?: string;
    value?: number;
    label?: string;
    errorCode?: string;
    errorMessage?: string;
    explanation?: string;
    ignoredReferenceInputFields?: string[];
    context?: { spanContext?: { sessionId?: string; traceId?: string; spanId?: string } };
    tokenUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  }>;
};

export interface AgentCoreEvaluateClient {
  evaluate(request: ProviderEvaluationRequest): Promise<ProviderEvaluationResponse>;
}

export type ProviderParityResult = {
  convention: EvaluationConvention;
  evaluatorId: ProviderEvaluatorId;
  level: ProviderEvaluationLevel;
  score: number;
  label: string;
  threshold: number;
  passed: boolean;
  reasonCode: string;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
};
```

Also define `ProviderParityReport` to match the closed JSON schema; it must contain no field capable of storing raw content or provider diagnostic prose.

```ts
export type ProviderParityReport = {
  contractVersion: "1.0";
  thresholdVersion: "1.0";
  evidenceLevel: "provider-direct";
  generatedAt: string;
  sourceCommit: string;
  githubRunId: string;
  regionLabel: "ap-southeast-2";
  scenarioId: "synthetic-cited-answer";
  status: "passed" | "failed";
  providerCallCount: 6;
  durationBucket: "under-1m" | "under-5m" | "under-15m" | "15m-or-more";
  aggregateTokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  results: ProviderParityResult[];
  parity: Array<{
    evaluatorId: ProviderEvaluatorId;
    otelGenaiScore: number;
    openInferenceScore: number;
    absoluteDelta: number;
    maximumDelta: number;
    passed: boolean;
  }>;
};
```

- [ ] **Step 6: Run the tests and verify they pass**

Run the package test command. Expected: the new contract tests and all existing API tests PASS.

- [ ] **Step 7: Commit the contract slice**

```bash
git add shared/examples/agent-evaluation-telemetry/provider-parity-thresholds.v1.json \
  shared/schemas/agent-evaluation-telemetry/provider-parity-report.schema.json \
  providers/aws/app/api/src/evals/agentCoreEvaluationProviderTypes.ts \
  providers/aws/app/api/tests/agentCoreEvaluationProviderContracts.test.ts
git commit -m "feat: define AgentCore provider parity contracts"
```

---

### Task 2: Build deterministic AgentCore direct-span requests

**Files:**
- Create: `providers/aws/app/api/src/evals/agentCoreEvaluationRequestBuilder.ts`
- Create: `providers/aws/app/api/tests/agentCoreEvaluationRequestBuilder.test.ts`

**Interfaces:**
- Consumes: `TelemetryFixture`, `EvaluationScenario`, `ProviderParityPolicy`, and `ProviderEvaluationRequest`.
- Produces: `buildProviderEvaluationRequests(fixture, scenario, policy): ProviderEvaluationRequest[]` and `deriveProviderIds(scenarioId, convention, originalSpanIds)`.

- [ ] **Step 1: Write failing happy-path and equivalence tests**

The test loads only `synthetic-cited-answer` from each existing fixture file, calls the builder, and asserts:

```ts
assert.equal(otelRequests.length, 3);
assert.equal(openInferenceRequests.length, 3);
assert.deepEqual(otelRequests.map((request) => request.evaluatorId), [
  "Builtin.Correctness",
  "Builtin.ToolSelectionAccuracy",
  "Builtin.GoalSuccessRate"
]);
assert.deepEqual(
  summarizeSemantics(otelRequests),
  summarizeSemantics(openInferenceRequests)
);
```

For each convention assert that generated trace IDs match `/^[0-9a-f]{32}$/`, span IDs match `/^[0-9a-f]{16}$/`, parent IDs refer to generated spans, every span retains `session.id`, and the recognized `scope.name` prefix is preserved.

- [ ] **Step 2: Write failing target and reference tests**

Assert exact evaluator behavior:

```ts
assert.deepEqual(correctness.evaluationTarget, { traceIds: [generatedTraceId] });
assert.deepEqual(toolSelection.evaluationTarget, { spanIds: [generatedToolSpanId] });
assert.equal(goalSuccess.evaluationTarget, undefined);
assert.deepEqual(reference.expectedResponse, { text: scenario.expectedResponse });
assert.deepEqual(reference.expectedTrajectory, { toolNames: ["knowledge_search"] });
assert.deepEqual(reference.assertions, [
  { text: "The final answer cites the approved synthetic source." }
]);
```

Verify trace-level context includes session and trace, tool-level context includes session/trace/span, and session-level context includes only session.

- [ ] **Step 3: Write failing rejection tests**

Mutate one input at a time and require stable error codes:

```ts
assertBuilderError(nonSyntheticScenario, "provider_fixture_not_synthetic");
assertBuilderError(wrongScenario, "provider_scenario_not_allowed");
assertBuilderError(unknownScopeFixture, "provider_scope_not_allowed");
assertBuilderError(missingAgentSpan, "provider_required_span_missing");
assertBuilderError(secondSessionFixture, "provider_session_count_invalid");
assertBuilderError(unknownAttributeFixture, "provider_attribute_not_allowed");
```

Also reject a policy with a fourth evaluator, a changed threshold, a call cap other than six, an empty expected response, or more than one tool trajectory entry.

- [ ] **Step 4: Run the focused test and verify it fails**

Run:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

Expected: FAIL because `buildProviderEvaluationRequests` does not exist.

- [ ] **Step 5: Implement deterministic identifier derivation**

Use Node `createHash("sha256")`. Derive one 32-character trace ID and unique 16-character span IDs from `scenarioId`, convention, original span ID, and fixed domain separators:

```ts
function hexId(width: 16 | 32, ...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, width);
}
```

Never use random IDs in Stage A; tests and parity comparison must be reproducible.

- [ ] **Step 6: Implement the reviewed attribute allowlists and span mapping**

Use convention-specific sets containing only the keys already present in the cited-answer fixtures. Reject extras before mapping. Convert each wrapper to an AgentCore-compatible OpenTelemetry JSON document with these fields:

```ts
{
  traceId: generatedTraceId,
  spanId: generatedSpanId,
  parentSpanId: generatedParentSpanId,
  name: spanRole,
  kind: 1,
  startTimeUnixNano: source.startTimeUnixNano,
  endTimeUnixNano: (BigInt(source.startTimeUnixNano) + 1n).toString(),
  attributes: { ...source.attributes, "session.id": preservedSessionId },
  scope: { name: source.scopeName, version: "1.0.0" },
  resource: {
    attributes: {
      "service.name": "cloudai-provider-parity-synthetic",
      "cloudai.data.scope": "synthetic-only"
    }
  },
  status: { code: 1 }
}
```

Preserve the fixture's single reviewed `session.id` as `preservedSessionId`. Preserve GenAI/OpenInference message and tool fields in memory because the managed evaluators require them, but do not expose the returned documents from the CLI or artifact layer.

Map the local assertion code through one fixed source constant:

```ts
const PROVIDER_ASSERTION_TEXT = {
  "citation-present": "The final answer cites the approved synthetic source."
} as const;
```

Do not send the internal assertion token `citation-present` as natural-language ground truth.

- [ ] **Step 7: Implement the fixed three-request matrix**

Build requests in this exact order: Correctness, ToolSelectionAccuracy, GoalSuccessRate. The first targets the generated trace, the second targets the generated tool span, and the third has no explicit target because AgentCore accepts one session per evaluation. Construct `evaluationReferenceInputs` with the exact context union and only the fields relevant to that evaluator.

- [ ] **Step 8: Run tests and commit**

Expected: builder tests and the full API suite PASS.

```bash
git add providers/aws/app/api/src/evals/agentCoreEvaluationRequestBuilder.ts \
  providers/aws/app/api/tests/agentCoreEvaluationRequestBuilder.test.ts
git commit -m "feat: build deterministic AgentCore evaluation requests"
```

---

### Task 3: Add the fail-closed provider result and parity gate

**Files:**
- Create: `providers/aws/app/api/src/evals/agentCoreEvaluationProviderGate.ts`
- Create: `providers/aws/app/api/tests/agentCoreEvaluationProviderGate.test.ts`

**Interfaces:**
- Consumes: convention-tagged `ProviderEvaluationRequest` and `ProviderEvaluationResponse` pairs plus `ProviderParityPolicy`.
- Produces: `sanitizeProviderResult(...)`, `buildProviderParityReport(...)`, and `assertProviderParityGate(report)` using the stable error contract from Task 1.

- [ ] **Step 1: Write the failing successful-result test**

Build six fake responses with one result each: three scores for `otel-genai` and three for `openinference`. Use scores `0.90/0.85/0.80` and `0.88/0.82/0.78`; include deliberately sensitive `explanation`, `errorMessage`, and `evaluatorArn` fields in the fake object. Assert:

```ts
assert.equal(report.evidenceLevel, "provider-direct");
assert.equal(report.providerCallCount, 6);
assert.equal(report.results.length, 6);
assert.equal(report.parity.length, 3);
assert.equal(report.status, "passed");
assert.doesNotThrow(() => assertProviderParityGate(report));
const serialized = JSON.stringify(report);
assert.equal(serialized.includes("provider explanation"), false);
assert.equal(serialized.includes("arn:aws"), false);
assert.equal(serialized.includes("Which controls"), false);
```

- [ ] **Step 2: Write the failing malformed and partial-result table test**

For each mutation below, assert the stable error code and confirm the provider diagnostic text is absent from the thrown message:

| Mutation | Required code |
| --- | --- |
| `evaluationResults` missing or empty | `provider_result_missing` |
| two results for a single-target request | `provider_result_duplicate` |
| mismatched evaluator ID | `provider_evaluator_unexpected` |
| any `errorCode` | `provider_result_failed` |
| non-empty `ignoredReferenceInputFields` | `provider_reference_input_ignored` |
| missing/NaN/infinite/out-of-range value | `provider_score_invalid` |
| missing or wrong span context | `provider_context_mismatch` |
| negative/non-integer token count | `provider_token_usage_invalid` |
| label empty, longer than 80, or non-printable | `provider_label_invalid` |

- [ ] **Step 3: Write the failing threshold and parity tests**

Require `provider_score_below_threshold` for `0.69`, `provider_parity_delta_exceeded` when paired scores differ by more than `0.20`, `provider_result_coverage_invalid` for missing/duplicate convention-evaluator pairs, and `provider_call_count_invalid` unless the report contains exactly six results.

- [ ] **Step 4: Run the focused test and verify it fails**

Run the package test command. Expected: FAIL because the provider gate module does not exist.

- [ ] **Step 5: Implement stable error use and result sanitization**

Throw only the Task 1 error class, whose message is always its bounded code:

```ts
export class ProviderParityError extends Error {
  constructor(public readonly code: ProviderParityErrorCode) {
    super(code);
    this.name = "ProviderParityError";
  }
}
```

`sanitizeProviderResult` validates one expected context and returns only the `ProviderParityResult` fields. It must never retain the raw response, `errorMessage`, `explanation`, evaluator ARN/name, or request.

- [ ] **Step 6: Implement report aggregation and parity comparison**

Index results by `${convention}:${evaluatorId}`, require exactly the six known keys, and calculate each delta as:

```ts
const absoluteDelta = Math.abs(otel.score - openInference.score);
```

Aggregate provider-reported token counts with safe-integer checks. Set `status` to `passed` only when all six thresholds and all three parity comparisons pass.

- [ ] **Step 7: Implement the public gate assertion**

`assertProviderParityGate` revalidates the complete report rather than trusting the `status` field. It rejects unknown/duplicate evaluator keys, bad numerics, inconsistent `passed` booleans, incorrect call count, failed result rows, or parity rows that do not reproduce the score differences.

- [ ] **Step 8: Run tests and commit**

Expected: all provider gate and existing API tests PASS.

```bash
git add providers/aws/app/api/src/evals/agentCoreEvaluationProviderGate.ts \
  providers/aws/app/api/tests/agentCoreEvaluationProviderGate.test.ts
git commit -m "feat: gate AgentCore provider parity evidence"
```

---

### Task 4: Add an injected AgentCore client and protected runner

**Files:**
- Create: `providers/aws/app/api/src/clients/agentCoreEvaluationClient.ts`
- Create: `providers/aws/app/api/src/scripts/runAgentCoreEvaluationProviderParity.ts`
- Create: `providers/aws/app/api/tests/runAgentCoreEvaluationProviderParity.test.ts`
- Modify: `providers/aws/app/api/package.json`
- Modify: `providers/aws/app/api/pnpm-lock.yaml`

**Interfaces:**
- Consumes: the request builder and provider gate from Tasks 2–3.
- Produces: `createAwsAgentCoreEvaluateClient(region)`, `validateProviderParityEnvironment(environment)`, `runProviderParityEvaluation(options, clientFactory)`, and CLI modes `validate` and `direct-spans`.

Use these exact runner interfaces:

```ts
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

export async function runProviderParityEvaluation(
  options: ProviderParityRunOptions,
  clientFactory: AgentCoreEvaluateClientFactory
): Promise<ProviderParityRunResult>;
```

- [ ] **Step 1: Write failing preflight-before-client tests**

Inject a factory that increments a counter and assert it is never called for each invalid direct environment:

```ts
const valid = {
  PROVIDER_PARITY_MODE: "direct-spans",
  CONFIRMATION: "I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY",
  AGENTCORE_EVALUATION_READY: "true",
  AGENTCORE_EVALUATION_MAX_CALLS: "6",
  AWS_REGION: "ap-southeast-2",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: "a".repeat(40)
};
```

Test missing/wrong confirmation, readiness not exactly `true`, max calls not exactly `6`, wrong region, non-main ref, malformed SHA, missing output path, missing fixture/policy files, and an input policy whose maximum is not six.

- [ ] **Step 2: Write the failing validate-mode fake-client test**

Run `validate` with a fake client returning deterministic passing scores. Assert six serial calls, successful request/result contract validation, no output artifact, no environment confirmation requirement, and no construction of the real AWS adapter. The fake path must not label itself `provider-direct` because no provider was called.

- [ ] **Step 3: Write the failing direct-mode exact-six-call test**

Use a fake injected client with an `activeCalls` counter. Assert maximum concurrency equals one, calls occur in convention then evaluator order, the seventh call is impossible, and an exception on call four yields only `provider_request_failed` without the provider message.

- [ ] **Step 4: Run tests and verify they fail**

Run the package test command. Expected: FAIL because the runner and client modules do not exist.

- [ ] **Step 5: Pin the reviewed AWS SDK**

From `providers/aws/app/api`, run:

```bash
corepack pnpm@11.7.0 add --save-exact @aws-sdk/client-bedrock-agentcore@3.1121.0
```

Confirm `package.json` contains an exact `"3.1121.0"` value, not a caret or range, and `pnpm-lock.yaml` resolves the same package version.

- [ ] **Step 6: Implement the narrow AWS adapter**

Use only the AgentCore data-plane client:

```ts
import {
  BedrockAgentCoreClient,
  EvaluateCommand,
  type EvaluateCommandInput
} from "@aws-sdk/client-bedrock-agentcore";

export function createAwsAgentCoreEvaluateClient(region: string): AgentCoreEvaluateClient {
  const client = new BedrockAgentCoreClient({ region, maxAttempts: 2 });
  return {
    async evaluate(request) {
      const input: EvaluateCommandInput = request;
      return client.send(new EvaluateCommand(input));
    }
  };
}
```

Do not import the control-plane client, Runtime invocation client, CloudWatch client, or credential providers.

- [ ] **Step 7: Implement environment validation and file loading**

`validateProviderParityEnvironment` returns a typed configuration only after checking all Global Constraints. `validate` accepts `GITHUB_SHA=local` and does not check protected-cloud fields; `direct-spans` requires every exact value. Load the two existing fixture arrays, select the fixed scenario from each, load the one fixed scenario definition and provider policy, and reject all extra provider cases.

- [ ] **Step 8: Implement serial execution and sanitized logging**

Build three requests per convention, assert total length equals six before creating the client, then execute with a `for...of` loop. Log only bounded fields:

```ts
console.info(`agentcore-provider-parity-start mode=${mode} call_budget=6`);
console.info(
  `agentcore-provider-evaluation-complete convention=${convention} evaluator=${evaluatorId}`
);
console.info("agentcore-provider-parity-passed evidence_level=provider-direct calls=6");
```

On failure, use the bounded code and set a nonzero exit code:

```ts
console.error(`agentcore-provider-parity-failed code=${code}`);
process.exitCode = 1;
```

`code` must be a member of `ProviderParityErrorCode`. Never stringify a request, raw response, exception, or environment object.

- [ ] **Step 9: Add the package script and CLI parser**

Add:

```json
"agentcore-eval:provider-parity": "pnpm run build && node dist/src/scripts/runAgentCoreEvaluationProviderParity.js"
```

Accept exactly `--mode validate` or `--mode direct-spans --output /private/tmp/provider-parity.json`. `validate` installs a deterministic fake client, runs the complete request/result gate, emits only a bounded success line, and writes no artifact. `direct-spans` requires the output path and invokes `createAwsAgentCoreEvaluateClient` only after preflight and request-count validation.

- [ ] **Step 10: Run tests and commit**

Run the full package suite and one cloud-free CLI validation:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api agentcore-eval:provider-parity -- \
  --mode validate
```

Expected: tests PASS; CLI prints the bounded local-validation success line; it writes no artifact and never claims `provider-direct` evidence.

```bash
git add providers/aws/app/api/package.json providers/aws/app/api/pnpm-lock.yaml \
  providers/aws/app/api/src/clients/agentCoreEvaluationClient.ts \
  providers/aws/app/api/src/scripts/runAgentCoreEvaluationProviderParity.ts \
  providers/aws/app/api/tests/runAgentCoreEvaluationProviderParity.test.ts
git commit -m "feat: add protected AgentCore evaluation runner"
```

---

### Task 5: Add the manual protected GitHub Actions lane

**Files:**
- Create: `.github/workflows/agentcore-evaluation-provider-parity.yml`
- Create: `providers/aws/app/api/tests/agentCoreEvaluationProviderWorkflow.test.ts`

**Interfaces:**
- Consumes: `pnpm agentcore-eval:provider-parity` from Task 4.
- Produces: a cloud-free `validate` job and a protected `direct-spans` job; only the direct job can publish the seven-day metadata-only artifact.

- [ ] **Step 1: Write the failing workflow boundary test**

Read the workflow as text and split the two jobs. Require:

```ts
assert.match(source, /workflow_dispatch:/);
assert.doesNotMatch(source, /\n\s+(pull_request|push|schedule|workflow_call):/);
assert.match(validateJob, /--mode validate/);
assert.doesNotMatch(validateJob, /environment:|id-token:\s*write|configure-aws-credentials/);
assert.match(directJob, /environment:\s*aws-sandbox/);
assert.match(directJob, /id-token:\s*write/);
assert.match(directJob, /I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY/);
assert.match(directJob, /AGENTCORE_EVALUATION_MAX_CALLS/);
assert.match(directJob, /retention-days:\s*7/);
assert.doesNotMatch(source, /strategy:|matrix:|continue-on-error:\s*true/);
```

Also read `.github/workflows/ci.yml` and prove its required API job still contains no AWS credential action or provider-parity `direct-spans` invocation.

- [ ] **Step 2: Run tests and verify they fail**

Expected: FAIL because the workflow does not exist.

- [ ] **Step 3: Add the manual workflow shell**

Use only `workflow_dispatch` with inputs:

```yaml
mode:
  type: choice
  options: [validate, direct-spans]
  default: validate
confirmation:
  type: string
  required: false
```

Set `permissions: contents: read` globally and `concurrency.group: cloudai-agentcore-evaluation-provider-parity` with `cancel-in-progress: false`.

- [ ] **Step 4: Add the cloud-free validate job**

The job runs only for `mode == 'validate'`, has no environment and no OIDC permission, checks out code, installs Node 22/pnpm 11.7.0 with frozen lockfile, runs the complete API tests, and runs the provider CLI in `validate` mode. It uploads no `provider-direct` artifact because no provider call occurred.

- [ ] **Step 5: Add the protected direct-spans job**

The job runs only for `mode == 'direct-spans'`, declares:

```yaml
environment: aws-sandbox
permissions:
  contents: read
  id-token: write
env:
  CONFIRMATION: ${{ inputs.confirmation }}
  AGENTCORE_EVALUATION_READY: ${{ vars.AGENTCORE_EVALUATION_READY }}
  AGENTCORE_EVALUATION_MAX_CALLS: ${{ vars.AGENTCORE_EVALUATION_MAX_CALLS }}
  AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME: ${{ vars.AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME || secrets.AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME }}
  AWS_REGION: ${{ vars.AWS_REGION || 'ap-southeast-2' }}
  PROVIDER_PARITY_MODE: direct-spans
```

Before `configure-aws-credentials`, a shell step checks the exact confirmation, readiness, six-call cap, region, role presence, `GITHUB_REF == refs/heads/main`, and 40-hex `GITHUB_SHA`. Then install locked dependencies, run tests, configure the dedicated role with `mask-aws-account-id: true`, execute one serial CLI process, and upload the sanitized artifact with `if-no-files-found: error` and seven-day retention.

- [ ] **Step 6: Run tests and commit**

Expected: workflow boundary test and full API suite PASS.

```bash
git add .github/workflows/agentcore-evaluation-provider-parity.yml \
  providers/aws/app/api/tests/agentCoreEvaluationProviderWorkflow.test.ts
git commit -m "ci: protect AgentCore provider parity evaluation"
```

---

### Task 6: Add a dedicated evaluate-only GitHub OIDC role source

**Files:**
- Modify: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml`
- Modify: `providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`
- Modify: `.github/workflows/update-aws-bootstrap.yml`
- Modify: `providers/aws/infra/bootstrap/README.md`

**Interfaces:**
- Consumes: the existing account-level GitHub OIDC provider and `aws-sandbox` environment trust pattern.
- Produces: CloudFormation output `AgentCoreEvaluationRoleArn`, intended only for protected setting `AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME`.

- [ ] **Step 1: Write failing least-privilege role tests**

Extend the Ruby Minitest file with a helper that extracts only `GitHubActionsAgentCoreEvaluationRole`. Require:

```ruby
def test_includes_dedicated_agentcore_evaluation_role
  assert_includes template, "GitHubActionsAgentCoreEvaluationRole:"
  assert_includes agentcore_evaluation_role,
    'RoleName: !Sub "${GitHubRepo}-${GitHubEnvironment}-agentcore-evaluation"'
  assert_includes agentcore_evaluation_role,
    'token.actions.githubusercontent.com:sub: !Sub "repo:${GitHubOrg}/${GitHubRepo}:environment:${GitHubEnvironment}"'
  assert_includes agentcore_evaluation_role, "bedrock-agentcore:Evaluate"
  assert_includes template, "AgentCoreEvaluationRoleArn:"
end

def test_agentcore_evaluation_role_cannot_mutate_or_invoke_other_services
  %w[
    bedrock-agentcore:CreateEvaluator bedrock-agentcore:UpdateEvaluator
    bedrock-agentcore:DeleteEvaluator bedrock-agentcore:InvokeAgentRuntime
    logs:StartQuery cloudwatch:GetMetricData iam:PassRole s3:GetObject
  ].each { |action| refute_includes agentcore_evaluation_role, action }
end
```

Add the exact helper:

```ruby
def agentcore_evaluation_role
  template
    .split("GitHubActionsAgentCoreEvaluationRole:", 2)
    .fetch(1, "")
    .split(/\n\s{2}[A-Z][A-Za-z0-9]+:/, 2)
    .first
    .to_s
end
```

Extend the bootstrap-role test to require its resource allowlist to contain only the exact new role name pattern, not `role/*`.

- [ ] **Step 2: Run the focused Ruby test and verify it fails**

Run:

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
```

Expected: FAIL because the dedicated role and output are absent.

- [ ] **Step 3: Add the dedicated CloudFormation role**

Add a named role following the current dedicated-role pattern:

```yaml
GitHubActionsAgentCoreEvaluationRole:
  Type: AWS::IAM::Role
  DependsOn: GitHubActionsBootstrapRole
  Properties:
    RoleName: !Sub "${GitHubRepo}-${GitHubEnvironment}-agentcore-evaluation"
    AssumeRolePolicyDocument:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Principal:
            Federated: !Ref ExistingGitHubOidcProviderArn
          Action: sts:AssumeRoleWithWebIdentity
          Condition:
            StringEquals:
              token.actions.githubusercontent.com:aud: sts.amazonaws.com
            StringLike:
              token.actions.githubusercontent.com:sub: !Sub "repo:${GitHubOrg}/${GitHubRepo}:environment:${GitHubEnvironment}"
    Policies:
      - PolicyName: AgentCoreEvaluationDataPlanePolicy
        PolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Sid: EvaluateOnlySyntheticProviderParity
              Effect: Allow
              Action:
                - bedrock-agentcore:Evaluate
              Resource: "*"
    Tags:
      - { Key: Project, Value: cloudai-platform }
      - { Key: Environment, Value: aws-sandbox }
      - { Key: ManagedBy, Value: cloudformation }
      - { Key: DataScope, Value: synthetic-only }
```

`Resource: "*"` is isolated because the current data-plane action does not offer a proven evaluator ARN scope in this project. The workflow's fixed evaluator IDs, six-call cap, environment approval, and main-only execution are the compensating controls.

- [ ] **Step 4: Bound bootstrap role management and add the output**

Add only:

```yaml
- !Sub "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${GitHubRepo}-${GitHubEnvironment}-agentcore-evaluation"
```

to `ManageOnlyTerraformBootstrapAndBudgetRoles`, then add:

```yaml
AgentCoreEvaluationRoleArn:
  Description: Store as AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME in the aws-sandbox GitHub environment.
  Value: !GetAtt GitHubActionsAgentCoreEvaluationRole.Arn
```

Do not attach this policy to `GitHubActionsTerraformRole`, Runtime roles, or the bootstrap role.

- [ ] **Step 5: Add the post-apply masked environment handoff**

Extend `update-aws-bootstrap.yml` with a success-only step that queries `AgentCoreEvaluationRoleArn`, fails if absent, masks it using `::add-mask::`, and writes only the setting name and masked handoff instruction to `$GITHUB_STEP_SUMMARY`. Do not print the ARN to normal logs.

- [ ] **Step 6: Document the role boundary**

Update the bootstrap README role list and flow. State explicitly that source merge creates no role; the sequence remains validate → change-set plan → review → separately confirmed apply → copy output into the protected environment.

- [ ] **Step 7: Validate and commit**

Run:

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
pipx run cfn-lint providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml
```

Expected: Ruby tests and cfn-lint PASS without AWS credentials.

```bash
git add providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml \
  providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb \
  .github/workflows/update-aws-bootstrap.yml \
  providers/aws/infra/bootstrap/README.md
git commit -m "feat: add evaluate-only AgentCore OIDC role"
```

---

### Task 7: Update architecture, runbook, status, and evidence language

**Files:**
- Modify: `docs/solutions/agent-evaluation-telemetry-runbook.md`
- Modify: `docs/architecture/agentcore-governed-rag-poc.md`
- Modify: `docs/solutions/p8i-agentcore-rag-key-process-record.md`
- Modify: `docs/practices/current-status.md`
- Modify: `providers/aws/app/api/README.md`
- Modify: `providers/aws/app/api/tests/agentEvaluationTelemetryDocumentation.test.ts`

**Interfaces:**
- Consumes: implemented source paths, workflow, role output, and evidence schema from Tasks 1–6.
- Produces: operator instructions that distinguish `local-contract`, `provider-direct`, and unimplemented `provider-runtime` evidence.

- [ ] **Step 1: Write failing documentation assertions**

Extend `agentEvaluationTelemetryDocumentation.test.ts` to require these exact concepts across the documentation set:

```ts
for (const required of [
  "provider-parity-v1",
  "provider-direct",
  "I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY",
  "AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME",
  "AGENTCORE_EVALUATION_MAX_CALLS=6",
  "Builtin.ToolSelectionAccuracy",
  "Stage B",
  "Runtime-to-CloudWatch"
]) assert.match(documentation, new RegExp(escapeRegExp(required), "i"));
```

Update the current-status assertion so the row contains `source implemented` and `provider validation pending`, while rejecting `provider validated`, `runtime validated`, and `production evaluation`.

- [ ] **Step 2: Run tests and verify they fail**

Expected: documentation test FAILS because the new workflow and evidence levels are not yet documented.

- [ ] **Step 3: Update the operator runbook**

Add:

1. a three-lane diagram for local CI, Stage A direct spans, and Stage B Runtime-to-CloudWatch;
2. environment setting names and safe purposes, with no values or ARNs;
3. `validate` instructions that explicitly make no AWS call;
4. a direct-run preflight checklist listing environment approval, main revision, fixed scenario, fixed evaluator matrix, exact call budget, and exact confirmation;
5. sanitized artifact allowed/forbidden fields;
6. failure response: inspect bounded codes, do not paste raw provider output into issues or notes;
7. a statement that no role apply or first AWS run is authorized by this PR.

- [ ] **Step 4: Update architecture and process record**

In the AgentCore architecture document, draw Stage A beside—not inside—the Runtime/CloudWatch path:

```text
local fixtures -> direct sessionSpans -> AgentCore Evaluate -> provider-direct evidence

Gateway -> Runtime -> ADOT -> CloudWatch -> AgentCore Evaluate -> provider-runtime evidence
                                Stage B: not implemented by this change
```

Record why direct spans precede Runtime ingestion, why managed scores supplement deterministic controls, and why the score cannot authorize tool execution or deployment.

- [ ] **Step 5: Update current status and API README**

Use the status wording:

```text
Stage A source implemented; provider validation pending. The protected lane is
manual, synthetic-only, evaluate-only, and bounded to six calls. Stage B
Runtime-to-CloudWatch evaluation is not implemented.
```

The API README documents the local `validate` command only. It links to the protected runbook rather than presenting a laptop-local AWS command.

- [ ] **Step 6: Run docs tests and commit**

Run the full API suite so the Markdown relative-link checker also executes. Expected: PASS.

```bash
git add docs/solutions/agent-evaluation-telemetry-runbook.md \
  docs/architecture/agentcore-governed-rag-poc.md \
  docs/solutions/p8i-agentcore-rag-key-process-record.md \
  docs/practices/current-status.md providers/aws/app/api/README.md \
  providers/aws/app/api/tests/agentEvaluationTelemetryDocumentation.test.ts
git commit -m "docs: record AgentCore provider parity boundary"
```

---

### Task 8: Run full source verification and prepare the reviewable PR

**Files:**
- Verify all files changed in Tasks 1–7.
- Do not create account-specific evidence or modify protected environment settings.

**Interfaces:**
- Consumes: the complete Stage A source implementation.
- Produces: a clean branch, full local verification record, pushed feature branch, and PR that requests source review only.

- [ ] **Step 1: Reinstall locked dependencies and run the complete API suite**

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api install --frozen-lockfile
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

Expected: every test passes, including all six local scenarios under both conventions and all new provider-parity negative cases.

- [ ] **Step 2: Run both cloud-free evaluation gates**

```bash
temp_dir="$(mktemp -d)"
corepack pnpm@11.7.0 --dir providers/aws/app/api agent-eval:gate -- \
  --output "$temp_dir/local-contract.json"
PROVIDER_PARITY_MODE=validate \
  corepack pnpm@11.7.0 --dir providers/aws/app/api agentcore-eval:provider-parity -- \
  --mode validate
```

Expected: both pass without AWS credentials. Inspect with `jq 'keys'` and `rg` for forbidden fixture phrases; do not copy temporary artifacts into the repository.

- [ ] **Step 3: Run infrastructure and static checks**

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
pipx run cfn-lint providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml
scripts/validate-argocd-gitops.sh
git diff --check
```

Expected: all commands PASS. Confirm `git diff` contains no account IDs, resolved role ARNs, credentials, endpoint values, raw provider output, or `_private` notes.

- [ ] **Step 4: Review source boundaries manually**

Confirm:

- `.github/workflows/ci.yml` has no AgentCore direct call or OIDC grant;
- the new workflow has no PR/push/schedule/workflow-call trigger;
- only its protected direct job has `id-token: write` and `environment: aws-sandbox`;
- the dedicated role grants only `bedrock-agentcore:Evaluate`;
- `validate` cannot construct the real AWS client;
- direct preflight completes before credential configuration/client construction;
- exactly six serial calls are built;
- only the metadata-only report is written;
- all documentation says provider validation pending.

- [ ] **Step 5: Commit any verification-only corrections**

If verification required corrections, list them with `git status --short`, stage each printed path explicitly with individual `git add path/to/file` commands, review `git diff --cached`, and commit with `git commit -m "test: harden AgentCore provider parity boundaries"`.

If no correction was needed, do not create an empty commit.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feature/agentcore-evaluation-provider-parity
gh pr create \
  --base main \
  --head feature/agentcore-evaluation-provider-parity \
  --title "feat: add protected AgentCore evaluation provider parity" \
  --body $'## Summary\n\n- adds Stage A source only; no AWS evaluation occurred\n- keeps required PR CI cloud-free and adds a protected manual six-call lane\n- adds an evaluate-only OIDC role source; it has not been applied\n- emits only metadata-safe provider-direct evidence\n\n## Validation\n\n- full API tests\n- local deterministic evaluation gate\n- cloud-free provider-parity validate mode\n- Ruby IAM boundary tests and cfn-lint\n\n## Pending approvals\n\nProvider validation, bootstrap plan/apply, environment handoff, and Stage B Runtime-to-CloudWatch evaluation remain pending. Do not merge without explicit approval.'
```

- [ ] **Step 7: Stop at the source-review gate**

Do not merge, dispatch the protected workflow, create a CloudFormation change set, apply the role, or set GitHub environment values. Report the PR URL and checks, then request the next explicit approval.

## Post-Merge Approval Sequence

These are operational gates, not part of source implementation:

1. Run `update-aws-bootstrap` in `validate` mode.
2. Request approval before creating a non-executing CloudFormation change set.
3. Review the exact IAM-only change set.
4. Request the existing exact bootstrap-apply confirmation and user approval.
5. Add the masked `AgentCoreEvaluationRoleArn` output to the protected `aws-sandbox` environment as `AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME`.
6. Set `AGENTCORE_EVALUATION_READY=true` and `AGENTCORE_EVALUATION_MAX_CALLS=6` only after the handoff is reviewed.
7. Run the workflow in `validate` mode.
8. Request fresh confirmation before the first `direct-spans` execution.
9. Inspect and retain only the metadata-only `provider-direct` artifact.
10. Write and approve a separate Stage B Runtime-to-CloudWatch spec only after Stage A provider validation succeeds.
