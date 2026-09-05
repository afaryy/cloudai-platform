import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSupplierEvidenceTelemetryEvent,
  type SupplierEvidenceTelemetryInput
} from "../src/governance/supplierEvidenceTelemetry.js";

const INPUT: SupplierEvidenceTelemetryInput = {
  eventName: "supplier-evidence-published",
  outcome: "succeeded",
  reasonCode: "evidence-published",
  candidateId: "candidate-17878d4c5d338b8b",
  reviewId: "review-c40a78f1d963d84e",
  evidenceRecordId: "evidence-febe039f9cda91c2",
  supplierAssessmentId: "synthetic-managed-ai-service",
  durationMs: 12
};

test("supplier evidence telemetry contains only bounded metadata fields", () => {
  assert.deepEqual(buildSupplierEvidenceTelemetryEvent(INPUT), {
    eventName: "supplier-evidence-published",
    outcome: "succeeded",
    reasonCode: "evidence-published",
    candidateId: "candidate-17878d4c5d338b8b",
    reviewId: "review-c40a78f1d963d84e",
    evidenceRecordId: "evidence-febe039f9cda91c2",
    supplierAssessmentId: "synthetic-managed-ai-service",
    durationMs: 12,
    telemetryGap: false
  });
});

test("supplier evidence telemetry never serializes source, identity, payload, or diagnostic data", () => {
  const serialized = JSON.stringify(buildSupplierEvidenceTelemetryEvent(INPUT));

  for (const prohibited of [
    "sourceReference",
    "contentDigest",
    "principalRef",
    "personalName",
    "rawEvidence",
    "documentContent",
    "prompt",
    "credential",
    "signature",
    "parserStack"
  ]) {
    assert.equal(serialized.includes(prohibited), false);
  }
});

test("supplier evidence telemetry rejects unknown names, reasons, fields, and invalid duration", () => {
  for (const input of [
    { ...INPUT, eventName: "supplier-evidence-arbitrary" },
    { ...INPUT, reasonCode: "provider-error-text" },
    { ...INPUT, rawEvidence: "synthetic-content" },
    { ...INPUT, durationMs: -1 },
    { ...INPUT, telemetryGap: "yes" }
  ]) {
    assert.throws(
      () => buildSupplierEvidenceTelemetryEvent(input as SupplierEvidenceTelemetryInput),
      /supplier-evidence-telemetry-invalid/
    );
  }
});

test("telemetry gap is explicit and defaults only when omitted", () => {
  assert.equal(buildSupplierEvidenceTelemetryEvent(INPUT).telemetryGap, false);
  assert.equal(buildSupplierEvidenceTelemetryEvent({ ...INPUT, telemetryGap: true }).telemetryGap, true);
});
