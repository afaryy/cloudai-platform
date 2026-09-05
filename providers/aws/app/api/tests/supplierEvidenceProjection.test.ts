import test from "node:test";
import assert from "node:assert/strict";
import {
  projectSupplierAssessment,
  type SupplierAssessmentTemplate
} from "../src/governance/supplierEvidenceProjection.js";
import {
  evaluateSupplierReadiness,
  SUPPLIER_EVIDENCE_FAMILIES,
  type SupplierAssessment,
  type SupplierEvidenceFamilyName
} from "../src/governance/supplierReadinessEvaluator.js";
import {
  evaluateWorkloadSupplierAdmission,
  type SupplierAwareWorkloadProfile
} from "../src/governance/supplierWorkloadAdmissionEvaluator.js";
import type { VersionedEvidenceRecord } from "../src/governance/supplierEvidenceTypes.js";

const EVALUATED_AT = "2026-09-05T01:00:00.000Z";
const APPLICABLE_FAMILIES = SUPPLIER_EVIDENCE_FAMILIES.filter(
  (family) => family !== "sustainability-location"
);

const TEMPLATE: SupplierAssessmentTemplate = {
  schemaVersion: "1.0",
  assessmentId: "synthetic-managed-ai-service",
  supplierClass: "managed-ai-service",
  scope: "Synthetic managed model and retrieval service boundary",
  assessedAt: "2026-09-05T00:00:00.000Z",
  reviewBy: "2026-11-30T00:00:00.000Z",
  evidenceFamilies: SUPPLIER_EVIDENCE_FAMILIES.map((family) =>
    family === "sustainability-location"
      ? {
          family,
          applicability: "not-applicable" as const,
          status: "not-applicable" as const,
          critical: false,
          summary: "No dedicated physical capacity is in scope for this synthetic assessment.",
          observedAt: "2026-09-01T00:00:00.000Z",
          validUntil: "2026-12-01T00:00:00.000Z"
        }
      : {
          family,
          applicability: "applicable" as const,
          status: "complete" as const,
          critical: true,
          summary: `Synthetic ${family} evidence is complete.`
        }
  ),
  externalRequirements: [
    {
      requirementId: "synthetic-current-security-control",
      status: "current-requirement",
      assessment: "met",
      owner: "platform-governance-reviewer",
      reviewBy: "2026-10-31T00:00:00.000Z"
    }
  ],
  reassessmentTriggers: [
    "supplier-service-change",
    "model-or-tool-change",
    "data-or-subprocessor-change",
    "location-or-capacity-change",
    "control-or-assurance-change",
    "contract-or-regulatory-change"
  ]
};

test("current approved evidence projects into the real readiness and admission evaluators", () => {
  const projection = projectSupplierAssessment({
    template: TEMPLATE,
    evidenceRecords: currentRecords(),
    evaluatedAt: EVALUATED_AT
  });
  assert.equal(projection.outcome, "projected");
  if (projection.outcome !== "projected") assert.fail("expected supplier assessment projection");

  const supplierDecision = evaluateSupplierReadiness(projection.assessment, EVALUATED_AT);
  assert.equal(supplierDecision.decision, "eligible");

  const workloadProfile = workloadFor(projection.assessment, supplierDecision.decisionId);
  const admission = evaluateWorkloadSupplierAdmission({
    workloadProfile,
    supplierAssessment: projection.assessment,
    recordedSupplierDecision: supplierDecision,
    evaluatedAt: EVALUATED_AT
  });
  assert.equal(admission.decision, "admitted");
  assert.deepEqual(admission.reasonCodes, ["supplier-decision-eligible"]);
});

