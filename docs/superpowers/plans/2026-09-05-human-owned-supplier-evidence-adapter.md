# Human-Owned Supplier Evidence Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a local, synthetic, provider-neutral evidence-intake and
human-review path that publishes versioned metadata records into the existing
deterministic supplier-readiness and workload-admission chain.

**Architecture:** A closed synthetic manifest enters a deterministic adapter
and becomes an immutable Evidence Candidate. Authorized, digest-bound human
review commits an audit event and versioned metadata record atomically; a
projection then supplies only current approved evidence to the unchanged
YY-63 readiness and YY-64 workload-admission evaluators.

**Tech Stack:** TypeScript, Node.js built-in test runner, JSON Schema draft
2020-12, Node `crypto`, synthetic JSON fixtures, Markdown, pnpm 11.7.0.

**Spec:** `docs/superpowers/specs/2026-09-05-human-owned-supplier-evidence-adapter-design.md`

## Global Constraints

- Use synthetic metadata and generic identifiers only.
- Do not connect a supplier, document system, procurement platform, identity
  provider, cloud API, queue, Kafka topic, Kubernetes cluster, or runtime.
- Never store raw evidence, extracted passages, personal names, prompts,
  credentials, contracts, signatures, questionnaires, or provider payloads.
- Every public contract is closed with `additionalProperties: false` and an
  explicit `schemaVersion`.
- Unknown major schema versions fail closed; no silent coercion or critical
  field backfill is allowed.
- Every time value is an explicit input. Production code must not read the wall
  clock.
- An adapter can normalize metadata but cannot approve evidence, author a
  readiness decision, or grant runtime authority.
- Approval binds exact `candidateId` and `contentDigest`; changed evidence
  creates a new candidate and review.
- Submitter and final approver principal references must differ.
- Only the existing `evaluateSupplierReadiness` and
  `evaluateWorkloadSupplierAdmission` functions calculate readiness and
  workload admission.
- Registry or authoritative audit failure prevents a record becoming current.
  Telemetry-export failure preserves authoritative state and creates a bounded
  retryable gap.
- Keep `_private/` notes untracked and never commit them.
- Do not update any design-only status to source-implemented until the complete
  regression suite proves the implementation.

---

## File Structure

### New contracts and fixtures

- `shared/schemas/ai-supplier-evidence/synthetic-evidence-manifest.schema.json`
  — closed adapter-input contract.
- `shared/schemas/ai-supplier-evidence/evidence-candidate.schema.json` —
  immutable pre-review metadata contract.
- `shared/schemas/ai-supplier-evidence/human-review-record.schema.json` —
  digest-bound review and optional exception boundary.
- `shared/schemas/ai-supplier-evidence/versioned-evidence-record.schema.json` —
  current/superseded/expired/revoked registry contract.
- `shared/examples/ai-supplier-evidence/managed-service.*.json` — one complete
  synthetic manifest-to-record path.
- `shared/examples/ai-supplier-evidence/revoked.record.json` — one immutable
  revoked-record example.

### New implementation modules

- `providers/aws/app/api/src/governance/supplierEvidenceTypes.ts` — shared
  evidence-workflow types, enums, and result unions.
- `providers/aws/app/api/src/governance/supplierEvidenceAdapter.ts` — strict
  manifest validation, canonicalization, deterministic identity, and candidate
  creation.
- `providers/aws/app/api/src/governance/supplierEvidenceWorkflow.ts` — role and
  transition enforcement plus atomic in-memory audit/registry demonstration.
- `providers/aws/app/api/src/governance/supplierEvidenceProjection.ts` —
  current-record selection and projection into `SupplierAssessment`.
- `providers/aws/app/api/src/governance/supplierEvidenceTelemetry.ts` — bounded
  metadata-only signal creation.

### New tests

- `providers/aws/app/api/tests/supplierEvidenceContracts.test.ts`
- `providers/aws/app/api/tests/supplierEvidenceAdapter.test.ts`
- `providers/aws/app/api/tests/supplierEvidenceWorkflow.test.ts`
- `providers/aws/app/api/tests/supplierEvidenceProjection.test.ts`
- `providers/aws/app/api/tests/supplierEvidenceTelemetry.test.ts`

### Existing files modified

- `providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts` — export
  the existing seven-family constant and its literal union; do not alter its
  decision order or outputs.
- `docs/practices/ai-supplier-readiness-gate.md`
- `docs/practices/ai-workload-operating-contract.md`
- `docs/evidence/control-plane-evidence-map.md`
- `docs/practices/current-status.md`
- `README.md`

---

### Task 1: Add closed evidence contracts and one replayable fixture set

**Files:**

