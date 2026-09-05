import { candidateIdentity, deterministicIdentity } from "./supplierEvidenceAdapter.js";
import {
  buildSupplierEvidenceTelemetryEvent,
  type SupplierEvidenceTelemetryInput
} from "./supplierEvidenceTelemetry.js";
import type { SupplierEvidenceFamilyName } from "./supplierReadinessEvaluator.js";
import type {
  EvidenceAuditEvent,
  EvidenceCandidate,
  EvidenceReviewReasonCode,
  EvidenceRevocationReasonCode,
  HumanReviewRecord,
  SupplierEvidenceTelemetryEvent,
  VersionedEvidenceRecord
} from "./supplierEvidenceTypes.js";

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
  reasonCode: EvidenceRevocationReasonCode;
}

export interface EvidenceExpiryInput {
  evidenceRecordId: string;
  expiredAt: string;
  reasonCode: "validity-boundary-reached";
}

export type EvidenceReviewResult =
  | {
      outcome: "approved";
      review: HumanReviewRecord;
      record: VersionedEvidenceRecord;
      telemetryGap: boolean;
    }
  | { outcome: "recorded"; review: HumanReviewRecord; telemetryGap: boolean }
  | { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] };

export type EvidenceRevocationResult =
  | { outcome: "revoked"; record: VersionedEvidenceRecord; telemetryGap: boolean }
  | { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] };

export type EvidenceRecordTransitionResult =
  | { outcome: "expired"; record: VersionedEvidenceRecord }
  | { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] };

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

type StoreFailure = "audit-write" | "registry-write" | "telemetry-export";

