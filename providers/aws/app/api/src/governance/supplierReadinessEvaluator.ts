export type SupplierEvidenceStatus = "complete" | "conditional" | "missing" | "not-applicable";
export type SupplierEvidenceApplicability = "applicable" | "not-applicable";
export type SupplierEvidenceState = "current" | "revoked";
export type SupplierReadinessDecision = "eligible" | "conditional" | "not-eligible";
export type SupplierReassessmentTrigger =
  | "supplier-service-change"
  | "model-or-tool-change"
  | "data-or-subprocessor-change"
  | "location-or-capacity-change"
  | "control-or-assurance-change"
  | "contract-or-regulatory-change";
export type SupplierReadinessReasonCode =
  | "evidence-complete"
  | "bounded-remediation-required"
  | "required-evidence-family-missing"
  | "evidence-applicability-conflict"
  | "time-boundary-invalid"
  | "evidence-revoked"
  | "assessment-review-expired"
  | "evidence-expired"
  | "critical-evidence-missing"
  | "evidence-missing"
  | "conditional-boundary-incomplete"
  | "conditional-remediation-expired"
  | "current-requirement-unmet";
export type ExternalRequirementStatus =
  | "current-requirement"
  | "announced-policy-direction"
  | "planned-legislation-or-standard"
  | "watch-item";
export type ExternalRequirementAssessment = "met" | "gap" | "tracking" | "not-applicable";

export interface SupplierEvidenceFamily {
  family: string;
  applicability: SupplierEvidenceApplicability;
  status: SupplierEvidenceStatus;
  critical: boolean;
  summary: string;
  evidenceState: SupplierEvidenceState;
  observedAt: string;
  validUntil: string;
  remediation?: {
    owner: string;
    dueAt: string;
    compensatingControls: string[];
  };
}

export interface SupplierExternalRequirement {
  requirementId: string;
  status: ExternalRequirementStatus;
  assessment: ExternalRequirementAssessment;
  owner: string;
  reviewBy: string;
}

export interface SupplierAssessment {
  schemaVersion: "1.0";
  assessmentId: string;
  supplierClass: "managed-ai-service" | "dedicated-ai-capacity";
  scope: string;
  assessedAt: string;
  reviewBy: string;
  evidenceFamilies: SupplierEvidenceFamily[];
  externalRequirements: SupplierExternalRequirement[];
  evidenceReferences: string[];
  reassessmentTriggers: SupplierReassessmentTrigger[];
}

export interface SupplierAssessmentDecision {
  schemaVersion: "1.0";
  assessmentId: string;
  decision: SupplierReadinessDecision;
  reasonCodes: SupplierReadinessReasonCode[];
  evaluatedAt: string;
  reviewBy: string;
  evidenceReferences: string[];
}

const REQUIRED_EVIDENCE_FAMILIES = [
  "security-privacy",
  "ai-governance",
  "risk-compliance",
  "data-model-tool-lifecycle",
  "operations-resilience",
  "commercial-exit",
  "sustainability-location"
] as const;