- Create: `shared/schemas/ai-supplier-evidence/synthetic-evidence-manifest.schema.json`
- Create: `shared/schemas/ai-supplier-evidence/evidence-candidate.schema.json`
- Create: `shared/schemas/ai-supplier-evidence/human-review-record.schema.json`
- Create: `shared/schemas/ai-supplier-evidence/versioned-evidence-record.schema.json`
- Create: `shared/examples/ai-supplier-evidence/managed-service.manifest.json`
- Create: `shared/examples/ai-supplier-evidence/managed-service.candidate.json`
- Create: `shared/examples/ai-supplier-evidence/managed-service.review.json`
- Create: `shared/examples/ai-supplier-evidence/managed-service.record.json`
- Create: `shared/examples/ai-supplier-evidence/revoked.record.json`
- Create: `providers/aws/app/api/tests/supplierEvidenceContracts.test.ts`
- Modify: `providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts`

**Interfaces:**

- Consumes: existing seven evidence-family names from the supplier-readiness
  schema.
- Produces: four version `1.0` closed schemas and fixtures consumed by Tasks
  2–5; exported `SUPPLIER_EVIDENCE_FAMILIES` and
  `SupplierEvidenceFamilyName`.

- [ ] **Step 1: Export the existing family vocabulary without changing behavior**

Replace the private family constant with:

```ts
export const SUPPLIER_EVIDENCE_FAMILIES = [
  "security-privacy",
  "ai-governance",
  "risk-compliance",
  "data-model-tool-lifecycle",
  "operations-resilience",
  "commercial-exit",
  "sustainability-location"
] as const;

export type SupplierEvidenceFamilyName =
  (typeof SUPPLIER_EVIDENCE_FAMILIES)[number];
```

Change `SupplierEvidenceFamily.family` from `string` to
`SupplierEvidenceFamilyName`, and update the existing evaluator reference from
`REQUIRED_EVIDENCE_FAMILIES` to `SUPPLIER_EVIDENCE_FAMILIES`. Make no other
change in that file.

- [ ] **Step 2: Write failing contract tests**

Create a test that loads the four schemas and five fixtures with the existing
`tests/helpers/schemaAssertion.ts` helper:

```ts
const SCHEMA_NAMES = [
  "synthetic-evidence-manifest",
  "evidence-candidate",
  "human-review-record",
  "versioned-evidence-record"
] as const;

test("supplier evidence contracts are closed and versioned", async () => {
  for (const name of SCHEMA_NAMES) {
    const schema = await readJson(`${name}.schema.json`, SCHEMA_DIR);
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.schemaVersion.const, "1.0");
  }
});

test("public fixtures contain metadata only", async () => {
  for (const file of FIXTURE_NAMES) {
    const text = await readFile(resolve(EXAMPLE_DIR, file), "utf8");
    for (const prohibited of [
      "rawEvidence", "documentContent", "personalName", "prompt",
      "credential", "signature", "questionnaire"
    ]) assert.equal(text.includes(prohibited), false);
  }
});
```

Define the fixture list exactly as:

```ts
const FIXTURE_NAMES = [
  "managed-service.manifest.json",
  "managed-service.candidate.json",
  "managed-service.review.json",
  "managed-service.record.json",
  "revoked.record.json"
] as const;
```

Add fixture-to-schema assertions and explicit negative assertions for unknown
fields, unknown schema major versions, personal-name fields, missing digests,
and invalid state-specific properties.

- [ ] **Step 3: Run the contract test and verify RED**

Run:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

Expected: TypeScript or test failure because the four schemas and fixtures do
not exist.

- [ ] **Step 4: Create the closed schemas**

Use these exact required-field sets:

```json
{
  "manifest": [
    "schemaVersion", "supplierAssessmentId", "evidenceFamily",
    "sourceReference", "sourceType", "sourceVersion", "observedAt",
    "validUntil", "contentDigest", "adapterId", "adapterVersion",
    "authenticityState", "redactionState", "submittedByRole",
    "submittedByPrincipalRef", "submittedAt"
  ],
  "candidate": [
    "schemaVersion", "candidateId", "supplierAssessmentId",
    "evidenceFamily", "sourceReference", "sourceType", "sourceVersion",
    "observedAt", "validUntil", "contentDigest", "adapterId",
    "adapterVersion", "authenticityState", "redactionState",
    "validationState", "candidateState", "submittedByRole",
    "submittedByPrincipalRef", "submittedAt", "reasonCodes"
  ],
  "review": [
    "schemaVersion", "reviewId", "candidateId", "candidateDigest",
    "reviewAction", "reviewerRole", "reviewerPrincipalRef", "reviewedAt",
    "reviewValidUntil", "reasonCodes", "auditEventId"
  ],
  "record": [
    "schemaVersion", "evidenceRecordId", "candidateId", "reviewId",
    "supplierAssessmentId", "evidenceFamily", "sourceReference",
    "sourceVersion", "contentDigest", "observedAt", "validUntil",
    "recordState", "approvedByRole", "approvedAt", "retentionClass",
    "policyRef", "legalHoldState", "deletionState", "auditEventIds"
  ]
}
```