test("a new current head supersedes its referenced predecessor", () => {
  const records = currentRecords();
  const previous = records[0];
  const replacement: VersionedEvidenceRecord = {
    ...previous,
    evidenceRecordId: "evidence-ffffffffffffffff",
    candidateId: "candidate-ffffffffffffffff",
    reviewId: "review-ffffffffffffffff",
    sourceReference: "https://example.com/supplier-evidence/security-privacy-v2",
    sourceVersion: "v2",
    contentDigest: `sha256:${"f".repeat(64)}`,
    supersedesEvidenceRecordId: previous.evidenceRecordId,
    auditEventIds: ["audit-ffffffffffffffff"]
  };

  const projection = projectSupplierAssessment({
    template: TEMPLATE,
    evidenceRecords: [...records, replacement],
    evaluatedAt: EVALUATED_AT
  });

  assert.equal(projection.outcome, "projected");
  if (projection.outcome !== "projected") assert.fail("expected replacement head projection");
  const security = projection.assessment.evidenceFamilies.find((item) => item.family === "security-privacy");
  assert.equal(security?.observedAt, replacement.observedAt);
  assert.ok(projection.assessment.evidenceReferences.includes(replacement.sourceReference));
  assert.equal(projection.assessment.evidenceReferences.includes(previous.sourceReference), false);
});

test("projection fails closed for missing, conflicting, or mismatched records", () => {
  const records = currentRecords();
  const conflicting: VersionedEvidenceRecord = {
    ...records[0],
    evidenceRecordId: "evidence-eeeeeeeeeeeeeeee",
    candidateId: "candidate-eeeeeeeeeeeeeeee",
    reviewId: "review-eeeeeeeeeeeeeeee"
  };
  const mismatched: VersionedEvidenceRecord = {
    ...records[0],
    supplierAssessmentId: "synthetic-other-assessment"
  };

  assertDenied(records.slice(1), "evidence-record-missing");
  assertDenied([...records, conflicting], "evidence-record-conflict");
  assertDenied([mismatched, ...records.slice(1)], "evidence-record-reference-mismatch");
});

test("projection validates immutable chain structure", () => {
  const records = currentRecords();
  const missingPredecessor: VersionedEvidenceRecord = {
    ...records[0],
    supersedesEvidenceRecordId: "evidence-ffffffffffffffff"
  };
  const cycleA: VersionedEvidenceRecord = {
    ...records[0],
    evidenceRecordId: "evidence-aaaaaaaaaaaaaaaa",
    supersedesEvidenceRecordId: "evidence-bbbbbbbbbbbbbbbb"
  };
  const cycleB: VersionedEvidenceRecord = {
    ...records[0],
    evidenceRecordId: "evidence-bbbbbbbbbbbbbbbb",
    supersedesEvidenceRecordId: "evidence-aaaaaaaaaaaaaaaa"
  };

  assertDenied([missingPredecessor, ...records.slice(1)], "evidence-record-chain-invalid");
  assertDenied([cycleA, cycleB, ...records.slice(1)], "evidence-record-chain-invalid");
});

test("projection gives revoked and expired heads precedence over freshness", () => {
  const records = currentRecords();
  const previous = records[0];
  const revoked: VersionedEvidenceRecord = {
    ...previous,
    evidenceRecordId: "evidence-dddddddddddddddd",
    recordState: "revoked",
    supersedesEvidenceRecordId: previous.evidenceRecordId,
    revocationReasonCode: "source-revoked",
    revokedAt: "2026-09-05T00:30:00.000Z",
    auditEventIds: [...previous.auditEventIds, "audit-dddddddddddddddd"]
  };
  const expired: VersionedEvidenceRecord = {
    ...previous,
    evidenceRecordId: "evidence-cccccccccccccccc",
    recordState: "expired",
    supersedesEvidenceRecordId: previous.evidenceRecordId,
    expiryReasonCode: "validity-boundary-reached",
    expiredAt: "2026-12-01T00:00:00.000Z",
    auditEventIds: [...previous.auditEventIds, "audit-cccccccccccccccc"]
  };

  assertDenied([...records, revoked], "evidence-record-revoked");
  assertDenied([...records, expired], "evidence-record-expired");
});

test("a current record beyond its validity is stale", () => {
  const records = currentRecords();
  records[0] = { ...records[0], validUntil: "2026-09-05T00:59:59.000Z" };

  assertDenied(records, "evidence-record-stale");
});