export function evaluateSupplierReadiness(
  assessment: SupplierAssessment,
  evaluatedAt: string
): SupplierAssessmentDecision {
  const presentFamilies = new Set(assessment.evidenceFamilies.map((evidence) => evidence.family));
  if (REQUIRED_EVIDENCE_FAMILIES.some((family) => !presentFamilies.has(family))) {
    return decision(assessment, evaluatedAt, "not-eligible", "required-evidence-family-missing");
  }

  const applicabilityConflict = assessment.evidenceFamilies.some(
    (evidence) =>
      (evidence.applicability === "not-applicable" && evidence.status !== "not-applicable") ||
      (evidence.applicability === "applicable" && evidence.status === "not-applicable")
  );
  if (applicabilityConflict) {
    return decision(assessment, evaluatedAt, "not-eligible", "evidence-applicability-conflict");
  }

  const evaluatedTimestamp = parseTimestamp(evaluatedAt);
  if (evaluatedTimestamp === undefined || hasInvalidTemporalBoundary(assessment, evaluatedTimestamp)) {
    return decision(assessment, evaluatedAt, "not-eligible", "time-boundary-invalid");
  }

  const applicableEvidenceRevoked = assessment.evidenceFamilies.some(
    (evidence) => evidence.applicability === "applicable" && evidence.evidenceState === "revoked"
  );
  if (applicableEvidenceRevoked) {
    return decision(assessment, evaluatedAt, "not-eligible", "evidence-revoked");
  }

  if (evaluatedTimestamp > parseTimestamp(assessment.reviewBy)!) {
    return decision(assessment, evaluatedAt, "not-eligible", "assessment-review-expired");
  }

  const applicableEvidenceExpired = assessment.evidenceFamilies.some(
    (evidence) =>
      evidence.applicability === "applicable" && evaluatedTimestamp > parseTimestamp(evidence.validUntil)!
  );
  if (applicableEvidenceExpired) {
    return decision(assessment, evaluatedAt, "not-eligible", "evidence-expired");
  }

  const criticalEvidenceMissing = assessment.evidenceFamilies.some(
    (evidence) => evidence.applicability === "applicable" && evidence.critical && evidence.status === "missing"
  );
  if (criticalEvidenceMissing) {
    return decision(assessment, evaluatedAt, "not-eligible", "critical-evidence-missing");
  }

  const evidenceMissing = assessment.evidenceFamilies.some(
    (evidence) => evidence.applicability === "applicable" && evidence.status === "missing"
  );
  if (evidenceMissing) {
    return decision(assessment, evaluatedAt, "not-eligible", "evidence-missing");
  }

  const conditionalBoundaryIncomplete = assessment.evidenceFamilies.some(
    (evidence) =>
      evidence.applicability === "applicable" &&
      evidence.status === "conditional" &&
      (!evidence.remediation?.owner.trim() ||
        !evidence.remediation.dueAt.trim() ||
        evidence.remediation.compensatingControls.length === 0)
  );
  if (conditionalBoundaryIncomplete) {
    return decision(assessment, evaluatedAt, "not-eligible", "conditional-boundary-incomplete");
  }

  const conditionalRemediationExpired = assessment.evidenceFamilies.some(
    (evidence) =>
      evidence.applicability === "applicable" &&
      evidence.status === "conditional" &&
      evaluatedTimestamp > parseTimestamp(evidence.remediation!.dueAt)!
  );
  if (conditionalRemediationExpired) {
    return decision(assessment, evaluatedAt, "not-eligible", "conditional-remediation-expired");
  }

  const currentRequirementUnmet = assessment.externalRequirements.some(
    (requirement) =>
      requirement.status === "current-requirement" &&
      requirement.assessment !== "met" &&
      requirement.assessment !== "not-applicable"
  );
  if (currentRequirementUnmet) {
    return decision(assessment, evaluatedAt, "not-eligible", "current-requirement-unmet");
  }

  const remediationRequired = assessment.evidenceFamilies.some(
    (evidence) => evidence.applicability === "applicable" && evidence.status === "conditional"
  );
  if (remediationRequired) {
    return decision(assessment, evaluatedAt, "conditional", "bounded-remediation-required");
  }

  return decision(assessment, evaluatedAt, "eligible", "evidence-complete");
}

function decision(
  assessment: SupplierAssessment,
  evaluatedAt: string,
  outcome: SupplierReadinessDecision,
  reasonCode: SupplierReadinessReasonCode
): SupplierAssessmentDecision {
  return {
    schemaVersion: "1.0",
    assessmentId: assessment.assessmentId,
    decision: outcome,
    reasonCodes: [reasonCode],
    evaluatedAt,
    reviewBy: assessment.reviewBy,
    evidenceReferences: [...assessment.evidenceReferences]
  };
}

function hasInvalidTemporalBoundary(assessment: SupplierAssessment, evaluatedTimestamp: number): boolean {
  const assessedTimestamp = parseTimestamp(assessment.assessedAt);
  const reviewTimestamp = parseTimestamp(assessment.reviewBy);
  if (
    assessedTimestamp === undefined ||
    reviewTimestamp === undefined ||
    assessedTimestamp > evaluatedTimestamp ||
    reviewTimestamp < assessedTimestamp
  ) {
    return true;
  }

  for (const evidence of assessment.evidenceFamilies) {
    const observedTimestamp = parseTimestamp(evidence.observedAt);
    const validUntilTimestamp = parseTimestamp(evidence.validUntil);
    if (
      observedTimestamp === undefined ||
      validUntilTimestamp === undefined ||
      observedTimestamp > evaluatedTimestamp ||
      validUntilTimestamp < observedTimestamp
    ) {
      return true;
    }

    if (evidence.remediation) {
      const dueTimestamp = parseTimestamp(evidence.remediation.dueAt);
      if (dueTimestamp === undefined || dueTimestamp < assessedTimestamp) {
        return true;
      }
    }
  }

  return assessment.externalRequirements.some(
    (requirement) => parseTimestamp(requirement.reviewBy) === undefined
  );
}

function parseTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