Use these exact enums:

```text
authenticityState: verified | failed | unknown
redactionState: passed | failed
sourceType: synthetic-manifest
candidate validationState: validated
candidate candidateState: pending-review
reviewAction: approved | rejected | changes-requested
review reasonCode: evidence-reviewed | human-rejected | changes-requested
recordState: current | superseded | expired | revoked
revocationReasonCode: source-revoked | source-material-change |
                      digest-conflict | authenticity-failed |
                      validity-boundary-reached
legalHoldState: not-held | held
deletionState: retained | deletion-pending | deleted
```

Define `contentDigest` as `^sha256:[a-f0-9]{64}$`, principal references as
generic identifiers matching `^[a-z0-9][a-z0-9:-]{2,120}$`, and every object as
closed. Model approved/rejected/changes-requested and current/revoked optional
fields with `oneOf` branches so state-incompatible fields fail validation.

- [ ] **Step 5: Create exact synthetic fixtures**

Use only `https://example.com/` URIs and generic identifiers. The positive path
must preserve the same IDs through all four files:

```text
assessmentId: synthetic-managed-ai-service
family: security-privacy
sourceReference: https://example.com/supplier-evidence/security-privacy-v1
sourceVersion: v1
contentDigest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
adapterId: synthetic-manifest
adapterVersion: 1.0.0
observedAt: 2026-09-01T00:00:00.000Z
validUntil: 2026-12-01T00:00:00.000Z
submittedAt: 2026-09-05T00:10:00.000Z
reviewedAt: 2026-09-05T00:20:00.000Z
reviewValidUntil: 2026-10-05T00:20:00.000Z
approvedAt: 2026-09-05T00:20:00.000Z
candidateId: candidate-17878d4c5d338b8b
reviewId: review-c40a78f1d963d84e
recordId: evidence-febe039f9cda91c2
approval audit event: audit-df28f34cc3771575
revokedAt: 2026-09-06T00:00:00.000Z
revoked recordId: evidence-d3b5b95c4f43fc45
revocation audit event: audit-02cee5e3a06e5e68
retentionClass: synthetic-90-day
policyRef: https://example.com/policies/synthetic-evidence-retention-v1
legalHoldState: not-held
deletionState: retained
submitter principal: principal:evidence-submitter
reviewer principal: principal:evidence-reviewer
approver principal: principal:evidence-approver
```

Use fixed UTC timestamps and a literal synthetic SHA-256-shaped digest. The
revoked record must reference the current record through
`supersedesEvidenceRecordId`, include a bounded `revocationReasonCode`, and use
a new audit event ID.

- [ ] **Step 6: Run tests and verify GREEN**

Run the complete API test command. Expected: all existing tests plus the new
contract tests pass with zero failures.

- [ ] **Step 7: Commit the contract slice**

```bash
git add shared/schemas/ai-supplier-evidence \
  shared/examples/ai-supplier-evidence \
  providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts \
  providers/aws/app/api/tests/supplierEvidenceContracts.test.ts
git commit -m "feat: add supplier evidence intake contracts"
```

---

### Task 2: Implement deterministic manifest intake and candidate identity

**Files:**

- Create: `providers/aws/app/api/src/governance/supplierEvidenceTypes.ts`
- Create: `providers/aws/app/api/src/governance/supplierEvidenceAdapter.ts`
- Create: `providers/aws/app/api/tests/supplierEvidenceAdapter.test.ts`

**Interfaces:**

- Consumes: Task 1 manifest/candidate fields and
  `SupplierEvidenceFamilyName`.
- Produces:

```ts
adaptSyntheticEvidenceManifest(value: unknown): EvidenceIntakeResult
candidateIdentity(input: CandidateIdentityInput): string
```

- [ ] **Step 1: Define exact types and result union**

Create `supplierEvidenceTypes.ts` with the schema-aligned interfaces and:

```ts
export type EvidenceIntakeReasonCode =
  | "manifest-schema-invalid"
  | "authenticity-failed"
  | "authenticity-unknown"
  | "redaction-failed"
  | "time-boundary-invalid";

export type EvidenceIntakeResult =
  | { outcome: "accepted"; candidate: EvidenceCandidate }
  | { outcome: "rejected"; reasonCodes: [EvidenceIntakeReasonCode] };

export type EvidenceReviewReasonCode =
  | "evidence-reviewed"
  | "candidate-not-reviewable"
  | "candidate-digest-mismatch"
  | "review-expired"
  | "candidate-state-invalid"
  | "segregation-of-duties-violation"
  | "exception-boundary-incomplete"
  | "human-rejected"
  | "changes-requested"
  | "approval-not-committed"
  | "evidence-record-not-current"
  | "revocation-not-authorized"
  | "expiry-boundary-invalid";

export type SupplierEvidenceProjectionReasonCode =
  | "projection-time-invalid"
  | "evidence-record-missing"
  | "evidence-record-conflict"
  | "evidence-record-reference-mismatch"
  | "evidence-record-chain-invalid"
  | "evidence-record-stale"
  | "evidence-record-expired"
  | "evidence-record-revoked";

export interface CandidateIdentityInput {
  sourceReference: string;
  sourceVersion: string;
  contentDigest: string;
  adapterVersion: string;
}

export interface SupplierEvidenceTelemetryEvent {
  eventName:
    | "supplier-evidence-intake"
    | "supplier-evidence-review"
    | "supplier-evidence-published"
    | "supplier-evidence-reassessment"
    | "supplier-evidence-revoked"
    | "supplier-evidence-export";
  outcome: "succeeded" | "failed";
  reasonCode:
    | EvidenceIntakeReasonCode
    | EvidenceReviewReasonCode
    | SupplierEvidenceProjectionReasonCode
    | "evidence-published"
    | "evidence-reassessment-requested"
    | "evidence-revoked"
    | "telemetry-export-succeeded"
    | "telemetry-export-failed";
  candidateId: string;
  reviewId?: string;
  evidenceRecordId?: string;
  supplierAssessmentId: string;
  telemetryGap: boolean;
}

export interface EvidenceAuditEvent {
  auditEventId: string;
  eventName: "approval-committed" | "revocation-committed" | "expiry-committed";
  candidateId: string;
  evidenceRecordId: string;
  actorRole: string;
  actorPrincipalRef: string;
  occurredAt: string;
}
```

Use literal unions for every state and reuse
`SupplierEvidenceFamilyName`. Do not add `any` fields or raw-content fields.

- [ ] **Step 2: Write failing adapter behavior tests**

Cover these exact cases:

```ts
test("identical canonical manifests return the same candidate", () => {
  assert.deepEqual(
    adaptSyntheticEvidenceManifest(structuredClone(manifest)),
    adaptSyntheticEvidenceManifest(structuredClone(manifest))
  );
});

test("a changed source version produces a different candidate identity", () => {
  const first = accepted(manifest);
  const second = accepted({ ...manifest, sourceVersion: "v2" });
  assert.notEqual(first.candidateId, second.candidateId);
});
```

Also assert fail-closed precedence for malformed shape, failed authenticity,
unknown authenticity, failed redaction, invalid timestamp, `validUntil` before
`observedAt`, and `submittedAt` before `observedAt`. Assert that rejected
results contain no copied source URI, digest, parser message, or thrown error.

- [ ] **Step 3: Run tests and verify RED**

Run the full API suite. Expected: compilation failure because the types and
adapter do not exist.

- [ ] **Step 4: Implement canonical identity**

Use Node `crypto` and no wall clock:

```ts
export function deterministicIdentity(prefix: string, values: string[]): string {
  const canonical = values
    .map((value) => `${value.length}:${value}`)
    .join("|");
  return `${prefix}-${createHash("sha256").update(canonical).digest("hex").slice(0, 16)}`;
}

export function candidateIdentity(input: CandidateIdentityInput): string {
  return deterministicIdentity("candidate", [
    input.sourceReference,
    input.sourceVersion,
    input.contentDigest,
    input.adapterVersion
  ]);
}
```

Length-prefix every canonical value so delimiter characters cannot create an
ambiguous tuple. Candidate identity must not include `submittedAt`. Export the
generic helper because Task 3 uses the same canonicalization rule for review,
record, and audit identities.

- [ ] **Step 5: Implement strict intake precedence**

`adaptSyntheticEvidenceManifest` accepts `unknown`, rejects arrays/null,
requires the exact manifest key set, validates all enums and string patterns,
then applies:

```text
schema/time invalid -> manifest-schema-invalid or time-boundary-invalid
authenticity failed -> authenticity-failed
authenticity unknown -> authenticity-unknown
redaction failed -> redaction-failed
otherwise -> immutable pending-review EvidenceCandidate
```

Copy only allowed fields, set `validationState: "validated"`,
`candidateState: "pending-review"`, and `reasonCodes: []`. Freeze the returned
candidate and its reason-code array so callers cannot mutate the authoritative
in-memory object.

- [ ] **Step 6: Run focused and complete tests**

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
```

Expected: adapter tests and complete suite pass.

- [ ] **Step 7: Commit the adapter slice**

```bash
git add providers/aws/app/api/src/governance/supplierEvidenceTypes.ts \
  providers/aws/app/api/src/governance/supplierEvidenceAdapter.ts \
  providers/aws/app/api/tests/supplierEvidenceAdapter.test.ts
