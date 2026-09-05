import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createInMemoryEvidenceWorkflowStore,
  expireEvidenceRecord,
  reviewEvidenceCandidate,
  revokeEvidenceRecord,
  type EvidenceReviewInput
} from "../src/governance/supplierEvidenceWorkflow.js";
import type {
  EvidenceCandidate,
  HumanReviewRecord,
  VersionedEvidenceRecord
} from "../src/governance/supplierEvidenceTypes.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-supplier-evidence");
const CANDIDATE = readFixture<EvidenceCandidate>("managed-service.candidate.json");
const EXPECTED_REVIEW = readFixture<HumanReviewRecord>("managed-service.review.json");
const EXPECTED_RECORD = readFixture<VersionedEvidenceRecord>("managed-service.record.json");
const EXPECTED_REVOKED = readFixture<VersionedEvidenceRecord>("revoked.record.json");

const APPROVAL: EvidenceReviewInput = {
  candidate: CANDIDATE,
  candidateDigest: CANDIDATE.contentDigest,
  reviewerRole: "evidence-reviewer",
  reviewerPrincipalRef: "principal:evidence-reviewer",
  reviewedAt: "2026-09-05T00:20:00.000Z",
  reviewValidUntil: "2026-10-05T00:20:00.000Z",
  action: "approved",
  approverRole: "evidence-approver",
  approverPrincipalRef: "principal:evidence-approver",
  retentionClass: "synthetic-90-day",
  policyRef: "https://example.com/policies/synthetic-evidence-retention-v1"
};

test("approved evidence creates the documented review and current record atomically", () => {
  const store = createInMemoryEvidenceWorkflowStore();

  const result = reviewEvidenceCandidate(APPROVAL, store);

  assert.deepEqual(result, {
    outcome: "approved",
    review: EXPECTED_REVIEW,
    record: EXPECTED_RECORD,
    telemetryGap: false
  });
  assert.deepEqual(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily), [EXPECTED_RECORD]);
});

test("approval enforces candidate binding, state, and review boundaries in precedence order", () => {
  const cases: Array<[EvidenceReviewInput, string]> = [
    [{ ...APPROVAL, candidateDigest: `sha256:${"b".repeat(64)}` }, "candidate-digest-mismatch"],
    [{ ...APPROVAL, reviewedAt: "2026-10-05T00:20:00.001Z" }, "review-expired"],
    [
      {
        ...APPROVAL,
        candidate: { ...CANDIDATE, candidateState: "reviewed" } as unknown as EvidenceCandidate
      },
      "candidate-state-invalid"
    ],
    [
      {
        ...APPROVAL,
        candidate: { ...CANDIDATE, authenticityState: "failed" } as unknown as EvidenceCandidate
      },
      "candidate-not-reviewable"
    ]
  ];

  for (const [input, reasonCode] of cases) {
    const store = createInMemoryEvidenceWorkflowStore();
    assert.deepEqual(reviewEvidenceCandidate(input, store), { outcome: "denied", reasonCodes: [reasonCode] });
    assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 0);
  }
});

test("submitter, reviewer, and approver principal references remain separated", () => {
  for (const input of [
    { ...APPROVAL, reviewerPrincipalRef: CANDIDATE.submittedByPrincipalRef },
    { ...APPROVAL, approverPrincipalRef: CANDIDATE.submittedByPrincipalRef },
    { ...APPROVAL, approverPrincipalRef: APPROVAL.reviewerPrincipalRef }
  ]) {
    assert.deepEqual(reviewEvidenceCandidate(input, createInMemoryEvidenceWorkflowStore()), {
      outcome: "denied",
      reasonCodes: ["segregation-of-duties-violation"]
    });
  }
});

test("an incomplete conditional exception boundary cannot authorize publication", () => {
  const input = {
    ...APPROVAL,
    exceptionBoundary: {
      exceptionOwnerRole: "",
      validUntil: "2026-09-30T00:00:00.000Z",
      compensatingControls: [],
      acceptedEvidenceFamilies: []
    }
  } as EvidenceReviewInput;

  assert.deepEqual(reviewEvidenceCandidate(input, createInMemoryEvidenceWorkflowStore()), {
    outcome: "denied",
    reasonCodes: ["exception-boundary-incomplete"]
  });
});

test("rejected and changes-requested reviews are recorded without publishing evidence", () => {
  for (const action of ["rejected", "changes-requested"] as const) {
    const store = createInMemoryEvidenceWorkflowStore();
    const result = reviewEvidenceCandidate(
      {
        candidate: CANDIDATE,
        candidateDigest: CANDIDATE.contentDigest,
        reviewerRole: "evidence-reviewer",
        reviewerPrincipalRef: "principal:evidence-reviewer",
        reviewedAt: "2026-09-05T00:20:00.000Z",
        reviewValidUntil: "2026-10-05T00:20:00.000Z",
        action
      },
      store
    );

    assert.equal(result.outcome, "recorded");
    if (result.outcome !== "recorded") assert.fail("expected a recorded review");
    assert.equal(result.review.reviewAction, action);
    assert.deepEqual(result.review.reasonCodes, [action === "rejected" ? "human-rejected" : "changes-requested"]);
    assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 0);
  }
});

