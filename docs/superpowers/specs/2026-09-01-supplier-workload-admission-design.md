# Supplier-Aware Workload Admission Design

**Linear:** YY-64
**Status:** Approved design, implementation pending
**Date:** 1 September 2026

## 1. Purpose

Connect the synthetic supplier-readiness decision to the AI Workload Operating
Contract so a workload cannot bypass an external-dependency decision by copying
an `eligible` value into its own metadata.

The admission path must:

- replay the recorded supplier decision from its assessment;
- re-evaluate the assessment at the explicit workload-admission time;
- correlate workload, assessment, decision, supplier class, scope, and review
  boundaries;
- require bounded human acceptance for a current `conditional` result; and
- emit metadata-only admission evidence that can be linked into the existing
  control-plane evidence map.

This remains a local, provider-neutral contract demonstration. It does not
contact suppliers, retrieve assurance documents, approve procurement, call a
cloud provider, deploy a workload, or replace human assurance.

## 2. Current State

YY-63 provides a deterministic supplier evaluator with explicit
`evaluatedAt`, assessment review expiry, evidence validity, evidence revocation,
conditional remediation expiry, and structured reassessment triggers.

The workload profile currently describes runtime, capacity, Kueue-aware
admission intent, controls, and evidence signals. It does not identify or
validate a material supplier dependency. The control-plane evidence map links
five existing governance lanes but does not correlate a workload with its
supplier assessment and admission decision.

## 3. Chosen Architecture

Use an independent supplier-aware workload admission evaluator. The evaluator
consumes complete contract objects, not a caller-supplied status string.

```text
Workload profile
  + supplier assessment
  + recorded supplier decision
  + conditional human acceptance, when required
  + explicit workload admission time
        |
        v
Validate dependency declaration and references
        |
        v
Replay recorded supplier decision at its original evaluatedAt
        |
        v
Re-evaluate supplier assessment at workload admission evaluatedAt
        |
        v
Eligible -------------------------------> admitted
Conditional -> validate acceptance -----> admitted or denied
Not eligible / mismatch / missing ------> denied
        |
        v
Metadata-only workload supplier admission decision
        |
        v
Control-plane workloadDependencyCorrelation
```

This design keeps supplier evaluation, workload admission, human acceptance,
and evidence correlation as separate units with explicit interfaces.

## 4. Contract Versioning

YY-64 intentionally changes interfaces used by stored fixtures. The changes
must be explicit rather than silently changing the meaning of version `1.0`.

### 4.1 Supplier readiness decision `1.1`

Upgrade the supplier decision contract and evaluator output from `1.0` to
`1.1`. Add:

- `decisionId`: deterministic identity derived from `assessmentId` and
  `evaluatedAt`; and
- `scope`: copied from the assessment so the admission evaluator can verify the
  workload's expected dependency scope without trusting a second free-form
  source.

The deterministic identifier is:

```text
<assessmentId>:<evaluatedAt>
```

The six YY-63 recorded decisions must be regenerated through the evaluator and
remain exactly replayable.

The supplier assessment contract remains `1.0`; YY-64 does not change its
meaning.

### 4.2 Workload profile `1.1`

Upgrade the workload-profile contract from `1.0` to `1.1` and require a
`supplierDependency` object on every profile.

Applicable dependency:

```json
{
  "applicability": "applicable",
  "assessmentId": "synthetic-managed-ai-service",
  "decisionId": "synthetic-managed-ai-service:2026-08-31T01:00:00.000Z",
  "expectedSupplierClass": "managed-ai-service",
  "expectedScope": "Synthetic managed model and retrieval service boundary"
}
```

Not-applicable dependency:

```json
{
  "applicability": "not-applicable",
  "reason": "No material external AI service or dedicated capacity dependency is in scope."
}
```

The schema uses a closed discriminated union. An applicable record cannot omit
references. A not-applicable record cannot carry supplier identifiers.
`conditionalAcceptanceId` is optional on an applicable record because it is
valid only when the replayed current supplier result is `conditional`.

### 4.3 Conditional acceptance `1.0`

Create a closed, metadata-only conditional-acceptance contract:

```text
schemaVersion
acceptanceId
assessmentId
decisionId
acceptanceState: accepted | revoked
acceptedEvidenceFamilies[]
acceptedByRole
acceptedAt
validUntil
evidenceReferences[]
```

Acceptance binds to one recorded decision and the exact conditional evidence
families. It stores a role and synthetic evidence reference, not a person,
signature, raw approval, or assurance payload.

### 4.4 Workload supplier admission decision `1.0`

