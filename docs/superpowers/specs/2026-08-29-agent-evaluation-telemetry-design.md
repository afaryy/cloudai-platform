# Framework-Neutral Agent Evaluation Telemetry Design

## Status

**Design B approved: 29 August 2026.**

This specification defines a source-first prototype for evaluating heterogeneous
agent implementations through one standards-based telemetry and quality-gate
contract. The mandatory pull-request gate is deterministic and cloud-free. A
separate protected path may later invoke Amazon Bedrock AgentCore Evaluations
against synthetic sessions after an explicit runtime approval.

Approval of this design does not authorise an AWS API call, AgentCore evaluator
creation, CloudWatch configuration change, model invocation, runtime deployment,
or paid evaluation. Those operations retain separate protected workflow,
credentials, budget, and exact-confirmation gates.

## Decision

Adopt **OpenTelemetry GenAI semantic conventions and OpenInference as the
telemetry standards**, then normalize their evaluation-relevant span roles into
one internal scoring model.

Do not invent a third public telemetry convention. CloudAI-owned contracts cover
only the parts the standards do not define:

- fixed synthetic evaluation scenarios;
- expected responses, behavioural assertions, and tool trajectories;
- score dimensions and threshold policy;
- sanitized evaluation-result evidence;
- CI execution and failure behaviour.

The implementation has two lanes:

```text
Mandatory pull-request lane
  synthetic OpenTelemetry / OpenInference fixtures
    -> convention and grouping validation
    -> framework-neutral normalization
    -> deterministic evaluators
    -> threshold gate
    -> metadata-only CI evidence

Protected provider-parity lane
  fixed synthetic prompts
    -> deployed agent invocation
    -> compliant telemetry in CloudWatch
    -> AgentCore on-demand evaluation
    -> managed scores + expected trajectory
    -> the same threshold decision envelope
```

The first lane is required on every pull request. It proves the contract,
normalizer, deterministic scoring, and fail-closed CI behaviour without AWS
credentials, ingestion delay, model variability, or evaluation cost. The second
lane proves provider parity but remains manual and separately approved.

## Why this approach

Three implementation approaches were considered:

| Approach | Benefit | Limitation | Decision |
| --- | --- | --- | --- |
| Live AgentCore evaluation on every pull request | Highest provider fidelity | Credentials, cost, CloudWatch ingestion delay, model variance, and external-service availability can make the required gate unstable | Rejected as the mandatory gate |
| Deterministic required gate plus protected AgentCore parity run | Stable regression control with a real managed-evaluation extension | Requires two clearly labelled evidence levels | Selected |
| Schema validation only | Simple and inexpensive | Does not prove tool trajectory, behavioural assertions, threshold logic, or regression detection | Rejected as insufficient |

This design intentionally distinguishes **telemetry compatibility evidence**
from **managed evaluator quality evidence**. Passing the local gate does not
claim that AgentCore evaluated the session.

## Standards boundary

AgentCore Evaluations reconstructs a session from three evaluation-relevant span
roles:

1. an invoke-agent span for the user turn and final response;
2. inference spans for model inputs and outputs;
3. execute-tool spans for tool identity, parameters, and result.

Additional retriever, reranker, embedding, guardrail, memory, prompt, and
orchestration spans may remain in the trace as context. The local normalizer
must ignore unknown contextual spans rather than fail merely because a framework
emits richer telemetry.

The generic AgentCore paths also depend on instrumentation scope:

- OpenTelemetry GenAI instrumentation uses a scope under
  `opentelemetry.instrumentation.*`;
- OpenInference instrumentation uses a scope under
  `openinference.instrumentation.*`.

A custom scope outside those prefixes is not treated as generically compatible,
even when its attributes resemble the documented conventions. The required CI
gate therefore validates scope names rather than checking span attributes alone.

## Session and trace model

The normalized hierarchy is:

```text
Evaluation session (`session.id`)
  -> one or more user turns (`trace_id`)
       -> exactly one top-level invoke-agent role
       -> zero or more inference roles
       -> zero or more execute-tool roles
       -> optional contextual roles
```

For an AgentCore runtime parity run, `session.id` must match the runtime session
identifier used for invocation. Each user turn has one trace ID. Every tool call
must be attributable to the trace and ordered deterministically by timestamp,
with a stable tool-call correlation ID when the convention supplies one.

The prototype must cover both conventions with equivalent synthetic behaviour:

| Evaluation field | OpenTelemetry GenAI | OpenInference |
| --- | --- | --- |
| Span classification | `gen_ai.operation.name` | `openinference.span.kind` |
| Invoke agent | `invoke_agent` | `AGENT` or supported top-level `CHAIN` |
| Inference | `chat` | `LLM` |
| Execute tool | `execute_tool` | `TOOL` |
| Tool name | `gen_ai.tool.name` | `tool.name` |
| Tool-call correlation | `gen_ai.tool.call.id` | message tool-call ID where supplied |
| Tool input | convention message/event content | `input.value` |
| Tool output | convention message/event content | `output.value` |
| Messages | `gen_ai.input.messages`, `gen_ai.output.messages`, or correlated event records | indexed `llm.input_messages.*` and `llm.output_messages.*` attributes |

