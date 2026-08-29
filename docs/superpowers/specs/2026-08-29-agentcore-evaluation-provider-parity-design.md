# AgentCore Evaluation Provider-Parity Design

## Status

Approved direction: implement Stage A before Stage B.

- Stage A proves that equivalent synthetic OpenTelemetry GenAI and
  OpenInference traces can be scored by Amazon Bedrock AgentCore on-demand
  evaluation through a protected, manually dispatched workflow.
- Stage B later proves Runtime telemetry export, CloudWatch ingestion, session
  reconstruction, and managed evaluation as a separate end-to-end path.

This document authorizes design and source implementation only. It does not
authorize an AWS evaluation call, IAM apply, Runtime image release, CloudWatch
configuration change, or resource deletion.

## Problem

The repository now has a required local quality gate that normalizes synthetic
OpenTelemetry GenAI and OpenInference fixtures into one deterministic contract.
That evidence proves local compatibility and fail-closed policy behaviour, but
it does not prove that Amazon Bedrock AgentCore Evaluations accepts the
telemetry, interprets both conventions consistently, or returns usable managed
scores.

The next step must add provider evidence without weakening the ordinary pull
request path or conflating managed model scores with authorization decisions.

## Goals

1. Reuse one canonical synthetic scenario across OpenTelemetry GenAI and
   OpenInference.
2. Convert the repository fixtures into the documented AgentCore
   `sessionSpans` request shape.
3. Run only a fixed allowlist of built-in evaluators with expected response and
   tool-trajectory reference inputs.
4. Fail closed on missing, malformed, partial, below-threshold, or materially
   divergent results.
5. Retain a metadata-only provider-parity artifact.
6. Keep AWS execution manually dispatched, environment-protected,
   confirmation-gated, budget-bounded, and separate from required PR CI.
7. Preserve a clean extension point for the later Runtime-to-CloudWatch path.

## Non-Goals

- Online evaluation or continuous production sampling.
- Production traffic or non-synthetic data.
- An `OnDemandEvaluationDatasetRunner` benchmark suite.
- Automatic AWS evaluation on pull requests or pushes.
- Creation of a new AgentCore CLI project or `agentcore/agentcore.json`.
- Custom LLM-as-a-judge or Lambda evaluator creation.
- Runtime, Gateway, Knowledge Base, model, prompt, or tool changes in Stage A.
- Treating an evaluation score as an IAM, admission, approval, or execution
  decision.
- Claiming OTLP export, CloudWatch ingestion, or production agent quality from
  Stage A.

## Official Compatibility Basis

The design follows these current AWS interfaces:

- `Evaluate` is a synchronous AgentCore data-plane API accepting
  `evaluationInput.sessionSpans` plus optional target and reference inputs.
- The AWS SDK for JavaScript exposes `BedrockAgentCoreClient` and
  `EvaluateCommand` in `@aws-sdk/client-bedrock-agentcore`.
- Generic evaluation compatibility is selected by instrumentation scopes under
  `opentelemetry.instrumentation.*` or `openinference.instrumentation.*`.
- Session reconstruction requires `session.id`; quality evaluation also needs
  message content.
- AgentCore reads invoke-agent, inference, and execute-tool span roles while
  ignoring unfamiliar contextual spans.
- A provider result may contain partial failures, error details, explanations,
  token usage, and at most ten results. The workflow must sanitize that output
  before artifact upload.

References:

