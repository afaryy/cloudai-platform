# P8g Direct Bedrock Guardrail Evaluation Design

## Purpose

P8g adds a bounded, manual evaluation of the existing Terraform-managed
Bedrock Guardrail. It follows P8f, which already proved that a versioned
Guardrail can be attached to a synthetic `Converse` call under a separate
GitHub OIDC role.

P8g evaluates the Guardrail directly through `ApplyGuardrail`. This makes the
expected decision deterministic and avoids a model response and inference
cost. It is evidence for three deliberately narrow synthetic cases, not a
claim of complete safety coverage or production readiness.

## Scope

P8g adds:

1. A manually dispatched Guardrail-evaluation mode in the existing protected
   `terraform-bedrock-sandbox` workflow.
2. Exactly three synthetic scenarios: safe, PII-shaped, and prompt-attack-shaped.
3. One direct `ApplyGuardrail` request per scenario against the Terraform
   output Guardrail identifier and version.
4. A metadata-only local verdict: scenario label, expected decision, actual
   decision, and aggregate pass/fail.
5. Static workflow-contract tests and operator documentation.

## Non-goals

P8g must not:

- modify the P8f guarded `Converse` smoke test or the model-only smoke test;
- add model invocation, agents, RAG, tools, storage, or an automatic CI call;
- create, update, version, or delete Guardrails at runtime;
- add repository or GitHub environment variables;
- print, upload, or retain raw assessed content, API output, trace, Guardrail
  identifiers, versions, ARNs, account identifiers, credentials, state, or
  provider error text;
- evaluate personal, customer, internal, confidential, or production data;
- claim false-positive coverage, classifier quality, policy completeness, or
  production certification.

## Execution Boundary

The workflow uses the existing protected `aws-sandbox` environment and the
existing separate Guardrail smoke role. Terraform remote state provides the
current Guardrail identifier and pinned version; the workflow masks both before
using them. No copied Guardrail values belong in GitHub environment settings.

The evaluation mode requires a new exact confirmation phrase distinct from the
P8f guarded-Converse confirmation. It runs only by explicit manual dispatch.
Each API call is non-production, uses synthetic content only, disables tracing
where the API supports it, sets `AWS_MAX_ATTEMPTS=1`, and cleans up temporary
files on exit.

`ApplyGuardrail` is intentionally selected instead of `Converse` because P8f
already establishes attachment and model-runtime access. P8g isolates the
Guardrail decision itself from model variability and model inference cost.

## Scenario Contract

The implementation has exactly these opaque scenario labels and expected
verdicts:

| Scenario label | Expected verdict | Meaning |
| --- | --- | --- |
| `safe-synthetic` | `allowed` | The synthetic safe case is not intervened. |
| `pii-shaped-synthetic` | `blocked` | The configured PII handling intervenes. |
| `prompt-attack-shaped-synthetic` | `blocked` | The configured Prompt Attack handling intervenes. |

The assessed strings must be minimal, synthetic, and constructed only during
the workflow run. They must not appear in log output, test fixtures, workflow
messages, artifacts, or documentation. Scenario labels are the only content
identifiers that may be reported.

The local verdict is derived only from structured `ApplyGuardrail` action
metadata. It must never inspect, echo, or persist assessed content. A scenario
passes only when its actual verdict matches the expected verdict.

## Workflow Behaviour

The new mode must:

1. validate the exact confirmation and existing required protected settings;
2. retrieve and mask the Terraform Guardrail outputs;
3. assume the existing restricted Guardrail role through GitHub OIDC;
4. run the three scenarios once each;
5. record only label, expected verdict, actual verdict, and pass/fail locally;
6. stop with a sanitized failure category on an AWS/API failure or unexpected
   verdict;
7. emit a single metadata-only aggregate success marker only if all three
   expected verdicts pass.

The workflow fails closed. It must not retry a request, downgrade a mismatch to
a warning, reveal raw error text, or continue after an unknown API result.

## Failure Handling

Permitted sanitized failure categories include:

- `access-denied`;
- `validation`;
- `throttled`;
- `unexpected-verdict`;
- `unknown`.

Missing configuration, remote-state failure, OIDC failure, unrecognised action
metadata, or a scenario mismatch must fail the job without raw diagnostic
content. Troubleshooting requires controlled operator access to the GitHub and
AWS consoles; it must not expand workflow logging.

## Evidence Boundary

Permitted evidence is limited to:

- the selected manual workflow mode;
- confirmation that three synthetic evaluations ran;
- opaque scenario label, expected verdict, and actual verdict;
- aggregate pass/fail or sanitized failure category;
- static test and workflow-check status.

P8g proves that this one Guardrail configuration made the expected decisions
for the three synthetic scenarios at that point in time. It does not prove
model safety, complete prompt-injection resistance, PII-detection accuracy,
business-policy validity, or suitability for real data.

## Tests

Static tests must assert:

- direct `ApplyGuardrail` is used and no model invocation is added;
- exactly three opaque scenarios and expected verdicts exist;
- an exact manual confirmation is required;
- existing protected environment and Guardrail-role boundaries are reused;
- Terraform outputs are masked and raw assessed content is not emitted;
- one-attempt, no-retry, cleanup, fail-closed, and sanitized-category behaviour;
- the P8f guarded-Converse and existing smoke-test modes remain unchanged.

The normal repository checks and targeted workflow-contract tests must remain
green. A live evaluation is manually dispatched only after implementation is
merged and the user explicitly chooses to run it.

