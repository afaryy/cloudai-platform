import { createHash } from "node:crypto";
import {
  SUPPLIER_EVIDENCE_FAMILIES,
  type SupplierEvidenceFamilyName
} from "./supplierReadinessEvaluator.js";
import type {
  CandidateIdentityInput,
  EvidenceCandidate,
  EvidenceIntakeReasonCode,
  EvidenceIntakeResult,
  SyntheticEvidenceManifest
} from "./supplierEvidenceTypes.js";

const MANIFEST_KEYS = new Set<keyof SyntheticEvidenceManifest>([
  "schemaVersion",
  "supplierAssessmentId",
  "evidenceFamily",
  "sourceReference",
  "sourceType",
  "sourceVersion",
  "observedAt",
  "validUntil",
  "contentDigest",
  "adapterId",
  "adapterVersion",
  "authenticityState",
  "redactionState",
  "submittedByRole",
  "submittedByPrincipalRef",
  "submittedAt"
]);

const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9-]{2,80}$/;
const PRINCIPAL_PATTERN = /^[a-z0-9][a-z0-9:-]{2,120}$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SEMVER_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;

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

export function adaptSyntheticEvidenceManifest(value: unknown): EvidenceIntakeResult {
  if (!isManifestShape(value)) return rejected("manifest-schema-invalid");

  const observedAt = parseTimestamp(value.observedAt);
  const validUntil = parseTimestamp(value.validUntil);
  const submittedAt = parseTimestamp(value.submittedAt);
  if (
    observedAt === undefined ||
    validUntil === undefined ||
    submittedAt === undefined ||
    validUntil < observedAt ||
    submittedAt < observedAt
  ) {
    return rejected("time-boundary-invalid");
  }

  if (value.authenticityState === "failed") return rejected("authenticity-failed");
  if (value.authenticityState === "unknown") return rejected("authenticity-unknown");
  if (value.redactionState === "failed") return rejected("redaction-failed");

  const reasonCodes: readonly EvidenceIntakeReasonCode[] = Object.freeze([]);
  const candidate: EvidenceCandidate = {
    schemaVersion: "1.0",
    candidateId: candidateIdentity(value),
    supplierAssessmentId: value.supplierAssessmentId,
    evidenceFamily: value.evidenceFamily,
    sourceReference: value.sourceReference,
    sourceType: "synthetic-manifest",
    sourceVersion: value.sourceVersion,
    observedAt: value.observedAt,
    validUntil: value.validUntil,
    contentDigest: value.contentDigest,
    adapterId: value.adapterId,
    adapterVersion: value.adapterVersion,
    authenticityState: "verified",
    redactionState: "passed",
    validationState: "validated",
    candidateState: "pending-review",
    submittedByRole: value.submittedByRole,
    submittedByPrincipalRef: value.submittedByPrincipalRef,
    submittedAt: value.submittedAt,
    reasonCodes
  };

  return { outcome: "accepted", candidate: Object.freeze(candidate) };
}

function rejected(reasonCode: EvidenceIntakeReasonCode): EvidenceIntakeResult {
  return { outcome: "rejected", reasonCodes: [reasonCode] };
}

function isManifestShape(value: unknown): value is SyntheticEvidenceManifest {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== MANIFEST_KEYS.size || keys.some((key) => !MANIFEST_KEYS.has(key as keyof SyntheticEvidenceManifest))) {
    return false;
  }

  return (
    value.schemaVersion === "1.0" &&
    typeof value.supplierAssessmentId === "string" &&
    IDENTIFIER_PATTERN.test(value.supplierAssessmentId) &&
    isEvidenceFamily(value.evidenceFamily) &&
    typeof value.sourceReference === "string" &&
    value.sourceReference.length <= 500 &&
    isUri(value.sourceReference) &&
    value.sourceType === "synthetic-manifest" &&
    isBoundedString(value.sourceVersion, 80) &&
    typeof value.observedAt === "string" &&
    typeof value.validUntil === "string" &&
    typeof value.contentDigest === "string" &&
    DIGEST_PATTERN.test(value.contentDigest) &&
    typeof value.adapterId === "string" &&
    IDENTIFIER_PATTERN.test(value.adapterId) &&
    typeof value.adapterVersion === "string" &&
    SEMVER_PATTERN.test(value.adapterVersion) &&
    (value.authenticityState === "verified" ||
      value.authenticityState === "failed" ||
      value.authenticityState === "unknown") &&
    (value.redactionState === "passed" || value.redactionState === "failed") &&
    isBoundedString(value.submittedByRole, 120) &&
    typeof value.submittedByPrincipalRef === "string" &&
    PRINCIPAL_PATTERN.test(value.submittedByPrincipalRef) &&
    typeof value.submittedAt === "string"
  );
}

function isEvidenceFamily(value: unknown): value is SupplierEvidenceFamilyName {
  return typeof value === "string" && SUPPLIER_EVIDENCE_FAMILIES.some((family) => family === value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
