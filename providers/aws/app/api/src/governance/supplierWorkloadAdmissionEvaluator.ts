import {
  evaluateSupplierReadiness,
  type SupplierAssessment,
  type SupplierAssessmentDecision,
  type SupplierReadinessReasonCode
} from "./supplierReadinessEvaluator.js";

export type WorkloadSupplierAdmissionReasonCode =
  | "admission-time-invalid"
  | "supplier-dependency-not-applicable"
  | "supplier-assessment-missing"
  | "supplier-decision-missing"
  | "supplier-reference-mismatch"
  | "supplier-decision-replay-mismatch"
  | "supplier-decision-not-eligible"
  | "supplier-decision-eligible"
  | "conditional-acceptance-unexpected"
  | "conditional-acceptance-missing"
  | "conditional-acceptance-mismatch"
  | "conditional-acceptance-boundary-invalid"
  | "conditional-acceptance-revoked"
  | "conditional-acceptance-expired"
  | "conditional-supplier-decision-accepted";

export type WorkloadSupplierDependency =
  | { applicability: "not-applicable"; reason: string }
  | {
      applicability: "applicable";
      assessmentId: string;
      decisionId: string;
      expectedSupplierClass: SupplierAssessment["supplierClass"];
      expectedScope: string;
      conditionalAcceptanceId?: string;
    };

export interface SupplierAwareWorkloadProfile {
  schemaVersion: "1.1";
  workloadId: string;
  supplierDependency: WorkloadSupplierDependency;
}

export interface ConditionalSupplierAcceptance {
  schemaVersion: "1.0";
  acceptanceId: string;
  assessmentId: string;
  decisionId: string;
  acceptanceState: "accepted" | "revoked";
  acceptedEvidenceFamilies: string[];
  acceptedByRole: string;
  acceptedAt: string;
  validUntil: string;
  evidenceReferences: string[];
}

interface WorkloadSupplierAdmissionDecisionCommon {
  schemaVersion: "1.0";
  admissionDecisionId: string;
  workloadId: string;
  decision: "admitted" | "denied";
  reasonCodes: WorkloadSupplierAdmissionReasonCode[];
  supplierReasonCodes: SupplierReadinessReasonCode[];
  evaluatedAt: string;
  evidenceReferences: string[];
}

export type WorkloadSupplierAdmissionDecision =
  | (WorkloadSupplierAdmissionDecisionCommon & {
      supplierDependencyApplicability: "not-applicable";
    })
  | (WorkloadSupplierAdmissionDecisionCommon & {
      supplierDependencyApplicability: "applicable";
      supplierAssessmentId: string;
      supplierDecisionId: string;
      conditionalAcceptanceId?: string;
    });