git commit -m "feat: add deterministic supplier evidence adapter"
```

---

### Task 3: Implement digest-bound human review and atomic registry publication

**Files:**

- Create: `providers/aws/app/api/src/governance/supplierEvidenceWorkflow.ts`
- Create: `providers/aws/app/api/tests/supplierEvidenceWorkflow.test.ts`

**Interfaces:**

- Consumes: `EvidenceCandidate`, `HumanReviewRecord`, and
  `VersionedEvidenceRecord` from Task 2.
- Produces:

```ts
reviewEvidenceCandidate(
  input: EvidenceReviewInput,
  store: EvidenceWorkflowStore
): EvidenceReviewResult

revokeEvidenceRecord(
  input: EvidenceRevocationInput,
  store: EvidenceWorkflowStore
): EvidenceRevocationResult

expireEvidenceRecord(
  input: EvidenceExpiryInput,
  store: EvidenceWorkflowStore
): EvidenceRecordTransitionResult

createInMemoryEvidenceWorkflowStore(
  failure?: "audit-write" | "registry-write" | "telemetry-export"
): EvidenceWorkflowStore
```

- [ ] **Step 1: Write failing state and authority tests**

Test the exact matrix:

```text
approved + different submitter/reviewer/approver -> current record
submitter == approver -> segregation-of-duties-violation
candidate digest mismatch -> candidate-digest-mismatch
review after reviewValidUntil -> review-expired
candidate not pending-review -> candidate-state-invalid
conditional without owner/expiry/controls -> exception-boundary-incomplete
revoked/failed/unknown candidate -> candidate-not-reviewable
audit failure -> approval-not-committed
registry failure -> approval-not-committed
same retry -> same review and record identity, no duplicate current record
revocation -> new audit event and revoked version, never in-place restoration
```

Use fixed timestamps in every call. Assert that review and record IDs are
deterministic from candidate ID, digest, action, and explicit review time.

- [ ] **Step 2: Run tests and verify RED**

Run the complete API suite. Expected: module-not-found or missing-export
failure.

- [ ] **Step 3: Define workflow ports and bounded outcomes**

Use these exact input and result types:

```ts
interface EvidenceReviewInputCommon {
  candidate: EvidenceCandidate;
  candidateDigest: string;
  reviewerRole: string;
  reviewerPrincipalRef: string;
  reviewedAt: string;
  reviewValidUntil: string;
}

export type EvidenceReviewInput = EvidenceReviewInputCommon &
  (
    | {
        action: "approved";
        approverRole: string;
        approverPrincipalRef: string;
        retentionClass: string;
        policyRef: string;
        exceptionBoundary?: HumanReviewRecord["exceptionBoundary"];
      }
    | { action: "rejected" | "changes-requested" }
  );

export interface EvidenceRevocationInput {
  evidenceRecordId: string;
  revocationOwnerRole: string;
  revocationOwnerPrincipalRef: string;
  revokedAt: string;
  reasonCode:
    | "source-revoked"
    | "source-material-change"
    | "digest-conflict"
    | "authenticity-failed";
}

export interface EvidenceExpiryInput {
  evidenceRecordId: string;
  expiredAt: string;
  reasonCode: "validity-boundary-reached";
}

export type EvidenceReviewResult =
  | { outcome: "approved"; review: HumanReviewRecord; record: VersionedEvidenceRecord; telemetryGap: boolean }
  | { outcome: "recorded"; review: HumanReviewRecord; telemetryGap: boolean }
  | { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] };

export type EvidenceRevocationResult =
  | { outcome: "revoked"; record: VersionedEvidenceRecord; telemetryGap: boolean }
  | { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] };

export type EvidenceRecordTransitionResult =
  | { outcome: "expired"; record: VersionedEvidenceRecord }
  | { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] };
```

Use this store interface:

```ts
export interface EvidenceWorkflowStore {
  appendReview(review: HumanReviewRecord): void;
  commitApproval(input: {
    review: HumanReviewRecord;
    auditEvent: EvidenceAuditEvent;
    record: VersionedEvidenceRecord;
  }): void;
  commitRevocation(input: {
    auditEvent: EvidenceAuditEvent;
    record: VersionedEvidenceRecord;
  }): void;
  findRecord(evidenceRecordId: string): VersionedEvidenceRecord | undefined;
  listRecords(
    supplierAssessmentId: string,
    evidenceFamily: SupplierEvidenceFamilyName
  ): VersionedEvidenceRecord[];
  exportTelemetry(event: SupplierEvidenceTelemetryEvent): void;
}