export function reviewEvidenceCandidate(
  input: EvidenceReviewInput,
  store: EvidenceWorkflowStore
): EvidenceReviewResult {
  const candidateStateFailure = validateCandidateState(input.candidate);
  if (candidateStateFailure) return denied(candidateStateFailure);
  if (input.candidateDigest !== input.candidate.contentDigest) return denied("candidate-digest-mismatch");

  const reviewedAt = parseTimestamp(input.reviewedAt);
  const reviewValidUntil = parseTimestamp(input.reviewValidUntil);
  const observedAt = parseTimestamp(input.candidate.observedAt);
  const submittedAt = parseTimestamp(input.candidate.submittedAt);
  const candidateValidUntil = parseTimestamp(input.candidate.validUntil);
  if (
    reviewedAt === undefined ||
    reviewValidUntil === undefined ||
    reviewedAt > reviewValidUntil
  ) {
    return denied("review-expired");
  }
  if (
    observedAt === undefined ||
    submittedAt === undefined ||
    candidateValidUntil === undefined ||
    submittedAt < observedAt ||
    candidateValidUntil < observedAt ||
    reviewedAt < submittedAt ||
    reviewedAt > candidateValidUntil
  ) {
    return denied("candidate-not-reviewable");
  }

  if (input.candidate.submittedByPrincipalRef === input.reviewerPrincipalRef) {
    return denied("segregation-of-duties-violation");
  }

  if (input.action === "approved") {
    if (
      !isNonEmpty(input.approverRole) ||
      !isPrincipalRef(input.approverPrincipalRef) ||
      !isNonEmpty(input.retentionClass) ||
      !isUri(input.policyRef)
    ) {
      return denied("candidate-not-reviewable");
    }
    if (
      input.approverPrincipalRef === input.candidate.submittedByPrincipalRef ||
      input.approverPrincipalRef === input.reviewerPrincipalRef
    ) {
      return denied("segregation-of-duties-violation");
    }
    if (input.exceptionBoundary && !isCompleteExceptionBoundary(input.exceptionBoundary, reviewedAt)) {
      return denied("exception-boundary-incomplete");
    }
  }

  const reviewId = deterministicIdentity("review", [
    input.candidate.candidateId,
    input.candidate.contentDigest,
    input.action,
    input.reviewedAt
  ]);

  if (input.action !== "approved") {
    const reasonCode = input.action === "rejected" ? "human-rejected" : "changes-requested";
    const review = freezeReview({
      schemaVersion: "1.0",
      reviewId,
      candidateId: input.candidate.candidateId,
      candidateDigest: input.candidate.contentDigest,
      reviewAction: input.action,
      reviewerRole: input.reviewerRole,
      reviewerPrincipalRef: input.reviewerPrincipalRef,
      reviewedAt: input.reviewedAt,
      reviewValidUntil: input.reviewValidUntil,
      reasonCodes: [reasonCode],
      auditEventId: deterministicIdentity("audit", [reviewId, `${input.action}-recorded`])
    });
    store.appendReview(review);
    const telemetryGap = exportTelemetrySafely(store, {
      eventName: "supplier-evidence-review",
      outcome: "succeeded",
      reasonCode,
      candidateId: input.candidate.candidateId,
      reviewId,
      supplierAssessmentId: input.candidate.supplierAssessmentId,
      telemetryGap: false
    });
    return { outcome: "recorded", review, telemetryGap };
  }

  const auditEventId = deterministicIdentity("audit", [reviewId, "approval-committed"]);
  const review = freezeReview({
    schemaVersion: "1.0",
    reviewId,
    candidateId: input.candidate.candidateId,
    candidateDigest: input.candidate.contentDigest,
    reviewAction: "approved",
    reviewerRole: input.reviewerRole,
    reviewerPrincipalRef: input.reviewerPrincipalRef,
    reviewedAt: input.reviewedAt,
    reviewValidUntil: input.reviewValidUntil,
    reasonCodes: ["evidence-reviewed"],
    approverRole: input.approverRole,
    approverPrincipalRef: input.approverPrincipalRef,
    approvedAt: input.reviewedAt,
    ...(input.exceptionBoundary ? { exceptionBoundary: freezeExceptionBoundary(input.exceptionBoundary) } : {}),
    auditEventId
  });

  const evidenceRecordId = deterministicIdentity("evidence", [
    input.candidate.candidateId,
    reviewId,
    "current"
  ]);
  const familyRecords = store.listRecords(
    input.candidate.supplierAssessmentId,
    input.candidate.evidenceFamily
  );
  const priorHead = findHead(familyRecords);
  const existingRecord = store.findRecord(evidenceRecordId);
  if (existingRecord) {
    if (
      priorHead?.evidenceRecordId !== evidenceRecordId ||
      existingRecord.recordState !== "current" ||
      existingRecord.candidateId !== input.candidate.candidateId ||
      existingRecord.reviewId !== reviewId ||
      existingRecord.contentDigest !== input.candidate.contentDigest
    ) {
      return denied("evidence-record-not-current");
    }
    const telemetryGap = exportTelemetrySafely(store, {
      eventName: "supplier-evidence-published",
      outcome: "succeeded",
      reasonCode: "evidence-published",
      candidateId: input.candidate.candidateId,
      reviewId,
      evidenceRecordId,
      supplierAssessmentId: input.candidate.supplierAssessmentId,
      telemetryGap: false
    });
    return { outcome: "approved", review, record: existingRecord, telemetryGap };
  }
  const record = freezeRecord({
    schemaVersion: "1.0",
    evidenceRecordId,
    candidateId: input.candidate.candidateId,
    reviewId,
    supplierAssessmentId: input.candidate.supplierAssessmentId,
    evidenceFamily: input.candidate.evidenceFamily,
    sourceReference: input.candidate.sourceReference,
    sourceVersion: input.candidate.sourceVersion,
    contentDigest: input.candidate.contentDigest,
    observedAt: input.candidate.observedAt,
    validUntil: input.candidate.validUntil,
    recordState: "current",
    approvedByRole: input.approverRole,
    approvedAt: input.reviewedAt,
    retentionClass: input.retentionClass,
    policyRef: input.policyRef,
    legalHoldState: "not-held",
    deletionState: "retained",
    ...(priorHead ? { supersedesEvidenceRecordId: priorHead.evidenceRecordId } : {}),
    auditEventIds: [auditEventId]
  });
  const auditEvent = freezeAuditEvent({
    auditEventId,
    eventName: "approval-committed",
    candidateId: input.candidate.candidateId,
    evidenceRecordId,
    actorRole: input.approverRole,
    actorPrincipalRef: input.approverPrincipalRef,
    occurredAt: input.reviewedAt
  });

  try {
    store.commitApproval({ review, auditEvent, record });
  } catch {
    return denied("approval-not-committed");
  }

  const telemetryGap = exportTelemetrySafely(store, {
    eventName: "supplier-evidence-published",
    outcome: "succeeded",
    reasonCode: "evidence-published",
    candidateId: input.candidate.candidateId,
    reviewId,
    evidenceRecordId,
    supplierAssessmentId: input.candidate.supplierAssessmentId,
    telemetryGap: false
  });
  return { outcome: "approved", review, record, telemetryGap };
}

