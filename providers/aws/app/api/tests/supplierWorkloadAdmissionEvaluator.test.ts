import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  evaluateSupplierReadiness,
  type SupplierAssessment,
  type SupplierAssessmentDecision
} from "../src/governance/supplierReadinessEvaluator.js";
import {
  evaluateWorkloadSupplierAdmission,
  type ConditionalSupplierAcceptance,
  type SupplierAwareWorkloadProfile,
  type WorkloadSupplierAdmissionReasonCode
} from "../src/governance/supplierWorkloadAdmissionEvaluator.js";

const SUPPLIER_EXAMPLES = resolve(process.cwd(), "../../../../shared/examples/ai-supplier-readiness");
const WORKLOAD_EXAMPLES = resolve(process.cwd(), "../../../../shared/examples/ai-workload-readiness");

test("an eligible replayed supplier decision admits the bound workload", async () => {
  const { workload, assessment, decision } = await managedInputs();

  assert.deepEqual(
    evaluateWorkloadSupplierAdmission({
      workloadProfile: workload,
      supplierAssessment: assessment,
      recordedSupplierDecision: decision,
      evaluatedAt: "2026-09-01T00:00:00.000Z"
    }),
    {
      schemaVersion: "1.0",
      admissionDecisionId:
        "synthetic-agent-rag-inference:synthetic-managed-ai-service:2026-08-31T01:00:00.000Z:2026-09-01T00:00:00.000Z",
      workloadId: "synthetic-agent-rag-inference",
      supplierDependencyApplicability: "applicable",
      decision: "admitted",
      reasonCodes: ["supplier-decision-eligible"],
      supplierReasonCodes: ["evidence-complete"],
      evaluatedAt: "2026-09-01T00:00:00.000Z",
      supplierAssessmentId: "synthetic-managed-ai-service",
      supplierDecisionId: "synthetic-managed-ai-service:2026-08-31T01:00:00.000Z",
      evidenceReferences: ["https://example.com/cloudai-platform/supplier-evidence/managed-ai-service"]
    }
  );
});

test("invalid admission time fails closed while preserving the attempted value", async () => {
  const { workload, assessment, decision } = await managedInputs();
  const result = evaluateWorkloadSupplierAdmission({
    workloadProfile: workload,
    supplierAssessment: assessment,
    recordedSupplierDecision: decision,
    evaluatedAt: "not-a-time"
  });

  assertDecision(result, "denied", "admission-time-invalid");
  assert.equal(result.evaluatedAt, "not-a-time");
});

test("a declared not-applicable dependency needs no supplier inputs", () => {
  const workload: SupplierAwareWorkloadProfile = {
    schemaVersion: "1.1",
    workloadId: "synthetic-local-only-workload",
    supplierDependency: {
      applicability: "not-applicable",
      reason: "No material external AI service or dedicated capacity dependency is in scope."
    }
  };

  assert.deepEqual(
    evaluateWorkloadSupplierAdmission({ workloadProfile: workload, evaluatedAt: "2026-09-01T00:00:00.000Z" }),
    {
      schemaVersion: "1.0",
      admissionDecisionId: "synthetic-local-only-workload:not-applicable:2026-09-01T00:00:00.000Z",
      workloadId: "synthetic-local-only-workload",
      supplierDependencyApplicability: "not-applicable",
      decision: "admitted",
      reasonCodes: ["supplier-dependency-not-applicable"],
      supplierReasonCodes: [],
      evaluatedAt: "2026-09-01T00:00:00.000Z",
      evidenceReferences: []
    }
  );
});

test("missing applicable supplier inputs fail closed in precedence order", async () => {
  const { workload, assessment } = await managedInputs();

  assertDecision(
    evaluateWorkloadSupplierAdmission({ workloadProfile: workload, evaluatedAt: "2026-09-01T00:00:00.000Z" }),
    "denied",
    "supplier-assessment-missing"
  );
  assertDecision(
    evaluateWorkloadSupplierAdmission({
      workloadProfile: workload,
      supplierAssessment: assessment,
      evaluatedAt: "2026-09-01T00:00:00.000Z"
    }),
    "denied",
    "supplier-decision-missing"
  );
});

