import type {
  SupplierAssessment,
  SupplierEvidenceFamily,
  SupplierEvidenceFamilyName
} from "./supplierReadinessEvaluator.js";
import type {
  SupplierEvidenceProjectionReasonCode,
  VersionedEvidenceRecord
} from "./supplierEvidenceTypes.js";

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

export function projectSupplierAssessment(input: {
  template: SupplierAssessmentTemplate;
  evidenceRecords: VersionedEvidenceRecord[];
  evaluatedAt: string;
}): SupplierAssessmentProjectionResult {
  const evaluatedAt = parseTimestamp(input.evaluatedAt);
  if (evaluatedAt === undefined) return denied("projection-time-invalid");

  const evidenceFamilies: SupplierEvidenceFamily[] = [];
  const evidenceReferences: string[] = [];

  for (const templateFamily of input.template.evidenceFamilies) {
    if (templateFamily.applicability === "not-applicable") {
      evidenceFamilies.push({
        ...templateFamily,
        evidenceState: "current"
      });
      continue;
    }

    const familyRecords = input.evidenceRecords.filter(
      (record) => record.evidenceFamily === templateFamily.family
    );
    if (familyRecords.some((record) => record.supplierAssessmentId !== input.template.assessmentId)) {
      return denied("evidence-record-reference-mismatch");
    }
    const records = familyRecords.filter(
      (record) => record.supplierAssessmentId === input.template.assessmentId
    );
    if (records.length === 0) return denied("evidence-record-missing");

    const selection = selectHead(records);
    if (selection.outcome === "denied") return selection;
    const head = selection.record;
    if (head.recordState === "revoked") return denied("evidence-record-revoked");
    if (head.recordState === "expired") return denied("evidence-record-expired");
    if (head.recordState !== "current") return denied("evidence-record-chain-invalid");

    const observedAt = parseTimestamp(head.observedAt);
    const validUntil = parseTimestamp(head.validUntil);
    if (
      observedAt === undefined ||
      validUntil === undefined ||
      validUntil < observedAt ||
      observedAt > evaluatedAt ||
      evaluatedAt > validUntil
    ) {
      return denied("evidence-record-stale");
    }

    evidenceFamilies.push({
      family: templateFamily.family,
      applicability: "applicable",
      status: templateFamily.status,
      critical: templateFamily.critical,
      summary: templateFamily.summary,
      evidenceState: "current",
      observedAt: head.observedAt,
      validUntil: head.validUntil,
      ...(templateFamily.remediation ? { remediation: structuredClone(templateFamily.remediation) } : {})
    });
    evidenceReferences.push(head.sourceReference);
  }

  return {
    outcome: "projected",
    assessment: {
      schemaVersion: "1.0",
      assessmentId: input.template.assessmentId,
      supplierClass: input.template.supplierClass,
      scope: input.template.scope,
      assessedAt: input.template.assessedAt,
      reviewBy: input.template.reviewBy,
      evidenceFamilies,
      externalRequirements: structuredClone(input.template.externalRequirements),
      evidenceReferences,
      reassessmentTriggers: [...input.template.reassessmentTriggers]
    }
  };
}

function selectHead(
  records: VersionedEvidenceRecord[]
):
  | { outcome: "selected"; record: VersionedEvidenceRecord }
  | { outcome: "denied"; reasonCodes: [SupplierEvidenceProjectionReasonCode] } {
  const byId = new Map<string, VersionedEvidenceRecord>();
  for (const record of records) {
    if (byId.has(record.evidenceRecordId)) return denied("evidence-record-conflict");
    byId.set(record.evidenceRecordId, record);
  }

  for (const record of records) {
    if (
      record.supersedesEvidenceRecordId &&
      !byId.has(record.supersedesEvidenceRecordId)
    ) {
      return denied("evidence-record-chain-invalid");
    }
  }

  if (hasCycle(records, byId)) return denied("evidence-record-chain-invalid");

  const referencedIds = new Set(
    records.flatMap((record) =>
      record.supersedesEvidenceRecordId ? [record.supersedesEvidenceRecordId] : []
    )
  );
  const heads = records.filter((record) => !referencedIds.has(record.evidenceRecordId));
  if (heads.length > 1) return denied("evidence-record-conflict");
  if (heads.length !== 1) return denied("evidence-record-chain-invalid");
  return { outcome: "selected", record: heads[0] };
}

function hasCycle(
  records: VersionedEvidenceRecord[],
  byId: Map<string, VersionedEvidenceRecord>
): boolean {
  for (const record of records) {
    const visited = new Set<string>();
    let current: VersionedEvidenceRecord | undefined = record;
    while (current) {
      if (visited.has(current.evidenceRecordId)) return true;
      visited.add(current.evidenceRecordId);
      current = current.supersedesEvidenceRecordId
        ? byId.get(current.supersedesEvidenceRecordId)
        : undefined;
    }
  }
  return false;
}

function denied(
  reasonCode: SupplierEvidenceProjectionReasonCode
): { outcome: "denied"; reasonCodes: [SupplierEvidenceProjectionReasonCode] } {
  return { outcome: "denied", reasonCodes: [reasonCode] };
}

function parseTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
