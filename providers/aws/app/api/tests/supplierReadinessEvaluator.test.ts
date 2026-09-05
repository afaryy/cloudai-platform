import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSupplierReadiness,
  type SupplierAssessment,
  type SupplierEvidenceFamily,
  type SupplierEvidenceFamilyName,
  type SupplierExternalRequirement
} from "../src/governance/supplierReadinessEvaluator.js";

const BASE_ASSESSMENT: SupplierAssessment = {
  schemaVersion: "1.0",
  assessmentId: "synthetic-managed-ai-service",
  supplierClass: "managed-ai-service",
  scope: "Synthetic managed model and retrieval service boundary",
  assessedAt: "2026-08-31T00:00:00.000Z",
  reviewBy: "2026-11-30T00:00:00.000Z",
  evidenceFamilies: [
    evidence("security-privacy", "complete", true),
    evidence("ai-governance", "complete", true),
    evidence("risk-compliance", "complete", true),
    evidence("data-model-tool-lifecycle", "complete", true),
    evidence("operations-resilience", "complete", true),
    evidence("commercial-exit", "complete", true),
    evidence("sustainability-location", "not-applicable", false, "not-applicable")
  ],
  externalRequirements: [
    requirement("synthetic-current-security-control", "current-requirement", "met"),
    requirement("synthetic-future-infrastructure-standard", "planned-legislation-or-standard", "tracking")
  ],
  evidenceReferences: ["https://example.com/cloudai-platform/supplier-evidence/managed-ai-service"],
  reassessmentTriggers: [
    "supplier-service-change",
    "model-or-tool-change",
    "data-or-subprocessor-change",
    "location-or-capacity-change",
    "control-or-assurance-change",
    "contract-or-regulatory-change"
  ]
};

test("complete applicable evidence produces an eligible decision", () => {
  const result = evaluateSupplierReadiness(BASE_ASSESSMENT, "2026-08-31T01:00:00.000Z");

  assert.deepEqual(result, {
    schemaVersion: "1.1",
    decisionId: "synthetic-managed-ai-service:2026-08-31T01:00:00.000Z",
    assessmentId: "synthetic-managed-ai-service",
    scope: "Synthetic managed model and retrieval service boundary",
    decision: "eligible",
    reasonCodes: ["evidence-complete"],
    evaluatedAt: "2026-08-31T01:00:00.000Z",
    reviewBy: "2026-11-30T00:00:00.000Z",
    evidenceReferences: ["https://example.com/cloudai-platform/supplier-evidence/managed-ai-service"]
  });
});

test("critical missing evidence fails closed", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.assessmentId = "synthetic-missing-critical-evidence";
  assessment.evidenceFamilies[0] = evidence("security-privacy", "missing", true);

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["critical-evidence-missing"]);
});

test("non-critical missing evidence cannot be treated as eligible", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[5] = evidence("commercial-exit", "missing", false);

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["evidence-missing"]);
});

test("bounded conditional evidence produces a conditional decision", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.assessmentId = "synthetic-dedicated-ai-capacity";
  assessment.supplierClass = "dedicated-ai-capacity";
  assessment.evidenceFamilies[6] = {
    ...evidence("sustainability-location", "conditional", true),
    remediation: {
      owner: "platform-sustainability-reviewer",
      dueAt: "2026-10-15T00:00:00.000Z",
      compensatingControls: ["capacity-commitment-remains-blocked"]
    }
  };

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "conditional");
  assert.deepEqual(result.reasonCodes, ["bounded-remediation-required"]);
});

test("conditional evidence without a complete remediation boundary fails closed", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[4] = evidence("operations-resilience", "conditional", true);

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["conditional-boundary-incomplete"]);
});

test("an unmet current requirement fails closed while future tracking does not", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.externalRequirements[0].assessment = "tracking";

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["current-requirement-unmet"]);
});

test("a missing required evidence family fails closed", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies = assessment.evidenceFamilies.filter(
    (item) => item.family !== "operations-resilience"
  );

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["required-evidence-family-missing"]);
});

test("an applicability and status conflict fails closed", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[6] = evidence(
    "sustainability-location",
    "complete",
    false,
    "not-applicable"
  );

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["evidence-applicability-conflict"]);
});

test("an assessment cannot remain eligible after its review boundary", () => {
  const result = evaluateSupplierReadiness(BASE_ASSESSMENT, "2026-12-01T00:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["assessment-review-expired"]);
});

test("expired applicable evidence fails closed", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[0].validUntil = "2026-08-30T23:59:59.000Z";

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["evidence-expired"]);
});

test("revoked applicable evidence fails closed before an eligible decision", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[1].evidenceState = "revoked";

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["evidence-revoked"]);
});

test("expired conditional remediation cannot remain conditional", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[6] = {
    ...evidence("sustainability-location", "conditional", true),
    remediation: {
      owner: "platform-sustainability-reviewer",
      dueAt: "2026-08-31T00:30:00.000Z",
      compensatingControls: ["capacity-commitment-remains-blocked"]
    }
  };

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["conditional-remediation-expired"]);
});

test("invalid temporal metadata fails closed instead of bypassing comparison", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  assessment.evidenceFamilies[2].validUntil = "not-a-date";

  const result = evaluateSupplierReadiness(assessment, "2026-08-31T01:00:00.000Z");

  assert.equal(result.decision, "not-eligible");
  assert.deepEqual(result.reasonCodes, ["time-boundary-invalid"]);
});

test("an exact review, evidence, and remediation boundary remains valid", () => {
  const assessment = structuredClone(BASE_ASSESSMENT);
  const boundary = "2026-08-31T01:00:00.000Z";
  assessment.reviewBy = boundary;
  assessment.evidenceFamilies = assessment.evidenceFamilies.map((item) => ({
    ...item,
    validUntil: boundary
  }));
  assessment.evidenceFamilies[6] = {
    ...evidence("sustainability-location", "conditional", true),
    validUntil: boundary,
    remediation: {
      owner: "platform-sustainability-reviewer",
      dueAt: boundary,
      compensatingControls: ["capacity-commitment-remains-blocked"]
    }
  };

  const result = evaluateSupplierReadiness(assessment, boundary);

  assert.equal(result.decision, "conditional");
  assert.deepEqual(result.reasonCodes, ["bounded-remediation-required"]);
});

function evidence(
  family: SupplierEvidenceFamilyName,
  status: "complete" | "conditional" | "missing" | "not-applicable",
  critical: boolean,
  applicability: "applicable" | "not-applicable" = "applicable"
): SupplierEvidenceFamily {
  return {
    family,
    applicability,
    status,
    critical,
    summary: `Synthetic ${family} evidence state: ${status}`,
    evidenceState: "current",
    observedAt: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-12-31T00:00:00.000Z"
  };
}

function requirement(
  requirementId: string,
  status: "current-requirement" | "announced-policy-direction" | "planned-legislation-or-standard" | "watch-item",
  assessment: "met" | "gap" | "tracking" | "not-applicable"
): SupplierExternalRequirement {
  return {
    requirementId,
    status,
    assessment,
    owner: "platform-governance-reviewer",
    reviewBy: "2026-10-31T00:00:00.000Z"
  };
}