Create a closed discriminated decision contract. Every outcome contains:

```text
schemaVersion
admissionDecisionId
workloadId
supplierDependencyApplicability: applicable | not-applicable
decision: admitted | denied
reasonCodes[]
supplierReasonCodes[]
evaluatedAt
conditionalAcceptanceId (optional)
evidenceReferences[]
```

An applicable outcome additionally requires `supplierAssessmentId` and
`supplierDecisionId`. A not-applicable outcome omits both fields and cannot
carry `conditionalAcceptanceId`. The `supplierReasonCodes` array is required
but may be empty when no supplier evaluation result applies.

`admissionDecisionId` is deterministic from `workloadId`, the applicable
`supplierDecisionId` or the literal `not-applicable`, and admission
`evaluatedAt`:

```text
<workloadId>:<supplierDecisionId-or-not-applicable>:<evaluatedAt>
```

No random identifier or wall clock is permitted.

`evaluatedAt` preserves the caller-supplied string so an invalid input can
still produce a bounded `admission-time-invalid` decision without inventing a
timestamp. Every other decision path requires it to be a valid date-time.

## 5. Evaluator Interface

Create one focused module with this conceptual interface:

```ts
evaluateWorkloadSupplierAdmission({
  workloadProfile,
  supplierAssessment,
  recordedSupplierDecision,
  conditionalAcceptance,
  evaluatedAt
}): WorkloadSupplierAdmissionDecision
```

The supplier objects and acceptance are optional at the TypeScript boundary so
the evaluator can return bounded fail-closed decisions for missing inputs.
Schema validation remains a separate contract concern.

The evaluator must call the existing `evaluateSupplierReadiness` function. It
must not duplicate YY-63 freshness or readiness logic.

## 6. Decision Algorithm and Precedence

Evaluate in this order:

1. Parse and validate the explicit workload admission `evaluatedAt`. Invalid
   input returns `admission-time-invalid`.
2. If dependency applicability is `not-applicable`, admit with
   `supplier-dependency-not-applicable` only when no supplier identifiers or
   acceptance are present.
3. For an applicable dependency, require the assessment and recorded decision.
   Missing objects return `supplier-assessment-missing` or
   `supplier-decision-missing`.
4. Correlate the profile's assessment ID, decision ID, supplier class, and
   expected scope with the supplied assessment and recorded decision. Any
   disagreement returns `supplier-reference-mismatch`.
5. Replay the recorded decision using the assessment and the recorded
   decision's original `evaluatedAt`. Exact mismatch returns
   `supplier-decision-replay-mismatch`.
6. Re-evaluate the unchanged assessment at workload admission `evaluatedAt`.
   A current `not-eligible` result returns `supplier-decision-not-eligible` and
   copies its bounded supplier reason code into `supplierReasonCodes`.
7. A current `eligible` result admits with `supplier-decision-eligible`. An
   unexpected acceptance reference on an eligible path returns
   `conditional-acceptance-unexpected`.
8. A current `conditional` result requires a conditional-acceptance object and
   matching `conditionalAcceptanceId`. Missing data returns
   `conditional-acceptance-missing`.
9. Validate acceptance identity, assessment/decision references, evidence-family
   coverage, and time relationships. Mismatch returns
   `conditional-acceptance-mismatch`; contradictory timestamps return
   `conditional-acceptance-boundary-invalid`.
10. Revoked acceptance returns `conditional-acceptance-revoked`. Admission
    later than `validUntil` returns `conditional-acceptance-expired`.
11. Acceptance `acceptedAt` must be at or after the recorded supplier decision,
    no later than admission time, and its `validUntil` may not exceed the
    assessment review boundary or any applicable remediation due date.
12. A valid current conditional decision admits with
    `conditional-supplier-decision-accepted`.

Boundary equality remains valid. Expiry occurs only when admission time is
later than the applicable boundary.

## 7. Trust and Evidence Boundary

The workload profile contains references and expected scope; it does not contain
an authoritative supplier outcome. The admission evaluator establishes trust
by replaying the recorded decision and re-evaluating the assessment.

The implementation must never:

- accept a workload-provided `eligible` or `conditional` value;
- skip replay because identifiers match;
- read the system clock;
- fetch an evidence URI;
- store raw supplier documents, prompts, model outputs, credentials, personal
  approver identities, or signatures;
- call a supplier or cloud API; or
- convert `admitted` into runtime execution authority.

`Admitted` means only that the synthetic dependency gate passed at the supplied
evaluation time.

## 8. Control-Plane Evidence Correlation

