# Synthetic AI Supplier Readiness Gate

## Status and Boundary

This repository implements a local, deterministic, metadata-only readiness gate
for two synthetic supplier classes:

- managed AI services; and
- dedicated AI capacity.

The gate validates a closed assessment contract, checks evidence applicability,
freshness, revocation, and completeness, evaluates current external
requirements, and emits one of three decisions: `eligible`, `conditional`, or
`not-eligible`.

A separate local workload-admission evaluator now consumes those decisions. It
replays the recorded decision, re-evaluates the unchanged assessment at the
requested admission time, correlates exact IDs, class, and scope, and produces
a metadata-only `admitted` or `denied` decision.

It does not contact a supplier, approve a procurement, certify a control,
perform legal or regulatory due diligence, retrieve evidence, or call a cloud
provider. The examples use generic identifiers and synthetic metadata only.

## Why This Gate Exists

Supplier decisions can become fragmented across security questionnaires,
architecture reviews, commercial assessments, sustainability records, and
future-policy trackers. This gate turns those inputs into one reproducible
decision boundary without pretending that a deterministic evaluator replaces
human assurance.

```text
Supplier scope
  -> closed assessment schema
  -> explicit evaluation time and temporal-boundary validation
  -> evidence-family freshness, revocation, completeness, and applicability
  -> current-requirement checks
  -> deterministic readiness decision
  -> workload dependency correlation and decision replay
  -> admission-time re-evaluation
  -> eligible, bounded conditional acceptance, or fail-closed denial
  -> metadata-only workload admission evidence
```

The schema owns the shape of accepted metadata. The evaluator owns the decision
logic. Human owners remain accountable for the accuracy and acceptance of the
referenced evidence.

## Required Evidence Families

Every assessment contains exactly one record for each family below. A family
may be marked `not-applicable`, but the applicability decision must be explicit
and consistent with its evidence status.

| Evidence family | Readiness concern |
| --- | --- |
| `security-privacy` | Identity, data, network, encryption, subprocessors, and incident boundaries. |
| `ai-governance` | Intended use, model/tool change, evaluation, human oversight, and prohibited-use ownership. |
| `risk-compliance` | Applicable obligations, risk classification, exceptions, approvals, and review dates. |
| `data-model-tool-lifecycle` | Input, output, embedding, log, model, and tool retention, reuse, lineage, and deletion. |
| `operations-resilience` | Availability, capacity, observability, recovery, support, and dependency concentration. |
| `commercial-exit` | Usage, cost, licensing, portability, termination, return, deletion, and replacement. |
| `sustainability-location` | Applicability-led energy, water, land-use, location, reporting, and regulatory-readiness evidence. |

Raw reports, questionnaires, contracts, prompts, credentials, or provider
payloads do not belong in the decision record. The contract stores metadata and
URI evidence references only.

Each evidence-family record also carries `evidenceState`, `observedAt`, and
`validUntil`. Every assessment carries an explicit `assessedAt`, `reviewBy`, and
structured `reassessmentTriggers` list. The evaluator receives `evaluatedAt` as
an input; it never reads the wall clock, so stored decisions remain deterministic
and replayable.

The trigger list names changes that require human-owned reassessment: supplier
service, model or tool, data or subprocessor, location or capacity, control or
assurance, and contract or regulatory change. Trigger metadata does not poll a
supplier, retrieve evidence, or automatically approve or revoke a decision.

## Deterministic Decision Rules

Rules are evaluated in fail-closed priority order.

| Outcome | Reason code | Condition |
| --- | --- | --- |
| `not-eligible` | `required-evidence-family-missing` | A required family is absent. |
| `not-eligible` | `evidence-applicability-conflict` | Applicability and evidence status disagree. |
| `not-eligible` | `time-boundary-invalid` | Required timestamps are invalid, contradictory, or later than the explicit evaluation time. |
| `not-eligible` | `evidence-revoked` | Applicable evidence is explicitly revoked. |
| `not-eligible` | `assessment-review-expired` | The assessment review boundary is earlier than the explicit evaluation time. |
| `not-eligible` | `evidence-expired` | Applicable evidence is beyond its validity boundary. |
| `not-eligible` | `critical-evidence-missing` | Applicable critical evidence is missing. |
| `not-eligible` | `evidence-missing` | Any other applicable evidence is missing. |
| `not-eligible` | `conditional-boundary-incomplete` | Conditional evidence lacks an owner, due date, or compensating control. |
| `not-eligible` | `conditional-remediation-expired` | A complete conditional remediation boundary exists, but its due date has passed. |
| `not-eligible` | `current-requirement-unmet` | An applicable current requirement is recorded as a gap or tracking item. |
| `conditional` | `bounded-remediation-required` | Evidence is conditional and has a complete remediation boundary. |
| `eligible` | `evidence-complete` | Required evidence is complete or explicitly not applicable, and current requirements are met. |