test("assessment, decision, class, and scope references must correlate exactly", async () => {
  const { workload, assessment, decision } = await managedInputs();
  const dependency = applicableDependency(workload);
  const cases = [
    { workload, assessment: { ...assessment, assessmentId: "synthetic-other-assessment" }, decision },
    { workload, assessment, decision: { ...decision, decisionId: "synthetic-other-decision" } },
    {
      workload: {
        ...workload,
        supplierDependency: { ...dependency, expectedSupplierClass: "dedicated-ai-capacity" as const }
      },
      assessment,
      decision
    },
    {
      workload: {
        ...workload,
        supplierDependency: { ...dependency, expectedScope: "Synthetic mismatched scope" }
      },
      assessment,
      decision
    }
  ];

  for (const current of cases) {
    assertDecision(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: current.workload,
        supplierAssessment: current.assessment,
        recordedSupplierDecision: current.decision,
        evaluatedAt: "2026-09-01T00:00:00.000Z"
      }),
      "denied",
      "supplier-reference-mismatch"
    );
  }
});

test("a modified recorded supplier outcome cannot pass replay", async () => {
  const { workload, assessment, decision } = await managedInputs();
  const modified = {
    ...decision,
    decision: "conditional" as const,
    reasonCodes: ["bounded-remediation-required" as const]
  };

  assertDecision(
    evaluateWorkloadSupplierAdmission({
      workloadProfile: workload,
      supplierAssessment: assessment,
      recordedSupplierDecision: modified,
      evaluatedAt: "2026-09-01T00:00:00.000Z"
    }),
    "denied",
    "supplier-decision-replay-mismatch"
  );
});

test("current revoked supplier evidence denies the workload with the supplier reason", async () => {
  const workload = await readJson<SupplierAwareWorkloadProfile>("agent-rag-inference.synthetic.json", WORKLOAD_EXAMPLES);
  const baseDependency = applicableDependency(workload);
  const assessment = await readJson<SupplierAssessment>("revoked-evidence.assessment.json", SUPPLIER_EXAMPLES);
  const decision = await readJson<SupplierAssessmentDecision>("revoked-evidence.decision.json", SUPPLIER_EXAMPLES);
  const revokedWorkload: SupplierAwareWorkloadProfile = {
    ...workload,
    supplierDependency: {
      ...baseDependency,
      assessmentId: assessment.assessmentId,
      decisionId: decision.decisionId,
      expectedScope: assessment.scope
    }
  };

  const result = evaluateWorkloadSupplierAdmission({
    workloadProfile: revokedWorkload,
    supplierAssessment: assessment,
    recordedSupplierDecision: decision,
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  });

  assertDecision(result, "denied", "supplier-decision-not-eligible");
  assert.deepEqual(result.supplierReasonCodes, ["evidence-revoked"]);
});

test("eligible supplier paths reject conditional acceptance data", async () => {
  const { workload, assessment, decision } = await managedInputs();
  const dependency = applicableDependency(workload);
  const acceptance = syntheticAcceptance(decision);

  for (const current of [
    { workload: { ...workload, supplierDependency: { ...dependency, conditionalAcceptanceId: acceptance.acceptanceId } } },
    { workload, conditionalAcceptance: acceptance }
  ]) {
    assertDecision(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: current.workload,
        supplierAssessment: assessment,
        recordedSupplierDecision: decision,
        conditionalAcceptance: current.conditionalAcceptance,
        evaluatedAt: "2026-09-01T00:00:00.000Z"
      }),
      "denied",
      "conditional-acceptance-unexpected"
    );
  }
});

test("a current conditional decision is admitted with exact bounded acceptance", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const result = evaluateWorkloadSupplierAdmission({
    workloadProfile: workload,
    supplierAssessment: assessment,
    recordedSupplierDecision: decision,
    conditionalAcceptance: acceptance,
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  });

  assertDecision(result, "admitted", "conditional-supplier-decision-accepted");
  assert.deepEqual(result.supplierReasonCodes, ["bounded-remediation-required"]);
  assert.equal(
    "conditionalAcceptanceId" in result ? result.conditionalAcceptanceId : undefined,
    "synthetic-dedicated-ai-capacity:2026-08-31T01:00:00.000Z:conditional-acceptance"
  );
  assert.deepEqual(result.evidenceReferences, [
    "https://example.com/cloudai-platform/supplier-evidence/dedicated-ai-capacity",
    "https://example.com/cloudai-platform/supplier-acceptance/dedicated-ai-capacity"
  ]);
});