The fixture contract is a bounded serializable representation for tests; it is
not described as a complete OTLP exporter or proof of transport to CloudWatch.
Provider parity requires a separately validated real export and ingestion path.

## Synthetic scenario contract

Each scenario contains:

- stable scenario ID and version;
- convention (`otel-genai` or `openinference`);
- fixed synthetic prompt;
- optional expected response or response category;
- expected ordered tool trajectory;
- optional expected tool argument subset;
- behavioural assertions;
- per-dimension minimum scores;
- sanitized evidence classification.

The first scenario set reuses and extends the existing AgentCore RAG behavioural
cases:

1. cited knowledge answer;
2. citation missing and required abstention;
3. retired source denied before retrieval;
4. provider timeout and controlled abstention;
5. unapproved tool denied before execution;
6. high-impact action stopped at the human-approval boundary.

At least one successful tool trajectory is represented in both conventions so
the CI suite proves that two heterogeneous telemetry shapes normalize to the
same expected sequence. Negative fixtures deliberately cover missing session
identity, unrecognized instrumentation scope, missing top-level agent span,
wrong tool, wrong tool order, unsafe execution after denial, and missing score.

## Normalized evaluation model

The normalizer emits an internal in-memory model containing only what the
evaluators require:

```text
session ID
  trace ID
  synthetic scenario ID
  prompt/response available flag
  invoke-agent role
  ordered inference roles
  ordered tool calls: name, correlation ID, parsed arguments, status
  terminal outcome
  behavioural markers: citation, abstention, denial, approval boundary
```

Raw messages and tool results are used only while evaluating synthetic fixtures.
They are excluded from the published CI result. The result records hashes or
stable identifiers only where correlation is needed.

Parsing is fail closed for evaluation-critical data:

- missing or conflicting `session.id` fails trace completeness;
- missing top-level agent role fails trace completeness;
- malformed JSON tool arguments fail trajectory accuracy;
- duplicate correlation IDs fail trace completeness;
- a recognized span with required evaluation content missing fails the relevant
  dimension;
- unknown contextual spans are ignored and counted, not rejected;
- unrecognized scope prefixes fail compatibility.

## Score model and threshold policy

All scores are normalized to the inclusive range `0.0` to `1.0`.

The deterministic prototype uses these dimensions:

| Dimension | Meaning |
| --- | --- |
| `telemetry_compatibility` | Recognized scope and convention-specific attributes are present and parseable |
| `trace_completeness` | Session, turn, top-level agent role, required message content, and correlation are reconstructable |
| `tool_trajectory_accuracy` | Selected tools, order, and required argument subsets match the expected trajectory |
| `behavioural_outcome` | Citation, abstention, denial, timeout, or approval behaviour matches the scenario assertion |
| `goal_success` | The complete synthetic task reaches the expected terminal state without an unauthorized action |

Default required thresholds are versioned in a manifest rather than embedded in
workflow YAML. Initial deterministic thresholds are intentionally strict:

```text
telemetry_compatibility >= 1.0
trace_completeness >= 1.0
tool_trajectory_accuracy >= 1.0 when a trajectory is expected
behavioural_outcome >= 1.0
goal_success >= 1.0
```

The gate evaluates every applicable dimension independently. It does not permit
a high average to hide a zero in an authorization, approval, trace-completeness,
or tool-trajectory dimension. Missing scenarios, missing evaluator results,
non-numeric scores, unknown threshold keys, or an empty result set fail closed.

Managed AgentCore scores such as GoalSuccessRate, Correctness, Helpfulness, and
custom evaluator results are mapped into the same result envelope but retain
their original evaluator ID and evaluation level. A local deterministic score
must never be relabelled as a managed AgentCore score.

## CI design

### Required pull-request quality gate

The existing API CI job will run a dedicated package script that:

1. loads the versioned scenario and threshold manifests;
2. validates both conventions and normalizes the fixture spans;
3. runs deterministic evaluators;
4. writes a sanitized JSON report under the runner temporary directory;
5. exits non-zero if any required score is absent or below threshold.

The normal test suite covers unit and negative cases. The dedicated command is
kept visible in workflow output so reviewers can identify the agent-evaluation
quality gate separately from general API tests.

The uploaded report, if retained, contains:

- contract and threshold versions;
- scenario IDs;
- convention and evaluator identifiers;
- numeric scores, thresholds, pass/fail, and reason codes;
- trace/session correlation hashes or synthetic IDs;
- execution timestamp and source commit.

