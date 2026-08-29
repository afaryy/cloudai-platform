# Framework-Neutral Agent Evaluation Telemetry Runbook

## Purpose

This runbook defines a repeatable quality gate for heterogeneous agent
frameworks. An implementation may emit either OpenTelemetry GenAI semantic
conventions or OpenInference attributes, but both paths are normalized into
the same versioned evaluation contract before a pull request can pass.

The ordinary CI gate is deterministic, synthetic-only, and provider-neutral.
It does not call AWS. The protected provider-parity lane is Stage A source
only; provider validation is pending. This runbook is its only operator guide.

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
  -> metadata-only `local-contract` evidence
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

## Evidence lanes and current boundary

```text
Lane 1: local CI
  synthetic fixtures -> deterministic gate -> local-contract evidence

Lane 2: Stage A, protected direct spans
  fixed synthetic spans -> AgentCore Evaluate -> provider-direct evidence

Lane 3: Stage B, future Runtime-to-CloudWatch
  Runtime -> ADOT -> CloudWatch -> AgentCore Evaluate -> provider-runtime evidence
  Stage B: not implemented by this change
```

`local-contract` is the existing cloud-free, deterministic evidence. Stage A
is source implemented only: its `provider-parity-v1` policy creates six direct
requests using the fixed cited-answer scenario, two conventions, and three
evaluators, including `Builtin.ToolSelectionAccuracy`. A successful protected
execution would produce separately labelled `provider-direct` evidence. It
has not been provider validated. `provider-runtime` is reserved for a future
Stage B Runtime-to-CloudWatch path and has not been implemented or validated.

Managed scores supplement deterministic controls. They never authorize IAM,
tool execution, deployment, remediation, rollback, or deletion. No evidence
lane proves provider, runtime, or production validation.

## Cloud-free validation

Run the source and contract validation from the repository root:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api agentcore-eval:provider-parity -- \
  --mode validate
```

This command uses deterministic local fakes, makes no AWS call, assumes no
role, creates no provider artifact, and produces no `provider-direct` claim.

## Protected Stage A direct-span preflight

Stage A is a manual GitHub Actions workflow-dispatch lane. It is
synthetic-only, evaluate-only, and bounded to six calls. Before a separately
approved run, an operator must verify all of the following in the protected
environment and workflow UI:

1. Protected-environment approval is present and the selected revision is the
   current `main` revision with a full commit identifier.
2. The fixed scenario is `synthetic-cited-answer`; no prompt, response,
   fixture, evaluator, threshold, or policy is substituted.
3. The `provider-parity-v1` evaluator matrix is exactly `Builtin.Correctness`,
   `Builtin.ToolSelectionAccuracy`, and `Builtin.GoalSuccessRate` for each of
   the two approved telemetry conventions.
4. The exact call budget is `AGENTCORE_EVALUATION_MAX_CALLS=6`; no retry,
   expansion, or additional scenario is permitted.
5. The workflow-dispatch confirmation is exactly
   `I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY`.

Protected environment settings are named here by purpose only. Do not place
their values, role identifiers, endpoints, credentials, or account details in
this runbook, an issue, or an artifact:

| Setting | Safe purpose |
| --- | --- |
| `AGENTCORE_EVALUATION_READY` | Enables the protected evaluate-only lane after environment approval. |
| `AGENTCORE_EVALUATION_MAX_CALLS` | Locks the reviewed direct-evaluation budget to six calls. |
| `AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME` | Supplies the dedicated evaluate-only role to the protected OIDC workflow. |
| `AWS_REGION` | Selects the reviewed protected evaluation region. |

This PR authorizes neither a role apply nor the first AWS run. Do not invoke
the direct lane from a laptop or add a local AWS command to this guide.

## Stage A artifacts and bounded failure handling

The only publishable Stage A artifact is a sanitized `provider-direct` report.
Allowed fields are the policy/contract version, evidence level, source commit,
workflow run identifier, synthetic scenario and convention identifiers,
evaluator IDs, bounded scores and thresholds, pass/fail status, reason codes,
and a duration bucket. Forbidden fields are raw prompts, responses, message
content, tool arguments, tool results, retrieved content, provider response
payloads, credentials, secrets, account identifiers, role identifiers, ARNs,
and endpoints.

On a preflight, request, validation, or artifact failure, stop after the
bounded runner outcome. Inspect only its bounded reason code and the
workflow's sanitized status. Do not paste raw provider output into issues,
notes, logs, or commits; do not retry beyond the six-call budget; and do not
turn a score into an authorization or remediation action. Escalate any future
role change, AWS run, or Stage B work through a separately reviewed change.

## Evidence classification

| Evidence | Current state | Claim allowed |
| --- | --- | --- |
| `local-contract` deterministic gate | Complete | Locally contract-tested across two telemetry conventions without AWS access. |
| Stage A `provider-direct` | Source implemented; provider validation pending | No provider-validation claim until a separately approved protected run. |
| Stage B `provider-runtime` | Not implemented | No Runtime-to-CloudWatch, provider, runtime, or production-evaluation claim. |