```

`commitApproval` and `commitRevocation` are the local atomic unit-of-work
boundary: a simulated audit or registry failure must leave no current record.
Telemetry export runs after commit; failure sets `telemetryGap: true` and does
not roll back the authoritative result.

Generate identities with Task 2's helper:

```ts
const reviewId = deterministicIdentity("review", [
  candidate.candidateId,
  candidate.contentDigest,
  input.action,
  input.reviewedAt
]);
const evidenceRecordId = deterministicIdentity("evidence", [
  candidate.candidateId,
  reviewId,
  "current"
]);
const auditEventId = deterministicIdentity("audit", [
  reviewId,
  "approval-committed"
]);
```

Before creating a current record, identify the head of the existing immutable
record chain for the same assessment and family. When a prior current head
exists, set the new record's `supersedesEvidenceRecordId` to that head. A record
referenced by a later chain member is historical and is not a current head,
even though its immutable snapshot retains the state recorded when it was
created.

- [ ] **Step 4: Implement review precedence and immutable publication**

Apply this order exactly:

```text
candidate integrity and state
-> candidate/digest binding
-> time and review expiry
-> submitter/reviewer/approver principal separation
-> conditional exception boundary
-> append rejected/changes-requested review only, or atomically commit approval
-> attempt sanitized telemetry export
```

Reject and changes-requested actions return `outcome: "recorded"` and create a
review record but no evidence record. Invalid actions return
`outcome: "denied"`. Approval creates `recordState: "current"`. Never expose
current state before `commitApproval` returns successfully.

- [ ] **Step 5: Implement revocation as a new version**

Require the exact current-head record ID, revocation-owner role, explicit time,
and bounded reason code. Create a new record with `recordState: "revoked"`,
`supersedesEvidenceRecordId` pointing to the prior head, and a new audit event.
A revoked record cannot be restored; replacement begins with a new candidate.

Use:

```ts
const revokedRecordId = deterministicIdentity("evidence", [
  currentHead.evidenceRecordId,
  input.revokedAt,
  "revoked"
]);
const revocationAuditEventId = deterministicIdentity("audit", [
  revokedRecordId,
  "revocation-committed"
]);
```

Add the separate function:

```ts
expireEvidenceRecord(
  input: {
    evidenceRecordId: string;
    expiredAt: string;
    reasonCode: "validity-boundary-reached";
  },
  store: EvidenceWorkflowStore
): EvidenceRecordTransitionResult
```

It creates an immutable `expired` head pointing to the previous current head.
It does not extend `validUntil` or publish a replacement approval.

- [ ] **Step 6: Run focused and complete tests**

Run the full API suite and expect zero failures.

- [ ] **Step 7: Commit the workflow slice**

```bash
git add providers/aws/app/api/src/governance/supplierEvidenceWorkflow.ts \
  providers/aws/app/api/tests/supplierEvidenceWorkflow.test.ts
git commit -m "feat: add human-owned supplier evidence workflow"
```

---

### Task 4: Project current evidence and replay YY-63/YY-64 decisions

**Files:**

- Create: `providers/aws/app/api/src/governance/supplierEvidenceProjection.ts`
- Create: `providers/aws/app/api/tests/supplierEvidenceProjection.test.ts`

**Interfaces:**

- Consumes: approved evidence records, the existing `SupplierAssessment` type,
  `evaluateSupplierReadiness`, and `evaluateWorkloadSupplierAdmission`.
- Produces:

```ts
projectSupplierAssessment(input: {
  template: SupplierAssessmentTemplate;
  evidenceRecords: VersionedEvidenceRecord[];
  evaluatedAt: string;
}): SupplierAssessmentProjectionResult
```

- [ ] **Step 1: Define the human-owned assessment template**

The template contains all fields the adapter cannot infer:

```ts
export type SupplierEvidenceFamilyTemplate =
  | {
      family: SupplierEvidenceFamilyName;
      applicability: "applicable";
      status: "complete" | "conditional" | "missing";
      critical: boolean;
      summary: string;
      remediation?: SupplierEvidenceFamily["remediation"];
    }
  | {
      family: SupplierEvidenceFamilyName;
      applicability: "not-applicable";
      status: "not-applicable";
      critical: boolean;
      summary: string;
      observedAt: string;
      validUntil: string;
    };

export interface SupplierAssessmentTemplate {
  schemaVersion: "1.0";
  assessmentId: string;
  supplierClass: SupplierAssessment["supplierClass"];
  scope: string;
  assessedAt: string;
  reviewBy: string;
  evidenceFamilies: SupplierEvidenceFamilyTemplate[];
  externalRequirements: SupplierAssessment["externalRequirements"];
  reassessmentTriggers: SupplierAssessment["reassessmentTriggers"];
}

export type SupplierAssessmentProjectionResult =
  | { outcome: "projected"; assessment: SupplierAssessment }
  | { outcome: "denied"; reasonCodes: [SupplierEvidenceProjectionReasonCode] };