export function revokeEvidenceRecord(
  input: EvidenceRevocationInput,
  store: EvidenceWorkflowStore
): EvidenceRevocationResult {
  if (
    !isNonEmpty(input.revocationOwnerRole) ||
    !isPrincipalRef(input.revocationOwnerPrincipalRef) ||
    parseTimestamp(input.revokedAt) === undefined ||
    !isRevocationReason(input.reasonCode)
  ) {
    return denied("revocation-not-authorized");
  }

  const existing = store.findRecord(input.evidenceRecordId);
  if (!existing) return denied("evidence-record-not-current");
  const head = findHead(store.listRecords(existing.supplierAssessmentId, existing.evidenceFamily));
  if (!head || head.evidenceRecordId !== existing.evidenceRecordId || head.recordState !== "current") {
    return denied("evidence-record-not-current");
  }

  const revokedRecordId = deterministicIdentity("evidence", [
    head.evidenceRecordId,
    input.revokedAt,
    "revoked"
  ]);
  const revocationAuditEventId = deterministicIdentity("audit", [
    revokedRecordId,
    "revocation-committed"
  ]);
  const record = freezeRecord({
    ...head,
    evidenceRecordId: revokedRecordId,
    recordState: "revoked",
    supersedesEvidenceRecordId: head.evidenceRecordId,
    revocationReasonCode: input.reasonCode,
    revokedAt: input.revokedAt,
    auditEventIds: [...head.auditEventIds, revocationAuditEventId]
  });
  const auditEvent = freezeAuditEvent({
    auditEventId: revocationAuditEventId,
    eventName: "revocation-committed",
    candidateId: head.candidateId,
    evidenceRecordId: revokedRecordId,
    actorRole: input.revocationOwnerRole,
    actorPrincipalRef: input.revocationOwnerPrincipalRef,
    occurredAt: input.revokedAt
  });

  try {
    store.commitRevocation({ auditEvent, record });
  } catch {
    return denied("approval-not-committed");
  }
  const telemetryGap = exportTelemetrySafely(store, {
    eventName: "supplier-evidence-revoked",
    outcome: "succeeded",
    reasonCode: "evidence-revoked",
    candidateId: head.candidateId,
    reviewId: head.reviewId,
    evidenceRecordId: record.evidenceRecordId,
    supplierAssessmentId: head.supplierAssessmentId,
    telemetryGap: false
  });
  return { outcome: "revoked", record, telemetryGap };
}

export function expireEvidenceRecord(
  input: EvidenceExpiryInput,
  store: EvidenceWorkflowStore
): EvidenceRecordTransitionResult {
  const existing = store.findRecord(input.evidenceRecordId);
  if (!existing) return denied("evidence-record-not-current");
  const head = findHead(store.listRecords(existing.supplierAssessmentId, existing.evidenceFamily));
  if (!head || head.evidenceRecordId !== existing.evidenceRecordId || head.recordState !== "current") {
    return denied("evidence-record-not-current");
  }
  const expiredAt = parseTimestamp(input.expiredAt);
  const validUntil = parseTimestamp(head.validUntil);
  if (
    input.reasonCode !== "validity-boundary-reached" ||
    expiredAt === undefined ||
    validUntil === undefined ||
    expiredAt < validUntil
  ) {
    return denied("expiry-boundary-invalid");
  }

  const expiredRecordId = deterministicIdentity("evidence", [head.evidenceRecordId, input.expiredAt, "expired"]);
  const expiryAuditEventId = deterministicIdentity("audit", [expiredRecordId, "expiry-committed"]);
  const record = freezeRecord({
    ...head,
    evidenceRecordId: expiredRecordId,
    recordState: "expired",
    supersedesEvidenceRecordId: head.evidenceRecordId,
    expiryReasonCode: "validity-boundary-reached",
    expiredAt: input.expiredAt,
    auditEventIds: [...head.auditEventIds, expiryAuditEventId]
  });
  const auditEvent = freezeAuditEvent({
    auditEventId: expiryAuditEventId,
    eventName: "expiry-committed",
    candidateId: head.candidateId,
    evidenceRecordId: expiredRecordId,
    actorRole: "evidence-lifecycle-controller",
    actorPrincipalRef: "principal:evidence-lifecycle-controller",
    occurredAt: input.expiredAt
  });
  try {
    store.commitRevocation({ auditEvent, record });
  } catch {
    return denied("approval-not-committed");
  }
  return { outcome: "expired", record };
}