test("invalid evaluation time fails before record selection", () => {
  assert.deepEqual(
    projectSupplierAssessment({ template: TEMPLATE, evidenceRecords: currentRecords(), evaluatedAt: "not-a-time" }),
    { outcome: "denied", reasonCodes: ["projection-time-invalid"] }
  );
});

test("a not-applicable family requires no evidence record", () => {
  const projection = projectSupplierAssessment({
    template: TEMPLATE,
    evidenceRecords: currentRecords(),
    evaluatedAt: EVALUATED_AT
  });

  assert.equal(projection.outcome, "projected");
  if (projection.outcome !== "projected") assert.fail("expected projection");
  const item = projection.assessment.evidenceFamilies.find(
    (family) => family.family === "sustainability-location"
  );
  assert.deepEqual(item, {
    ...TEMPLATE.evidenceFamilies[6],
    evidenceState: "current"
  });
});

test("revoked evidence produces not-eligible and denied outcomes in the real evaluators", () => {
  const projection = projectSupplierAssessment({
    template: TEMPLATE,
    evidenceRecords: currentRecords(),
    evaluatedAt: EVALUATED_AT
  });
  if (projection.outcome !== "projected") assert.fail("expected baseline projection");
  const revokedAssessment: SupplierAssessment = structuredClone(projection.assessment);
  revokedAssessment.evidenceFamilies[0].evidenceState = "revoked";
  const supplierDecision = evaluateSupplierReadiness(revokedAssessment, EVALUATED_AT);
  assert.equal(supplierDecision.decision, "not-eligible");
  assert.deepEqual(supplierDecision.reasonCodes, ["evidence-revoked"]);

  const admission = evaluateWorkloadSupplierAdmission({
    workloadProfile: workloadFor(revokedAssessment, supplierDecision.decisionId),
    supplierAssessment: revokedAssessment,
    recordedSupplierDecision: supplierDecision,
    evaluatedAt: EVALUATED_AT
  });
  assert.equal(admission.decision, "denied");
  assert.deepEqual(admission.reasonCodes, ["supplier-decision-not-eligible"]);
});

function assertDenied(
  evidenceRecords: VersionedEvidenceRecord[],
  reasonCode: string
): void {
  assert.deepEqual(
    projectSupplierAssessment({ template: TEMPLATE, evidenceRecords, evaluatedAt: EVALUATED_AT }),
    { outcome: "denied", reasonCodes: [reasonCode] }
  );
}

function currentRecords(): VersionedEvidenceRecord[] {
  return APPLICABLE_FAMILIES.map((family, index) => recordFor(family, index + 1));
}

function recordFor(family: SupplierEvidenceFamilyName, index: number): VersionedEvidenceRecord {
  const hex = index.toString(16).padStart(16, "0");
  return {
    schemaVersion: "1.0",
    evidenceRecordId: `evidence-${hex}`,
    candidateId: `candidate-${hex}`,
    reviewId: `review-${hex}`,
    supplierAssessmentId: TEMPLATE.assessmentId,
    evidenceFamily: family,
    sourceReference: `https://example.com/supplier-evidence/${family}-v1`,
    sourceVersion: "v1",
    contentDigest: `sha256:${index.toString(16).repeat(64).slice(0, 64)}`,
    observedAt: "2026-09-01T00:00:00.000Z",
    validUntil: "2026-12-01T00:00:00.000Z",
    recordState: "current",
    approvedByRole: "evidence-approver",
    approvedAt: "2026-09-05T00:20:00.000Z",
    retentionClass: "synthetic-90-day",
    policyRef: "https://example.com/policies/synthetic-evidence-retention-v1",
    legalHoldState: "not-held",
    deletionState: "retained",
    auditEventIds: [`audit-${hex}`]
  };
}

function workloadFor(
  assessment: SupplierAssessment,
  decisionId: string
): SupplierAwareWorkloadProfile {
  return {
    schemaVersion: "1.1",
    workloadId: "synthetic-agent-rag-inference",
    supplierDependency: {
      applicability: "applicable",
      assessmentId: assessment.assessmentId,
      decisionId,
      expectedSupplierClass: assessment.supplierClass,
      expectedScope: assessment.scope
    }
  };
}