test("audit or registry failure leaves no current record", () => {
  for (const failure of ["audit-write", "registry-write"] as const) {
    const store = createInMemoryEvidenceWorkflowStore(failure);
    assert.deepEqual(reviewEvidenceCandidate(APPROVAL, store), {
      outcome: "denied",
      reasonCodes: ["approval-not-committed"]
    });
    assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 0);
  }
});

test("an identical approval retry is idempotent", () => {
  const store = createInMemoryEvidenceWorkflowStore();

  const first = reviewEvidenceCandidate(APPROVAL, store);
  const second = reviewEvidenceCandidate(APPROVAL, store);

  assert.deepEqual(second, first);
  assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 1);
});

test("telemetry export failure records a gap without rolling back approval", () => {
  const store = createInMemoryEvidenceWorkflowStore("telemetry-export");

  const result = reviewEvidenceCandidate(APPROVAL, store);

  assert.equal(result.outcome, "approved");
  if (result.outcome !== "approved") assert.fail("expected approval to remain authoritative");
  assert.equal(result.telemetryGap, true);
  assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 1);
});

test("revocation appends the documented revoked head and cannot be replayed in place", () => {
  const store = createInMemoryEvidenceWorkflowStore();
  const approval = reviewEvidenceCandidate(APPROVAL, store);
  if (approval.outcome !== "approved") assert.fail("approval fixture must publish");

  const revoked = revokeEvidenceRecord(
    {
      evidenceRecordId: approval.record.evidenceRecordId,
      revocationOwnerRole: "evidence-approver",
      revocationOwnerPrincipalRef: "principal:evidence-approver",
      revokedAt: "2026-09-06T00:00:00.000Z",
      reasonCode: "source-revoked"
    },
    store
  );

  assert.deepEqual(revoked, { outcome: "revoked", record: EXPECTED_REVOKED, telemetryGap: false });
  assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 2);
  assert.deepEqual(
    revokeEvidenceRecord(
      {
        evidenceRecordId: approval.record.evidenceRecordId,
        revocationOwnerRole: "evidence-approver",
        revocationOwnerPrincipalRef: "principal:evidence-approver",
        revokedAt: "2026-09-06T01:00:00.000Z",
        reasonCode: "source-revoked"
      },
      store
    ),
    { outcome: "denied", reasonCodes: ["evidence-record-not-current"] }
  );
});

test("revocation requires an explicit authorized owner", () => {
  const store = createInMemoryEvidenceWorkflowStore();
  const approval = reviewEvidenceCandidate(APPROVAL, store);
  if (approval.outcome !== "approved") assert.fail("approval fixture must publish");

  assert.deepEqual(
    revokeEvidenceRecord(
      {
        evidenceRecordId: approval.record.evidenceRecordId,
        revocationOwnerRole: "",
        revocationOwnerPrincipalRef: "",
        revokedAt: "2026-09-06T00:00:00.000Z",
        reasonCode: "source-revoked"
      },
      store
    ),
    { outcome: "denied", reasonCodes: ["revocation-not-authorized"] }
  );
});

test("expiry appends an immutable expired head only at the validity boundary", () => {
  const store = createInMemoryEvidenceWorkflowStore();
  const approval = reviewEvidenceCandidate(APPROVAL, store);
  if (approval.outcome !== "approved") assert.fail("approval fixture must publish");

  assert.deepEqual(
    expireEvidenceRecord(
      {
        evidenceRecordId: approval.record.evidenceRecordId,
        expiredAt: "2026-11-30T23:59:59.000Z",
        reasonCode: "validity-boundary-reached"
      },
      store
    ),
    { outcome: "denied", reasonCodes: ["expiry-boundary-invalid"] }
  );

  const result = expireEvidenceRecord(
    {
      evidenceRecordId: approval.record.evidenceRecordId,
      expiredAt: "2026-12-01T00:00:00.000Z",
      reasonCode: "validity-boundary-reached"
    },
    store
  );
  assert.equal(result.outcome, "expired");
  if (result.outcome !== "expired") assert.fail("expected immutable expiry record");
  assert.equal(result.record.recordState, "expired");
  assert.equal(result.record.supersedesEvidenceRecordId, approval.record.evidenceRecordId);
  assert.equal(store.listRecords(CANDIDATE.supplierAssessmentId, CANDIDATE.evidenceFamily).length, 2);
});

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(EXAMPLE_DIR, fileName), "utf8")) as T;
}
