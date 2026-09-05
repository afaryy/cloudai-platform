import type { SupplierEvidenceTelemetryEvent } from "./supplierEvidenceTypes.js";

export type SupplierEvidenceTelemetryInput =
  Omit<SupplierEvidenceTelemetryEvent, "telemetryGap"> & {
    telemetryGap?: boolean;
  };

const ALLOWED_KEYS = new Set([
  "eventName",
  "outcome",
  "reasonCode",
  "candidateId",
  "reviewId",
  "evidenceRecordId",
  "supplierAssessmentId",
  "durationMs",
  "telemetryGap"
]);

const EVENT_NAMES = new Set<SupplierEvidenceTelemetryEvent["eventName"]>([
  "supplier-evidence-intake",
  "supplier-evidence-review",
  "supplier-evidence-published",
  "supplier-evidence-reassessment",
  "supplier-evidence-revoked",
  "supplier-evidence-export"
]);

const REASON_CODES = new Set<SupplierEvidenceTelemetryEvent["reasonCode"]>([
  "manifest-schema-invalid",
  "authenticity-failed",
  "authenticity-unknown",
  "redaction-failed",
  "time-boundary-invalid",
  "evidence-reviewed",
  "candidate-not-reviewable",
  "candidate-digest-mismatch",
  "review-expired",
  "candidate-state-invalid",
  "segregation-of-duties-violation",
  "exception-boundary-incomplete",
  "human-rejected",
  "changes-requested",
  "approval-not-committed",
  "evidence-record-not-current",
  "revocation-not-authorized",
  "expiry-boundary-invalid",
  "projection-time-invalid",
  "evidence-record-missing",
  "evidence-record-conflict",
  "evidence-record-reference-mismatch",
  "evidence-record-chain-invalid",
  "evidence-record-stale",
  "evidence-record-expired",
  "evidence-record-revoked",
  "evidence-published",
  "evidence-reassessment-requested",
  "evidence-revoked",
  "telemetry-export-succeeded",
  "telemetry-export-failed"
]);

export function buildSupplierEvidenceTelemetryEvent(
  input: SupplierEvidenceTelemetryInput
): SupplierEvidenceTelemetryEvent {
  if (!isRecord(input) || Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) invalid();
  if (!EVENT_NAMES.has(input.eventName) || !REASON_CODES.has(input.reasonCode)) invalid();
  if (input.outcome !== "succeeded" && input.outcome !== "failed") invalid();
  if (!isNonEmptyString(input.candidateId) || !isNonEmptyString(input.supplierAssessmentId)) invalid();
  if (input.reviewId !== undefined && !isNonEmptyString(input.reviewId)) invalid();
  if (input.evidenceRecordId !== undefined && !isNonEmptyString(input.evidenceRecordId)) invalid();
  if (
    input.durationMs !== undefined &&
    (!Number.isFinite(input.durationMs) || input.durationMs < 0)
  ) {
    invalid();
  }
  if (input.telemetryGap !== undefined && typeof input.telemetryGap !== "boolean") invalid();

  return {
    eventName: input.eventName,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    candidateId: input.candidateId,
    ...(input.reviewId !== undefined ? { reviewId: input.reviewId } : {}),
    ...(input.evidenceRecordId !== undefined ? { evidenceRecordId: input.evidenceRecordId } : {}),
    supplierAssessmentId: input.supplierAssessmentId,
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
    telemetryGap: input.telemetryGap ?? false
  };
}

function invalid(): never {
  throw new Error("supplier-evidence-telemetry-invalid");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