test("a conditional dependency requires both an acceptance ID and acceptance object", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const dependency = applicableDependency(workload);
  const { conditionalAcceptanceId: _omitted, ...withoutAcceptanceId } = dependency;

  for (const current of [
    { workload, conditionalAcceptance: undefined },
    {
      workload: { ...workload, supplierDependency: withoutAcceptanceId },
      conditionalAcceptance: acceptance
    }
  ]) {
    assertDecision(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: current.workload,
        supplierAssessment: assessment,
        recordedSupplierDecision: decision,
        conditionalAcceptance: current.conditionalAcceptance,
        evaluatedAt: "2026-09-01T00:00:00.000Z"
      }),
      "denied",
      "conditional-acceptance-missing"
    );
  }
});

test("conditional acceptance identity and evidence-family coverage must match exactly", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const cases: ConditionalSupplierAcceptance[] = [
    { ...acceptance, acceptanceId: `${acceptance.acceptanceId}-other` },
    { ...acceptance, assessmentId: "synthetic-other-assessment" },
    { ...acceptance, decisionId: "synthetic-other-decision" },
    { ...acceptance, acceptedEvidenceFamilies: [] },
    { ...acceptance, acceptedEvidenceFamilies: ["sustainability-location", "operations-resilience"] }
  ];

  for (const current of cases) {
    assertDecision(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: workload,
        supplierAssessment: assessment,
        recordedSupplierDecision: decision,
        conditionalAcceptance: current,
        evaluatedAt: "2026-09-01T00:00:00.000Z"
      }),
      "denied",
      "conditional-acceptance-mismatch"
    );
  }
});

test("conditional acceptance timestamps must be parseable and internally ordered", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const cases: ConditionalSupplierAcceptance[] = [
    { ...acceptance, acceptedAt: "not-a-time" },
    { ...acceptance, validUntil: "not-a-time" },
    { ...acceptance, acceptedAt: "2026-08-31T00:30:00.000Z" },
    { ...acceptance, acceptedAt: "2026-09-01T00:00:01.000Z" },
    {
      ...acceptance,
      acceptedAt: "2026-09-01T00:00:00.000Z",
      validUntil: "2026-08-31T23:59:59.000Z"
    }
  ];

  for (const current of cases) {
    assertDecision(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: workload,
        supplierAssessment: assessment,
        recordedSupplierDecision: decision,
        conditionalAcceptance: current,
        evaluatedAt: "2026-09-01T00:00:00.000Z"
      }),
      "denied",
      "conditional-acceptance-boundary-invalid"
    );
  }
});

test("conditional acceptance cannot extend beyond review or remediation boundaries", async () => {
  const base = await dedicatedInputs();
  const reviewBoundAssessment = {
    ...base.assessment,
    reviewBy: "2026-10-10T00:00:00.000Z"
  };
  const remediationBoundAssessment = {
    ...base.assessment,
    reviewBy: "2026-10-31T00:00:00.000Z"
  };
  const cases = [
    {
      assessment: reviewBoundAssessment,
      decision: evaluateSupplierReadiness(reviewBoundAssessment, base.decision.evaluatedAt),
      acceptance: { ...base.acceptance, validUntil: "2026-10-11T00:00:00.000Z" }
    },
    {
      assessment: remediationBoundAssessment,
      decision: evaluateSupplierReadiness(remediationBoundAssessment, base.decision.evaluatedAt),
      acceptance: { ...base.acceptance, validUntil: "2026-10-16T00:00:00.000Z" }
    }
  ];

  for (const current of cases) {
    assertDecision(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: base.workload,
        supplierAssessment: current.assessment,
        recordedSupplierDecision: current.decision,
        conditionalAcceptance: current.acceptance,
        evaluatedAt: "2026-09-01T00:00:00.000Z"
      }),
      "denied",
      "conditional-acceptance-boundary-invalid"
    );
  }
});