- [AWS announcement: evaluate any agent framework](https://aws.amazon.com/blogs/machine-learning/evaluate-any-agent-framework-with-amazon-bedrock-agentcore-evaluations/)
- [AgentCore Evaluate API](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_Evaluate.html)
- [AWS SDK for JavaScript EvaluateCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-agentcore/command/EvaluateCommand/)
- [Getting started with on-demand evaluation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/getting-started-on-demand.html)
- [Understanding evaluation input spans](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/understanding-input-spans.html)

## Chosen Architecture

### Why staged delivery

Three options were considered:

1. Directly submit constructed spans to `Evaluate`.
2. Instrument and invoke the deployed Runtime, wait for CloudWatch, then
   evaluate the ingested session.
3. Start with the dataset runner or online evaluation.

Option 1 is the first stage because it isolates the managed evaluator contract
from Runtime instrumentation and CloudWatch ingestion. Option 2 follows because
it proves the operational path that Stage A deliberately excludes. Option 3 is
deferred because it adds invocation orchestration, sampling, cost, and runtime
coupling before the two smaller boundaries are proven.

```text
Required pull-request lane — no AWS

Canonical scenarios
  -> OpenTelemetry GenAI + OpenInference fixtures
  -> local normalizer
  -> deterministic strict-v1 gate
  -> metadata-only local-contract artifact

Protected Stage A — manually approved AWS call

Canonical cited-answer scenario
  -> provider request builder
  -> valid AWS sessionSpans per convention
  -> fixed built-in AgentCore evaluators
  -> result validation + cross-convention comparison
  -> metadata-only provider-direct artifact

Protected Stage B — later, separately approved

Gateway invocation
  -> instrumented Runtime
  -> ADOT force flush
  -> CloudWatch unified observability
  -> bounded ingestion retry
  -> AgentCore evaluation
  -> metadata-only provider-runtime artifact
```

## Stage A: Direct-Span Managed Parity

### Scenario scope

The initial managed run uses only `synthetic-cited-answer`, represented once by
OpenTelemetry GenAI and once by OpenInference. The local required gate continues
to cover all six scenarios under both conventions.

The smaller provider set is deliberate:

- it proves generic framework routing;
- it contains one invoke-agent, inference, and execute-tool path;
- it supports expected response and expected trajectory references;
- it caps cost and makes provider differences easier to diagnose;
- it avoids treating an expensive managed evaluator as a duplicate of every
  deterministic local assertion.

Expansion to the full six-case pack requires a new reviewed threshold profile,
call budget, and explicit execution approval.

### Fixed evaluator matrix

Each convention is evaluated with exactly three built-in evaluators:

| Evaluator | Level | Reference or target |
| --- | --- | --- |
| `Builtin.Correctness` | Trace | Fixed expected response and the generated trace ID. |
| `Builtin.ToolSelectionAccuracy` | Tool call | Fixed expected trajectory and generated tool span ID. |
| `Builtin.GoalSuccessRate` | Session | Fixed expected response, assertions, and expected trajectory. |

The result is six managed `Evaluate` calls: two conventions multiplied by
three evaluators. Evaluator IDs are code-owned and cannot be supplied through a
workflow input.

### Threshold profile

Managed model scores are probabilistic, so they use a separate versioned
profile rather than the deterministic local `strict-v1` profile.

`provider-parity-v1` requires:

- `Builtin.Correctness >= 0.70`;
- `Builtin.ToolSelectionAccuracy >= 0.70`;
- `Builtin.GoalSuccessRate >= 0.70`;
- absolute score difference between the two conventions for the same evaluator
  `<= 0.20`;
- zero failed, missing, non-finite, duplicated, or unexpected results.

The workflow must not permit threshold overrides. Changing a threshold requires
a reviewed repository change. A failed managed score blocks that manually
dispatched run but does not change access policy or trigger remediation.

### Provider request builder

The canonical fixtures remain provider-neutral and are not sent as-is. A pure
TypeScript builder will:

1. accept one validated `TelemetryFixture` and its `EvaluationScenario`;
2. require `syntheticOnly: true` and the fixed scenario ID;
3. require exactly one session and the three required span roles;
4. map the generic wrapper to the AWS JSON document shape;
5. generate deterministic valid OpenTelemetry trace and span identifiers from
   the scenario and convention using SHA-256-derived lowercase hexadecimal IDs;
6. preserve the supported instrumentation scope and `session.id`;
7. build evaluator-specific target and reference inputs;
8. reject unknown attributes that are not part of the reviewed compatibility
   subset;
9. return a typed `EvaluateCommandInput` without writing the request to disk.

Synthetic prompt, response, tool arguments, and tool result content are sent to
the managed evaluator because those fields are required to score correctness,
trajectory, and goal completion. They are public synthetic data and must never
be copied into the evidence artifact.

### Provider client boundary

The package will pin `@aws-sdk/client-bedrock-agentcore` to the reviewed version
used by the implementation. Production code creates a
`BedrockAgentCoreClient` only after all local confirmation, budget, fixture, and
allowlist checks pass. Tests inject a small client interface and never obtain
AWS credentials or call a provider.

The runner executes calls serially. SDK retries remain bounded; application
code must not add unbounded retry loops. Each call is associated with one
convention and evaluator before the response is sanitized.

### Fail-closed result handling

The managed run fails with a bounded code when any of these occurs:

- exact confirmation is absent;
- source commit is not the protected branch or approved revision;
- readiness or call-budget variables are absent or invalid;
- fixture or scenario is not the fixed synthetic case;
- an instrumentation scope is unrecognized;
- generated request count is not exactly six or exceeds the maximum;
- an evaluator result is absent, duplicated, unexpected, or contains
  `errorCode`;
- a score is missing, non-numeric, non-finite, outside zero-to-one, or below its
  threshold;
- cross-convention score delta exceeds the parity tolerance;
- the SDK returns access, throttling, quota, validation, or internal-service
  failure;
- the sanitized artifact cannot be written.

Provider exception messages, evaluation explanations, raw request content, and
raw provider responses must not be printed or uploaded. Logs use a stable local
reason code and the evaluator ID only.

## Protected Workflow

Create `.github/workflows/agentcore-evaluation-provider-parity.yml` with two
manual modes:

- `validate`: runs contract tests, request-builder tests, workflow boundary
  checks, and a dry-run that uses an injected fake client. It requires no OIDC
  token, environment, or AWS access.
- `direct-spans`: uses the `aws-sandbox` GitHub Environment, obtains short-lived
  credentials through OIDC, and runs the six fixed managed evaluations.

`direct-spans` requires all of the following:

- exact confirmation
  `I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY`;
- `AGENTCORE_EVALUATION_READY=true` in the protected environment;
- `AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME` stored as a protected environment
  variable or secret;
- `AWS_REGION=ap-southeast-2` unless a separately reviewed regional change is
  committed;
- `AGENTCORE_EVALUATION_MAX_CALLS=6` and an implementation hard cap of six;
- one concurrency group with `cancel-in-progress: false`;
- no matrix fan-out and no parallel provider calls;
- a seven-day sanitized artifact retention period.

The workflow is `workflow_dispatch` only. It is never called from `pull_request`,
`push`, another workflow, or a scheduled trigger.

## IAM Design

Stage A uses a dedicated GitHub OIDC evaluation role rather than expanding the
Terraform execution role or Runtime role. Its trust policy is limited to this
repository and the protected `aws-sandbox` environment subject.

The permission policy allows only the AgentCore on-demand `Evaluate` data-plane
action and the minimum AWS SDK support actions proven necessary during a
reviewed plan. If AWS does not support evaluator resource-level scoping for the
data-plane action, the policy may require `Resource: "*"`; that exception must
be isolated in this dedicated role and compensated by:

- fixed evaluator IDs in source;
- exact call-count cap;
- environment approval;
- no evaluator creation, update, deletion, online configuration, Runtime
  invocation, CloudWatch read, or infrastructure permissions;
- a separately reviewed CloudFormation change set.

The role and policy are added to the existing bootstrap CloudFormation
template, but no bootstrap apply is authorized by source implementation. A
future apply requires its own plan, change-set review, exact confirmation, and
user approval.

## Metadata-Only Evidence

The uploaded `agentcore-evaluation-provider-parity` artifact may contain:

- contract, threshold, and evidence versions;
- source commit and GitHub run ID;
- region label without account ID;
- scenario ID and telemetry convention;
- evaluator ID, score, label, threshold, and pass/fail status;
- absolute parity delta per evaluator;
- aggregate input, output, and total evaluation token counts;
- sanitized failure reason code;
- timestamps and total duration bucket.

It must not contain:

- prompt, response, assertion, expected response, or tool content;
- raw spans, request bodies, or provider responses;
- explanation or `errorMessage` text;
- credentials, tokens, account IDs, ARNs, endpoints, resource names, or
  CloudWatch query output;
- repository-local notes or environment-variable values.

The evidence level is `provider-direct`. It is never labelled `provider-runtime`,
`managed production evaluation`, or `production quality`.

## Stage B: Runtime and CloudWatch Parity

Stage B is a separate feature and approval boundary after Stage A has one
successful managed run.

It will:

1. add reviewed OpenTelemetry instrumentation to the custom TypeScript Runtime;
2. emit a top-level `invoke_agent` span and only semantically truthful child
   spans for the actual Runtime operations;
3. preserve the Gateway invocation `runtimeSessionId` as `session.id`;
4. retain only the synthetic message content required for evaluation;
5. force-flush both trace and log providers before the Runtime handler returns;
6. use unified observability or explicitly query every required log source;
7. verify CloudWatch Transaction Search readiness before invocation;
8. invoke one synthetic Gateway request;
9. poll ingestion with bounded retries rather than assuming a fixed delay;
10. evaluate only after a complete session is present;
11. publish separate `provider-runtime` evidence;
12. retain the current Gateway-only, read-only, citation-or-abstention contract.

The AWS skill documents about ten seconds as the typical end-to-end put-to-get
delay, while current AWS examples also warn that ingestion may take longer.
Stage B therefore uses a bounded readiness poll with a documented maximum; it
does not encode a single optimistic sleep as proof of ingestion.

Stage B requires a new design review for Runtime dependencies, image release,
CloudWatch configuration, IAM, log-content handling, cost, rollback, and
teardown. Approval of this spec does not authorize those changes.

## Testing Strategy

All implementation follows test-first development.

### Stage A unit and contract tests

- both conventions create semantically equivalent evaluator inputs;
- deterministic generated IDs have valid widths and do not collide;
- only the cited-answer synthetic fixture is accepted;
- expected response, assertions, and tool trajectory are included in the
  in-memory provider request;
- evaluator levels select the correct trace, span, or session target;
- unknown scope, missing session, missing span role, or unknown attribute fails;
- six and only six provider calls are built;
- fake-client success produces a sanitized report;
- partial failure, missing result, bad score, low score, duplicate result, and
  excess parity delta fail closed;
- output contains none of the forbidden content fields;
- no client call occurs before confirmation and budget validation;
- ordinary CI contains no AWS credentials or managed evaluation call;
- protected workflow has manual trigger, environment, OIDC, exact confirmation,
  hard call cap, serial execution, and short artifact retention.

### Repository validation

- complete API TypeScript build and test suite;
- standalone local deterministic evaluation gate;
- AgentCore Runtime tests remain green;
- GitOps and documentation-link checks remain green;
- CloudFormation lint and static policy tests after the role source is added;
- secret and scope scans remain green.

No test claims live provider success until a separately approved
`direct-spans` workflow run completes.

## Delivery Sequence

1. Add provider request/result schemas and threshold profile.
2. Add pure request builder and its negative tests.
3. Add managed result sanitizer and parity gate with fake-client tests.
4. Add the protected manual workflow and boundary tests.
5. Add the dedicated OIDC evaluation-role source and static IAM tests.
6. Update runbook, architecture, current status, and key process record.
7. Run local verification and open a pull request.
8. After merge, prepare a bootstrap change-set plan; do not apply without fresh
   approval.
9. After an approved role apply and environment handoff, run `validate`.
10. Request fresh confirmation before the first `direct-spans` AWS call.
11. Record only sanitized evidence and then decide whether Stage B should start.

## Success Criteria

Source implementation is complete when:

- local tests prove request equivalence and fail-closed managed result handling;
- the protected workflow cannot run AWS evaluation without every gate;
- the dedicated role source cannot mutate AgentCore, Runtime, Gateway,
  CloudWatch, or evaluator configuration;
- documentation accurately labels Stage A as source implemented and runtime
  validation pending;
- all repository checks pass and a reviewable pull request is open.

Stage A provider validation is complete only after a separately approved AWS
run returns six accepted results, every score meets its versioned threshold,
every parity delta is within tolerance, and the uploaded artifact passes the
metadata boundary checks.

Stage B remains incomplete until a separate design and execution cycle proves
Runtime instrumentation, CloudWatch ingestion, and managed evaluation end to
end.