```

Do not add a readiness or admission field to this template.

- [ ] **Step 2: Write failing projection and end-to-end tests**

Cover:

```text
exactly one current approved record for every applicable family -> projection
new current head supersedes its referenced predecessor -> projection uses head
missing current family -> evidence-record-missing
two current records for one family -> evidence-record-conflict
assessment ID mismatch -> evidence-record-reference-mismatch
record stale at explicit evaluatedAt -> evidence-record-stale
record revoked -> evidence-record-revoked
invalid evaluatedAt -> projection-time-invalid
not-applicable family -> no evidence record required
```

The positive test must call the real evaluators:

```ts
const projection = projectSupplierAssessment({ template, evidenceRecords, evaluatedAt });
assert.equal(projection.outcome, "projected");
const supplierDecision = evaluateSupplierReadiness(projection.assessment, evaluatedAt);
const admission = evaluateWorkloadSupplierAdmission({
  workloadProfile,
  supplierAssessment: projection.assessment,
  recordedSupplierDecision: supplierDecision,
  evaluatedAt
});
assert.equal(admission.decision, "admitted");
```

Add a revocation test that produces `not-eligible`/`denied` through the same
real functions. Do not mock either evaluator.

- [ ] **Step 3: Run tests and verify RED**

Run the complete API suite. Expected: missing projection module or export.

- [ ] **Step 4: Implement deterministic selection and projection**

Parse only the caller-supplied `evaluatedAt`. For every applicable family:

1. select records matching assessment ID and family;
2. build immutable chains from `supersedesEvidenceRecordId` and reject cycles,
   missing predecessors, or multiple heads;
3. give a revoked or expired head fail-closed precedence;
4. reject conflicting current heads;
5. reject an absent current head;
6. reject a current head when `evaluatedAt > validUntil`; and
7. copy `observedAt`, `validUntil`, `recordState` as `evidenceState`, and the
   controlled `sourceReference` into the final evidence-reference set.

Copy applicability, status, criticality, summary, remediation,
external requirements, and reassessment triggers only from the human-owned
template. For a not-applicable family, copy its human-owned `observedAt` and
`validUntil` and set `evidenceState: "current"`; no evidence record is
required. Return a bounded result union; do not throw source data in errors.

- [ ] **Step 5: Run focused and complete tests**

Run the full API suite and expect all contract, evaluator, admission, and
projection tests to pass.

- [ ] **Step 6: Commit the projection slice**

```bash
git add providers/aws/app/api/src/governance/supplierEvidenceProjection.ts \
  providers/aws/app/api/tests/supplierEvidenceProjection.test.ts
git commit -m "feat: project reviewed evidence into supplier admission"
```

---

### Task 5: Add metadata-safe telemetry and public evidence correlation

**Files:**

- Create: `providers/aws/app/api/src/governance/supplierEvidenceTelemetry.ts`
- Create: `providers/aws/app/api/tests/supplierEvidenceTelemetry.test.ts`
- Modify: `providers/aws/app/api/src/governance/supplierEvidenceWorkflow.ts`
- Modify: `docs/evidence/control-plane-evidence-map.md`
- Modify: `shared/schemas/control-plane-evidence/evidence-map.schema.json`
- Modify: `shared/examples/control-plane-evidence/evidence-map.mock.json`
- Modify: `providers/aws/app/api/tests/controlPlaneEvidenceContracts.test.ts`

**Interfaces:**

- Consumes: candidate, review, record, assessment, supplier-decision, and
  admission identifiers from Tasks 1–4.
- Produces:

```ts
buildSupplierEvidenceTelemetryEvent(input: SupplierEvidenceTelemetryInput):
  SupplierEvidenceTelemetryEvent
```

and a required metadata-only `supplierEvidenceCorrelation` object in the
control-plane evidence map.

- [ ] **Step 1: Write failing telemetry safety tests**

Define the builder input without accepting arbitrary fields:

```ts
export type SupplierEvidenceTelemetryInput =
  Omit<SupplierEvidenceTelemetryEvent, "telemetryGap"> & {
    telemetryGap?: boolean;
  };
```

Require exactly these output fields:

```text
eventName
outcome
reasonCode
candidateId
reviewId (optional)
evidenceRecordId (optional)
supplierAssessmentId
durationMs (optional)
telemetryGap
```

Reject unknown event names and reason codes. Assert serialized output contains
none of:

```text
sourceReference, contentDigest, principalRef, personalName, rawEvidence,
documentContent, prompt, credential, signature, parserStack
```

- [ ] **Step 2: Run tests and verify RED**

Run the complete API suite. Expected: missing telemetry module and missing
evidence-map correlation.

- [ ] **Step 3: Implement bounded telemetry events**

Support these event names only:

```ts
type SupplierEvidenceEventName =
  | "supplier-evidence-intake"
  | "supplier-evidence-review"
  | "supplier-evidence-published"
  | "supplier-evidence-reassessment"
  | "supplier-evidence-revoked"
  | "supplier-evidence-export";