It excludes raw prompts, responses, tool arguments, tool outputs, model content,
credentials, endpoints, and cloud resource identifiers.

### Protected AgentCore parity quality gate

A provider-parity workflow is manual and protected. Before remote operations it
requires:

- an explicit mode and exact confirmation phrase;
- a protected GitHub environment;
- short-lived GitHub OIDC credentials;
- an approved AgentCore runtime and telemetry data source;
- synthetic-only scenario selection;
- region, budget, timeout, and maximum-scenario limits;
- required runtime/session identifiers and evaluator IDs;
- a fail-closed check that message content is available to the evaluation data
  source.

The workflow invokes fixed prompts, waits for telemetry ingestion within a
bounded timeout, runs on-demand evaluation with expected trajectories and other
reference inputs, applies versioned score thresholds, and retains only the
sanitized result envelope.

The protected path is **source/design scope first**. It must not be described as
live validated until a separately approved run completes and its sanitized
evidence is reviewed.

## Data, privacy, and evidence boundary

Response-quality evaluation requires message content; spans alone are not
enough. Therefore this prototype uses only synthetic prompts, responses, tool
inputs, and tool outputs.

The design separates three evidence layers:

| Evidence layer | May contain | Retention boundary |
| --- | --- | --- |
| In-memory local evaluation input | Fixed synthetic messages and tool content | Process lifetime or checked-in synthetic fixture |
| CI evaluation report | IDs, versions, scores, thresholds, reason codes, and pass/fail | Metadata-only build artifact |
| Protected provider telemetry | Synthetic messages required by AgentCore Evaluations | Bounded CloudWatch retention and separately approved runtime evidence |

No customer, employer, production, confidential, credential, or personal data
is permitted in the scenario pack or provider-parity run.

## Error handling

The required gate distinguishes contract failures from quality failures:

- `invalid_telemetry_contract`: scope, attribute, grouping, or correlation error;
- `incomplete_evaluation_input`: required prompt, response, trajectory, or
  assertion absent;
- `evaluator_failed`: evaluator produced no valid result;
- `score_below_threshold`: valid result failed a required threshold;
- `unsafe_observed_trajectory`: tool execution crossed a deny or approval
  boundary;
- `provider_evaluation_unavailable`: protected AgentCore parity run timed out or
  returned no results.

All produce non-zero CI exit status. Provider unavailability does not silently
fall back to a local score in a job explicitly configured to prove managed
evaluation.

## Testing strategy

Implementation follows test-driven development:

1. contract tests for valid OpenTelemetry GenAI and OpenInference fixtures;
2. failing tests for invalid scope, missing session ID, missing top-level span,
   malformed tool input, and duplicate correlation;
3. equivalence tests proving both conventions yield the same normalized
   trajectory;
4. score tests for exact match and every negative behavioural case;
5. threshold tests proving missing or below-threshold results fail closed;
6. privacy tests proving the report cannot serialize prompt, response, tool
   argument, or tool output content;
7. workflow/static tests proving the required gate runs on pull requests and a
   future provider path remains manual, protected, bounded, and explicit.

## Documentation updates

Implementation should update:

- the API README with local quality-gate commands and evidence boundaries;
- AgentCore RAG architecture with the framework-neutral evaluation lane;
- the AgentCore key-process record with evidence status;
- current status with the exact source/local/live validation level;
- featured solutions with the evaluator and telemetry story;
- a dedicated implementation/runbook record for thresholds, failures, and the
  future protected parity run.

## Non-goals

This increment does not claim or implement:

- production online evaluation or sampling;
- arbitrary production traffic capture;
- full OTLP transport or CloudWatch ingestion validation in the local lane;
- a deployed custom evaluator Lambda;
- automatic model judging on every pull request;
- long-term evaluator drift dashboards or alarms;
- cross-region data-residency approval;
- framework instrumentation packages for every supported framework;
- production correctness, safety, fairness, or regulatory assurance.

## Acceptance criteria

The design is implemented when:

1. valid OpenTelemetry GenAI and OpenInference fixtures normalize into the same
   framework-neutral evaluation model;
2. fixed prompts, expected trajectories, assertions, and versioned thresholds
   are represented as reviewable synthetic contracts;
3. deterministic evaluators score every required dimension from `0.0` to `1.0`;
4. CI fails closed on incompatible, incomplete, missing, or below-threshold
   results;
5. the published report is metadata-only;
6. documentation clearly separates local contract evidence from managed
   AgentCore evidence;
7. no AWS mutation or paid evaluation is required for ordinary pull requests;
8. any protected provider-parity source requires a separate explicit runtime
   approval before execution.

## Primary references

- [Evaluate any agent framework with Amazon Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/machine-learning/evaluate-any-agent-framework-with-amazon-bedrock-agentcore-evaluations/)
- [Amazon Bedrock AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html)
- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai)
- [OpenInference specification](https://github.com/Arize-ai/openinference)