test("revocation takes precedence over acceptance expiry", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const result = evaluateWorkloadSupplierAdmission({
    workloadProfile: workload,
    supplierAssessment: assessment,
    recordedSupplierDecision: decision,
    conditionalAcceptance: {
      ...acceptance,
      acceptanceState: "revoked",
      validUntil: "2026-08-31T23:00:00.000Z"
    },
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  });

  assertDecision(result, "denied", "conditional-acceptance-revoked");
});

test("an expired conditional acceptance denies an otherwise-current supplier decision", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const result = evaluateWorkloadSupplierAdmission({
    workloadProfile: workload,
    supplierAssessment: assessment,
    recordedSupplierDecision: decision,
    conditionalAcceptance: { ...acceptance, validUntil: "2026-08-31T23:00:00.000Z" },
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  });

  assertDecision(result, "denied", "conditional-acceptance-expired");
});

test("equality at every conditional time boundary remains valid", async () => {
  const { workload, assessment, decision, acceptance } = await dedicatedInputs();
  const boundaryAcceptance = {
    ...acceptance,
    acceptedAt: decision.evaluatedAt,
    validUntil: "2026-10-15T00:00:00.000Z"
  };
  const result = evaluateWorkloadSupplierAdmission({
    workloadProfile: workload,
    supplierAssessment: assessment,
    recordedSupplierDecision: decision,
    conditionalAcceptance: boundaryAcceptance,
    evaluatedAt: "2026-10-15T00:00:00.000Z"
  });

  assertDecision(result, "admitted", "conditional-supplier-decision-accepted");
});

async function managedInputs(): Promise<{
  workload: SupplierAwareWorkloadProfile;
  assessment: SupplierAssessment;
  decision: SupplierAssessmentDecision;
}> {
  return {
    workload: await readJson("agent-rag-inference.synthetic.json", WORKLOAD_EXAMPLES),
    assessment: await readJson("managed-ai-service.assessment.json", SUPPLIER_EXAMPLES),
    decision: await readJson("managed-ai-service.decision.json", SUPPLIER_EXAMPLES)
  };
}

async function dedicatedInputs(): Promise<{
  workload: SupplierAwareWorkloadProfile;
  assessment: SupplierAssessment;
  decision: SupplierAssessmentDecision;
  acceptance: ConditionalSupplierAcceptance;
}> {
  return {
    workload: await readJson("fine-tuning.synthetic.json", WORKLOAD_EXAMPLES),
    assessment: await readJson("dedicated-ai-capacity.assessment.json", SUPPLIER_EXAMPLES),
    decision: await readJson("dedicated-ai-capacity.decision.json", SUPPLIER_EXAMPLES),
    acceptance: await readJson(
      "dedicated-ai-capacity.acceptance.json",
      resolve(process.cwd(), "../../../../shared/examples/ai-workload-admission")
    )
  };
}

function applicableDependency(workload: SupplierAwareWorkloadProfile) {
  assert.equal(workload.supplierDependency.applicability, "applicable");
  return workload.supplierDependency;
}

function syntheticAcceptance(decision: SupplierAssessmentDecision): ConditionalSupplierAcceptance {
  return {
    schemaVersion: "1.0",
    acceptanceId: `${decision.decisionId}:conditional-acceptance`,
    assessmentId: decision.assessmentId,
    decisionId: decision.decisionId,
    acceptanceState: "accepted",
    acceptedEvidenceFamilies: ["sustainability-location"],
    acceptedByRole: "platform-governance-reviewer",
    acceptedAt: "2026-08-31T02:00:00.000Z",
    validUntil: "2026-10-15T00:00:00.000Z",
    evidenceReferences: ["https://example.com/cloudai-platform/supplier-acceptance/synthetic"]
  };
}

function assertDecision(
  result: { decision: string; reasonCodes: WorkloadSupplierAdmissionReasonCode[] },
  decision: "admitted" | "denied",
  reasonCode: WorkloadSupplierAdmissionReasonCode
): void {
  assert.equal(result.decision, decision);
  assert.deepEqual(result.reasonCodes, [reasonCode]);
}

async function readJson<T>(fileName: string, directory: string): Promise<T> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8")) as T;
}
