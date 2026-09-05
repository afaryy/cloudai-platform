import type { SupplierEvidenceFamilyName } from "./supplierReadinessEvaluator.js";

export type EvidenceAuthenticityState = "verified" | "failed" | "unknown";
export type EvidenceRedactionState = "passed" | "failed";
export type EvidenceReviewAction = "approved" | "rejected" | "changes-requested";
export type EvidenceRecordState = "current" | "superseded" | "expired" | "revoked";
export type EvidenceRevocationReasonCode =
  | "source-revoked"
  | "source-material-change"
  | "digest-conflict"
  | "authenticity-failed";

export interface SyntheticEvidenceManifest {
  schemaVersion: "1.0";
  supplierAssessmentId: string;
  evidenceFamily: SupplierEvidenceFamilyName;
  sourceReference: string;
  sourceType: "synthetic-manifest";
  sourceVersion: string;
  observedAt: string;
  validUntil: string;
  contentDigest: string;
  adapterId: string;
  adapterVersion: string;
  authenticityState: EvidenceAuthenticityState;
  redactionState: EvidenceRedactionState;
  submittedByRole: string;
  submittedByPrincipalRef: string;
  submittedAt: string;
}

export interface EvidenceCandidate extends SyntheticEvidenceManifest {
  candidateId: string;
  authenticityState: "verified";
  redactionState: "passed";
  validationState: "validated";
  candidateState: "pending-review";
  reasonCodes: readonly EvidenceIntakeReasonCode[];
}

export interface HumanReviewExceptionBoundary {
  exceptionOwnerRole: string;
  validUntil: string;
  compensatingControls: readonly string[];
  acceptedEvidenceFamilies: readonly SupplierEvidenceFamilyName[];
}

export interface HumanReviewRecord {
  schemaVersion: "1.0";
  reviewId: string;
  candidateId: string;
  candidateDigest: string;
  reviewAction: EvidenceReviewAction;
  reviewerRole: string;
  reviewerPrincipalRef: string;
  reviewedAt: string;
  reviewValidUntil: string;
  reasonCodes: readonly ("evidence-reviewed" | "human-rejected" | "changes-requested")[];
  approverRole?: string;
  approverPrincipalRef?: string;
  approvedAt?: string;
  exceptionBoundary?: HumanReviewExceptionBoundary;
  auditEventId: string;
}

export interface VersionedEvidenceRecord {
  schemaVersion: "1.0";
  evidenceRecordId: string;
  candidateId: string;
  reviewId: string;
  supplierAssessmentId: string;
  evidenceFamily: SupplierEvidenceFamilyName;
  sourceReference: string;
  sourceVersion: string;
  contentDigest: string;
  observedAt: string;
  validUntil: string;
  recordState: EvidenceRecordState;
  approvedByRole: string;
  approvedAt: string;
  retentionClass: string;
  policyRef: string;
  legalHoldState: "not-held" | "held";
  deletionState: "retained" | "deletion-pending" | "deleted";
  supersedesEvidenceRecordId?: string;
  revocationReasonCode?: EvidenceRevocationReasonCode;
  revokedAt?: string;
  expiryReasonCode?: "validity-boundary-reached";
  expiredAt?: string;
  auditEventIds: readonly string[];
}

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
  durationMs?: number;
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