```

Build a new object from the allowlist; never spread caller input. Do not include
digests, source URIs, opaque principals, error messages, or parser diagnostics.
Update `supplierEvidenceWorkflow.ts` to call this builder rather than
constructing telemetry directly; the Task 3 output shape remains unchanged.

- [ ] **Step 4: Add evidence-map correlation**

Add this closed required object:

```text
candidateId
reviewId
evidenceRecordId
supplierAssessmentId
supplierDecisionId
admissionDecisionId
evidencePaths[]
```

Every path must remain under `shared/examples/` and reference synthetic files.
Update the contract test to verify exact ID correlation across the stored
candidate, review, record, supplier decision, and admission fixture.

- [ ] **Step 5: Run focused and complete tests**

Run the full API suite. Expected: metadata-safety, evidence-map, Markdown-link,
and all existing tests pass.

- [ ] **Step 6: Commit the telemetry/evidence slice**

```bash
git add providers/aws/app/api/src/governance/supplierEvidenceTelemetry.ts \
  providers/aws/app/api/tests/supplierEvidenceTelemetry.test.ts \
  providers/aws/app/api/src/governance/supplierEvidenceWorkflow.ts \
  docs/evidence/control-plane-evidence-map.md \
  shared/schemas/control-plane-evidence/evidence-map.schema.json \
  shared/examples/control-plane-evidence/evidence-map.mock.json \
  providers/aws/app/api/tests/controlPlaneEvidenceContracts.test.ts
git commit -m "feat: correlate supplier evidence workflow telemetry"
```

---

### Task 6: Update status documentation and run final repository verification

**Files:**

- Modify: `docs/practices/ai-supplier-readiness-gate.md`
- Modify: `docs/practices/ai-workload-operating-contract.md`
- Modify: `docs/practices/current-status.md`
- Modify: `README.md`
- Create privately, never stage:
  `_private/docs/notes/yy-65-human-owned-supplier-evidence-implementation-2026-09-05.md`

**Interfaces:**

- Consumes: verified repository artifacts and test results from Tasks 1–5.
- Produces: accurate navigation, status boundaries, implementation evidence,
  private RED/GREEN record, and a reviewable branch.

- [ ] **Step 1: Write failing documentation assertions**

Extend `supplierEvidenceContracts.test.ts` to require public documentation to
contain all of these phrases:

```text
local, deterministic, metadata-only
human-owned review
exact digest
synthetic manifest adapter
no supplier or procurement-system connection
does not grant runtime authority
```

Require direct links to the new schema, fixture, adapter, workflow, projection,
telemetry, and design files.

- [ ] **Step 2: Run tests and verify RED**

Run the complete API suite. Expected: documentation assertion failure.

- [ ] **Step 3: Update public documentation with exact status boundaries**

Describe the result as:

> Local/source-implemented with synthetic metadata: deterministic manifest
> intake, digest-bound human review, immutable evidence records,
> fail-closed lifecycle, sanitized telemetry, and replay into the existing
> supplier-readiness and workload-admission evaluators.

State explicitly that no real supplier, document, procurement, assurance,
identity, cloud, Kubernetes, GPU, or runtime system is connected. Do not call
the implementation production-ready or compliance-certified.

- [ ] **Step 4: Record the private implementation process**

Write the task-by-task RED/GREEN results, defects found, exact test totals,
commit IDs, and any recovery decisions in the private note. Verify it remains
ignored:

```bash
git check-ignore -v _private/docs/notes/yy-65-human-owned-supplier-evidence-implementation-2026-09-05.md
```

- [ ] **Step 5: Run final validation**

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api test
bash scripts/validate-argocd-gitops.sh
git diff --check
```

Expected: complete API suite passes, Argo CD contract passes, and diff hygiene
reports no error. Record the exact final test total rather than assuming it is
still 230.

- [ ] **Step 6: Review boundaries and changed files**

```bash
git status --short
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
```

Confirm `_private/`, `node_modules/`, `.pnpm-store/`, raw evidence, personal
names, credentials, and generated build output are absent from the diff.

- [ ] **Step 7: Commit the documentation slice**

```bash
git add README.md \
  docs/practices/ai-supplier-readiness-gate.md \
  docs/practices/ai-workload-operating-contract.md \
  docs/practices/current-status.md \
  providers/aws/app/api/tests/supplierEvidenceContracts.test.ts
git commit -m "docs: publish supplier evidence workflow evidence"
```

- [ ] **Step 8: Push and open a pull request without merging**

```bash
git push -u origin docs/yy-65-human-owned-evidence-workflow
gh pr create \
  --base main \
  --head docs/yy-65-human-owned-evidence-workflow \
  --title "YY-65: add human-owned supplier evidence workflow" \
  --body "Implements the approved local synthetic YY-65 evidence adapter, human-review, immutable registry, deterministic projection, telemetry, and documentation boundaries. No real supplier connection or runtime authority."
```

Wait for all required checks and review the final PR diff. Do not merge without
the user's separate explicit merge approval.
