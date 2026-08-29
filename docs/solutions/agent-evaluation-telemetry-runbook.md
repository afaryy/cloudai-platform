# Framework-Neutral Agent Evaluation Telemetry Runbook

## Purpose

This runbook defines a repeatable quality gate for heterogeneous agent
frameworks. An implementation may emit either OpenTelemetry GenAI semantic
conventions or OpenInference attributes, but both paths are normalized into
the same versioned evaluation contract before a pull request can pass.

The ordinary CI gate is deterministic, synthetic-only, and provider-neutral.
It does not call AWS. A protected provider-parity lane may later compare the
same scenarios with Amazon Bedrock AgentCore Evaluations, but that is a
separate, manually approved evidence level.

## Telemetry Compatibility Contract

The normalizer accepts only recognized instrumentation scopes:

- `opentelemetry.instrumentation.*` for OpenTelemetry GenAI traces;
- `openinference.instrumentation.*` for OpenInference traces.

Every fixture must provide one `session.id`, one invoke-agent span, at least
one inference span, and the expected execute-tool spans. Message content is
required in the synthetic fixture because response-quality evaluation cannot
be inferred from span timing and status alone. Tool-call identifiers correlate
the request, arguments, execution result, and model response without binding
the gate to one SDK or agent framework.

```text
Agent framework
  -> OpenTelemetry GenAI or OpenInference spans
  -> framework-neutral normalizer
  -> deterministic local dimensions
  -> versioned thresholds
  -> metadata-only CI evidence
  -> optional protected AgentCore parity evaluation
```

## Fixed Inputs

The contracts are versioned under
[`shared/schemas/agent-evaluation-telemetry/`](../../shared/schemas/agent-evaluation-telemetry/).
The executable synthetic inputs are under
[`shared/examples/agent-evaluation-telemetry/`](../../shared/examples/agent-evaluation-telemetry/):

- `scenarios.v1.json` defines fixed prompts, expected responses, expected tool
  trajectories, and behavioural assertions;
- `otel-genai.traces.v1.json` represents all scenarios with OpenTelemetry
  GenAI spans;
- `openinference.traces.v1.json` represents the same scenarios with
  OpenInference spans;
- `thresholds.v1.json` pins the `strict-v1` policy.

The six scenarios cover a cited answer, missing citation, stale source,
provider timeout, denied tool, and human-approval boundary. CI requires both
telemetry conventions for every scenario, producing twelve evaluations.

## Local Quality Dimensions

The gate scores each fixture from zero to one and does not average results.
Every dimension must meet its explicit threshold:

| Evaluator ID | What it proves locally |
| --- | --- |
| `local.telemetry_compatibility` | The telemetry can be normalized from an approved convention and scope. |
| `local.trace_completeness` | The synthetic agent turn contains the required request and response evidence. |
| `local.tool_trajectory_accuracy` | Observed tool names, order, and bounded argument subsets match the scenario. |
| `local.behavioural_outcome` | Citation, abstention, lifecycle, timeout, denial, or approval behaviour matches the contract. |
| `local.goal_success` | The complete synthetic outcome, including the fixed response and trajectory, matches the scenario. |

`strict-v1` sets every threshold to `1.0`. Adding a framework or scenario must
not lower these thresholds. A change that needs a different tolerance must add
a separately reviewed policy version and explain the risk trade-off.

## Run Locally

From the repository root:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api agent-eval:gate -- \
  --output /tmp/agent-evaluation-report.json
```

The command builds the TypeScript package, evaluates both conventions, writes
the report, and exits non-zero when the gate fails. The report has
`evidenceLevel: local-contract`; it contains scenario IDs, convention,
synthetic session and trace identifiers, bounded scores, thresholds, status,
and reason codes.

## Fail-Closed Behaviour

The executable boundary rejects incomplete or unsafe evidence using these
codes:

- `incomplete_evaluation_input` for missing or inconsistent contracts;
- `evaluator_failed` for missing, duplicate, unknown, non-finite, or malformed
  scores;
- `score_below_threshold` when any dimension misses its threshold;
- `unsafe_observed_trajectory` when a tool executes after a denied or
  human-approval-required outcome.

Coverage also fails when one convention or one scenario is absent, when a
scope is unrecognized, when `session.id` is missing or conflicting, or when an
invoke-agent span or tool-call correlation is invalid.

## CI Evidence Boundary

The required pull-request job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
runs after the API tests and uploads `agent-evaluation-report` for seven days.
That job has no AWS credential step and no AgentCore API invocation.

Allowed artifact fields:

- contract and threshold versions;
- local evidence level and source commit;
- aggregate pass/fail counts;
- synthetic scenario, convention, session, and trace identifiers;
- evaluator IDs, bounded scores, thresholds, status, and reason codes.

Forbidden artifact fields:

- raw prompts or responses;
- tool arguments or tool results;
- credentials, secrets, account IDs, resource ARNs, or endpoints;
- unrestricted provider diagnostics or retrieved content.

## Adding a Framework or Scenario

1. Add or update the closed JSON Schema before changing fixtures.
2. Add a fixed synthetic scenario with its expected response, trajectory, and
   behavioural assertions.
3. Add equivalent OpenTelemetry GenAI and OpenInference fixtures, or add a new
   convention through an explicit normalizer and compatibility test.
4. Prove normalization parity in unit tests.
5. Add a negative test that demonstrates the intended fail-closed condition.
6. Keep the metadata-only report contract and existing thresholds intact.
7. Run the complete API tests and the standalone gate.

## Protected Provider-Parity Lane

A future protected provider-parity lane may run the same synthetic cases with
Amazon Bedrock AgentCore on-demand evaluation. It must remain optional and
must not weaken the required local gate. Before it runs, require GitHub OIDC,
an approved environment, a cost limit, an exact confirmation phrase, and a
reviewed cleanup boundary.

That lane must also:

- emit supported OpenTelemetry GenAI or OpenInference instrumentation scopes;
- preserve `session.id` across runtime and evaluation telemetry;
- emit invoke-agent, inference, and execute-tool spans;
- enable only the minimum synthetic message content required for response
  evaluation;
- wait for CloudWatch trace ingestion before requesting on-demand evaluation;
- use fixed prompts, expected tool trajectories, and versioned score
  thresholds;
- publish a separately labelled provider-parity artifact with the same
  metadata restrictions;
- avoid representing a provider score as an authorization decision.

The framework-neutral gate is locally contract-tested against synthetic
OpenTelemetry GenAI and OpenInference fixtures. It does not prove OTLP export,
CloudWatch ingestion, AgentCore managed evaluation, or production agent
quality. Those require a separately approved provider-parity run.

## Evidence Classification

| Evidence | Current state | Claim allowed |
| --- | --- | --- |
| Local normalization and deterministic gate | Complete | Locally contract-tested across two telemetry conventions. |
| Pull-request quality gate | Implemented | CI enforces fixed synthetic scenarios without AWS access. |
| OTLP export and CloudWatch ingestion | Pending | No provider telemetry-delivery claim. |
| AgentCore managed evaluation | Pending | No managed evaluator or provider-score claim. |
| Production agent quality | Out of scope | No production-quality or safety-effectiveness claim. |