Preserve the existing five P6d evidence lanes. Add a separate required
`workloadDependencyCorrelation` object to the evidence-map schema and fixture:

```text
workloadId
supplierAssessmentId
supplierDecisionId
admissionDecisionId
conditionalAcceptanceId (optional)
evaluatedAt
evidencePaths[]
```

This is clearer than adding a sixth lane with mixed workload and supplier
semantics. Every path remains under `shared/examples/` and points only to
synthetic metadata fixtures.

The correlation object proves which workload admission consumed which supplier
decision. It does not assert that the referenced supplier, approval, workload,
or runtime exists.

## 9. Synthetic Scenarios

Implement stored, replayable examples for:

| Scenario | Expected result | Purpose |
| --- | --- | --- |
| Managed service | `admitted` | Current eligible supplier assessment and exact reference correlation. |
| Dedicated capacity | `admitted` | Current conditional result with valid, bounded human acceptance. |
| Denied dependency | `denied` | Revoked or otherwise not-eligible supplier evidence blocks workload admission. |

Unit-level negative cases must also cover:

- missing assessment;
- missing decision;
- mismatched assessment ID;
- mismatched decision ID;
- mismatched supplier class;
- mismatched scope;
- recorded decision replay mismatch;
- stale or expired supplier decision at admission time;
- missing conditional acceptance;
- mismatched acceptance;
- revoked acceptance;
- expired acceptance; and
- invalid acceptance time boundaries.

## 10. Existing Fixture Migration

Update all six supplier decision fixtures to version `1.1` with deterministic
`decisionId` and copied `scope`.

Update all four workload-profile fixtures to version `1.1` with an explicit
supplier dependency. Use the managed-service decision for agent/RAG and batch
examples. Use the dedicated-capacity conditional decision plus the same valid
synthetic acceptance record for fine-tuning and distributed-training examples.

No fixture may use a real supplier name, account, contract, location, assurance
document, or procurement record.

## 11. Testing Strategy

Use strict RED/GREEN cycles.

1. Supplier decision identity tests fail before `decisionId` and `scope` are
   implemented, then confirm all six decisions replay exactly.
2. Workload schema tests fail before the `supplierDependency` union and fixture
   migration exist, then validate both applicable and not-applicable shapes.
3. Admission evaluator tests fail before the new evaluator exists, then cover
   positive and fail-closed precedence with real supplier evaluator calls.
4. Admission contract tests validate the three stored scenario pairs and exact
   replay results.
5. Evidence-map tests fail before correlation metadata exists, then validate
   every identifier and evidence path.
6. The complete API suite, AgentCore Runtime suite, Argo CD contract checks, GPU
   quota parser, JSON parsing, Markdown links, and diff hygiene must remain
   green.

Tests may use `structuredClone` and synthetic fixtures. They must not mock the
supplier evaluator, read the wall clock, call a provider, or access the network.

## 12. Documentation Changes

Update:

- `docs/practices/ai-workload-operating-contract.md` with the supplier-aware
  admission flow and conditional-acceptance boundary;
- `docs/practices/ai-supplier-readiness-gate.md` with the downstream consumer
  relationship without claiming runtime enforcement;
- `docs/evidence/control-plane-evidence-map.md` with workload dependency
  correlation;
- `docs/practices/current-status.md` and `README.md` with exact implemented and
  deferred boundaries; and
- a private YY-64 implementation note recording the RED/GREEN sequence,
  contract migration, validation results, and debugging lessons.

## 13. Explicitly Deferred

YY-64 does not implement:

- supplier or procurement-system adapters;
- document ingestion, signatures, or evidence verification;
- autonomous approval or revocation;
- persistent decision storage;
- workload scheduler, Kueue, Kubernetes, GPU, or cloud admission integration;
- provider-specific policy translation; or
- notification and reassessment automation.

The human-owned adapter and review workflow remains YY-65.

## 14. Acceptance Criteria

YY-64 is complete when:

- applicable workloads cannot be admitted without correlated supplier objects;
- recorded supplier decisions are replayed exactly before use;
- supplier readiness is re-evaluated at explicit admission time;
- missing, mismatched, stale, revoked, expired, or `not-eligible` dependencies
  fail closed;
- conditional admission requires valid, bounded human acceptance tied to the
  decision and conditional evidence families;
- three stored admission scenarios reproduce their recorded outcomes;
- the evidence map links workload, supplier, admission, and optional acceptance
  identifiers without raw evidence;
- public documentation states that the path is local and synthetic; and
- all local and repository regression tests pass.