`Eligible` means the synthetic record passed this contract. It is not a
production approval, procurement decision, supplier endorsement, or statement
of legal compliance.

## External Requirement Status

The gate separates current obligations from direction signals so that it can
respond to change without prematurely claiming enforcement:

- `current-requirement` gaps fail closed;
- `announced-policy-direction` is tracked with an owner and review date;
- `planned-legislation-or-standard` is tracked without inventing thresholds;
- `watch-item` records a review trigger without making the item mandatory.

The assessment schema requires an owner and review date for every external
requirement. Announced, planned, and watch items therefore remain visible, but
they do not automatically block a supplier solely because they are future
signals.

## Synthetic Scenarios

| Scenario | Expected decision | Purpose |
| --- | --- | --- |
| Managed AI service | `eligible` | Demonstrates complete evidence with location/sustainability explicitly not applicable to the scoped service. |
| Dedicated AI capacity | `conditional` | Demonstrates a bounded sustainability/location gap with an owner, expiry, and compensating control. |
| Missing critical evidence | `not-eligible` | Demonstrates fail-closed handling when required security/privacy evidence is absent. |
| Stale assessment | `not-eligible` | Demonstrates that an otherwise complete assessment cannot be reused after its review boundary. |
| Expired remediation | `not-eligible` | Demonstrates that a conditional outcome becomes unavailable after its remediation due date. |
| Revoked evidence | `not-eligible` | Demonstrates immediate fail-closed handling for revoked applicable evidence. |

The stored decisions are replayed through the real evaluator during tests. A
fixture that no longer reproduces its recorded decision fails the contract
suite.

## Downstream Workload Admission Consumer

Supplier decision version `1.1` carries a deterministic `decisionId` and copied
scope. Workload profile version `1.1` references that identity and declares the
expected supplier class and scope. The downstream evaluator trusts neither the
workload reference nor the stored outcome alone: it replays the recorded
supplier decision and then evaluates the assessment again at the explicit
workload admission time.

Conditional supplier outcomes require a distinct, bounded acceptance record.
The acceptance must match the assessment, decision, workload reference, and
exact set of conditional evidence families. It must be current, not revoked,
and no broader or longer-lived than the assessment review and remediation
boundaries. An eligible decision carrying unexpected acceptance data is also
rejected.

This consumer is local and synthetic. It does not fetch an evidence URI,
contact a supplier or provider, approve procurement, schedule a workload, or
grant runtime authority.

## Implementation Evidence

| Artifact | Location |
| --- | --- |
| Assessment schema | `shared/schemas/ai-supplier-readiness/supplier-assessment.schema.json` |
| Decision schema | `shared/schemas/ai-supplier-readiness/supplier-readiness-decision.schema.json` |
| Synthetic fixtures | `shared/examples/ai-supplier-readiness/` |
| Deterministic evaluator | `providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts` |
| Behaviour tests | `providers/aws/app/api/tests/supplierReadinessEvaluator.test.ts` |
| Schema and replay tests | `providers/aws/app/api/tests/supplierReadinessContracts.test.ts` |
| Workload dependency schema and fixtures | `shared/schemas/ai-workload-readiness/` and `shared/examples/ai-workload-readiness/` |
| Conditional acceptance and admission contracts | `shared/schemas/ai-workload-admission/` and `shared/examples/ai-workload-admission/` |
| Supplier-aware admission evaluator | `providers/aws/app/api/src/governance/supplierWorkloadAdmissionEvaluator.ts` |
| Admission behaviour and replay tests | `providers/aws/app/api/tests/supplierWorkloadAdmissionEvaluator.test.ts` and `providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts` |

Run the local validation with:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

## Relationship to the Workload Operating Contract

The [AI Workload Operating Contract](./ai-workload-operating-contract.md)
defines the broader workload admission and operating model. This gate implements
one dependency decision inside that model and now feeds the implemented local
supplier-aware admission consumer described above.

Future provider integration must remain a separate reviewed change. The local
contract defines freshness, revocation, expiry, reassessment, replay, and
workload-correlation semantics, but a provider integration would still need evidence-ingestion boundaries,
identity and access controls, human approval ownership, audit retention, and
tests that preserve the deterministic decision contract.