export function createInMemoryEvidenceWorkflowStore(
  failure?: StoreFailure
): EvidenceWorkflowStore {
  const reviews: HumanReviewRecord[] = [];
  const auditEvents: EvidenceAuditEvent[] = [];
  const records: VersionedEvidenceRecord[] = [];

  return {
    appendReview(review) {
      if (!reviews.some((item) => item.reviewId === review.reviewId)) reviews.push(review);
    },
    commitApproval({ review, auditEvent, record }) {
      commitAtomically(review, auditEvent, record);
    },
    commitRevocation({ auditEvent, record }) {
      commitAtomically(undefined, auditEvent, record);
    },
    findRecord(evidenceRecordId) {
      return records.find((record) => record.evidenceRecordId === evidenceRecordId);
    },
    listRecords(supplierAssessmentId, evidenceFamily) {
      return records.filter(
        (record) =>
          record.supplierAssessmentId === supplierAssessmentId && record.evidenceFamily === evidenceFamily
      );
    },
    exportTelemetry(_event) {
      if (failure === "telemetry-export") throw new Error("synthetic telemetry export failure");
    }
  };

  function commitAtomically(
    review: HumanReviewRecord | undefined,
    auditEvent: EvidenceAuditEvent,
    record: VersionedEvidenceRecord
  ): void {
    if (records.some((item) => item.evidenceRecordId === record.evidenceRecordId)) return;
    if (failure === "audit-write") throw new Error("synthetic audit write failure");
    if (failure === "registry-write") throw new Error("synthetic registry write failure");
    if (review && !reviews.some((item) => item.reviewId === review.reviewId)) reviews.push(review);
    auditEvents.push(auditEvent);
    records.push(record);
  }
}

function validateCandidateState(candidate: EvidenceCandidate): EvidenceReviewReasonCode | undefined {
  if (candidate.candidateState !== "pending-review") return "candidate-state-invalid";
  if (
    candidate.schemaVersion !== "1.0" ||
    candidate.validationState !== "validated" ||
    candidate.authenticityState !== "verified" ||
    candidate.redactionState !== "passed" ||
    candidate.candidateId !== candidateIdentity(candidate)
  ) {
    return "candidate-not-reviewable";
  }
  return undefined;
}

function findHead(records: VersionedEvidenceRecord[]): VersionedEvidenceRecord | undefined {
  const referenced = new Set(
    records.flatMap((record) => record.supersedesEvidenceRecordId ? [record.supersedesEvidenceRecordId] : [])
  );
  const heads = records.filter((record) => !referenced.has(record.evidenceRecordId));
  return heads.length === 1 ? heads[0] : undefined;
}

function isCompleteExceptionBoundary(
  boundary: NonNullable<HumanReviewRecord["exceptionBoundary"]>,
  reviewedAt: number
): boolean {
  const validUntil = parseTimestamp(boundary.validUntil);
  return (
    isNonEmpty(boundary.exceptionOwnerRole) &&
    validUntil !== undefined &&
    validUntil >= reviewedAt &&
    Array.isArray(boundary.compensatingControls) &&
    boundary.compensatingControls.length > 0 &&
    boundary.compensatingControls.every(isNonEmpty) &&
    Array.isArray(boundary.acceptedEvidenceFamilies) &&
    boundary.acceptedEvidenceFamilies.length > 0
  );
}

function freezeReview(review: HumanReviewRecord): HumanReviewRecord {
  Object.freeze(review.reasonCodes);
  if (review.exceptionBoundary) freezeExceptionBoundary(review.exceptionBoundary);
  return Object.freeze(review);
}

function freezeExceptionBoundary(
  boundary: NonNullable<HumanReviewRecord["exceptionBoundary"]>
): NonNullable<HumanReviewRecord["exceptionBoundary"]> {
  Object.freeze(boundary.compensatingControls);
  Object.freeze(boundary.acceptedEvidenceFamilies);
  return Object.freeze(boundary);
}

function freezeRecord(record: VersionedEvidenceRecord): VersionedEvidenceRecord {
  Object.freeze(record.auditEventIds);
  return Object.freeze(record);
}

function freezeAuditEvent(event: EvidenceAuditEvent): EvidenceAuditEvent {
  return Object.freeze(event);
}

function exportTelemetrySafely(
  store: EvidenceWorkflowStore,
  input: SupplierEvidenceTelemetryInput
): boolean {
  try {
    store.exportTelemetry(buildSupplierEvidenceTelemetryEvent(input));
    return false;
  } catch {
    return true;
  }
}

function denied(reasonCode: EvidenceReviewReasonCode): { outcome: "denied"; reasonCodes: [EvidenceReviewReasonCode] } {
  return { outcome: "denied", reasonCodes: [reasonCode] };
}

function isRevocationReason(value: string): value is EvidenceRevocationReasonCode {
  return (
    value === "source-revoked" ||
    value === "source-material-change" ||
    value === "digest-conflict" ||
    value === "authenticity-failed"
  );
}

function isPrincipalRef(value: string): boolean {
  return /^[a-z0-9][a-z0-9:-]{2,120}$/.test(value);
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function isUri(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function parseTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