export function evaluateWorkloadSupplierAdmission(input: {
  workloadProfile: SupplierAwareWorkloadProfile;
  supplierAssessment?: SupplierAssessment;
  recordedSupplierDecision?: SupplierAssessmentDecision;
  conditionalAcceptance?: ConditionalSupplierAcceptance;
  evaluatedAt: string;
}): WorkloadSupplierAdmissionDecision {
  const dependency = input.workloadProfile.supplierDependency;
  const evaluatedTimestamp = parseTimestamp(input.evaluatedAt);

  if (evaluatedTimestamp === undefined) {
    return result(input, "denied", "admission-time-invalid");
  }

  if (dependency.applicability === "not-applicable") {
    if (input.conditionalAcceptance) {
      return result(input, "denied", "conditional-acceptance-unexpected");
    }
    if (input.supplierAssessment || input.recordedSupplierDecision) {
      return result(input, "denied", "supplier-reference-mismatch");
    }
    return result(input, "admitted", "supplier-dependency-not-applicable");
  }

  if (!input.supplierAssessment) {
    return result(input, "denied", "supplier-assessment-missing");
  }
  if (!input.recordedSupplierDecision) {
    return result(input, "denied", "supplier-decision-missing");
  }

  const assessment = input.supplierAssessment;
  const recordedDecision = input.recordedSupplierDecision;
  if (
    dependency.assessmentId !== assessment.assessmentId ||
    dependency.assessmentId !== recordedDecision.assessmentId ||
    dependency.decisionId !== recordedDecision.decisionId ||
    dependency.expectedSupplierClass !== assessment.supplierClass ||
    dependency.expectedScope !== assessment.scope ||
    dependency.expectedScope !== recordedDecision.scope
  ) {
    return result(input, "denied", "supplier-reference-mismatch");
  }

  const replayedDecision = evaluateSupplierReadiness(assessment, recordedDecision.evaluatedAt);
  if (!sameSupplierDecision(replayedDecision, recordedDecision)) {
    return result(input, "denied", "supplier-decision-replay-mismatch");
  }

  const currentDecision = evaluateSupplierReadiness(assessment, input.evaluatedAt);
  if (currentDecision.decision === "not-eligible") {
    return result(
      input,
      "denied",
      "supplier-decision-not-eligible",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  if (currentDecision.decision === "eligible") {
    if (dependency.conditionalAcceptanceId || input.conditionalAcceptance) {
      return result(
        input,
        "denied",
        "conditional-acceptance-unexpected",
        currentDecision.reasonCodes,
        currentDecision.evidenceReferences
      );
    }
    return result(
      input,
      "admitted",
      "supplier-decision-eligible",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  if (!dependency.conditionalAcceptanceId || !input.conditionalAcceptance) {
    return result(
      input,
      "denied",
      "conditional-acceptance-missing",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  const acceptance = input.conditionalAcceptance;
  const expectedConditionalFamilies = assessment.evidenceFamilies
    .filter((item) => item.applicability === "applicable" && item.status === "conditional")
    .map((item) => item.family)
    .sort();
  const acceptedFamilies = [...acceptance.acceptedEvidenceFamilies].sort();
  if (
    dependency.conditionalAcceptanceId !== acceptance.acceptanceId ||
    acceptance.assessmentId !== assessment.assessmentId ||
    acceptance.decisionId !== recordedDecision.decisionId ||
    !sameOrderedValues(expectedConditionalFamilies, acceptedFamilies)
  ) {
    return result(
      input,
      "denied",
      "conditional-acceptance-mismatch",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  const recordedDecisionTimestamp = parseTimestamp(recordedDecision.evaluatedAt);
  const acceptedTimestamp = parseTimestamp(acceptance.acceptedAt);
  const acceptanceExpiryTimestamp = parseTimestamp(acceptance.validUntil);
  const assessmentReviewTimestamp = parseTimestamp(assessment.reviewBy);
  const conditionalRemediationTimestamps = assessment.evidenceFamilies
    .filter((item) => item.applicability === "applicable" && item.status === "conditional")
    .map((item) => parseTimestamp(item.remediation?.dueAt ?? ""));
  if (
    recordedDecisionTimestamp === undefined ||
    acceptedTimestamp === undefined ||
    acceptanceExpiryTimestamp === undefined ||
    assessmentReviewTimestamp === undefined ||
    conditionalRemediationTimestamps.some((value) => value === undefined) ||
    acceptedTimestamp < recordedDecisionTimestamp ||
    acceptedTimestamp > evaluatedTimestamp ||
    acceptedTimestamp > acceptanceExpiryTimestamp ||
    acceptanceExpiryTimestamp > assessmentReviewTimestamp ||
    conditionalRemediationTimestamps.some((value) => acceptanceExpiryTimestamp > value!)
  ) {
    return result(
      input,
      "denied",
      "conditional-acceptance-boundary-invalid",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  if (acceptance.acceptanceState === "revoked") {
    return result(
      input,
      "denied",
      "conditional-acceptance-revoked",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  if (evaluatedTimestamp > acceptanceExpiryTimestamp) {
    return result(
      input,
      "denied",
      "conditional-acceptance-expired",
      currentDecision.reasonCodes,
      currentDecision.evidenceReferences
    );
  }

  return result(
    input,
    "admitted",
    "conditional-supplier-decision-accepted",
    currentDecision.reasonCodes,
    mergeUnique(currentDecision.evidenceReferences, acceptance.evidenceReferences),
    acceptance.acceptanceId
  );
}

function result(
  input: {
    workloadProfile: SupplierAwareWorkloadProfile;
    evaluatedAt: string;
  },
  decision: "admitted" | "denied",
  reasonCode: WorkloadSupplierAdmissionReasonCode,
  supplierReasonCodes: SupplierReadinessReasonCode[] = [],
  evidenceReferences: string[] = [],
  conditionalAcceptanceId?: string
): WorkloadSupplierAdmissionDecision {
  const dependency = input.workloadProfile.supplierDependency;
  const supplierDecisionId = dependency.applicability === "applicable" ? dependency.decisionId : "not-applicable";
  const common = {
    schemaVersion: "1.0" as const,
    admissionDecisionId: `${input.workloadProfile.workloadId}:${supplierDecisionId}:${input.evaluatedAt}`,
    workloadId: input.workloadProfile.workloadId,
    decision,
    reasonCodes: [reasonCode],
    supplierReasonCodes: [...supplierReasonCodes],
    evaluatedAt: input.evaluatedAt,
    evidenceReferences: [...evidenceReferences]
  };

  if (dependency.applicability === "not-applicable") {
    return { ...common, supplierDependencyApplicability: "not-applicable" };
  }

  const applicableResult: WorkloadSupplierAdmissionDecision = {
    ...common,
    supplierDependencyApplicability: "applicable",
    supplierAssessmentId: dependency.assessmentId,
    supplierDecisionId: dependency.decisionId
  };
  if (conditionalAcceptanceId) {
    applicableResult.conditionalAcceptanceId = conditionalAcceptanceId;
  }
  return applicableResult;
}

function sameSupplierDecision(
  left: SupplierAssessmentDecision,
  right: SupplierAssessmentDecision
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.decisionId === right.decisionId &&
    left.assessmentId === right.assessmentId &&
    left.scope === right.scope &&
    left.decision === right.decision &&
    sameOrderedValues(left.reasonCodes, right.reasonCodes) &&
    left.evaluatedAt === right.evaluatedAt &&
    left.reviewBy === right.reviewBy &&
    sameOrderedValues(left.evidenceReferences, right.evidenceReferences)
  );
}

function sameOrderedValues<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function mergeUnique(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])];
}

function parseTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
