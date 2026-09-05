import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  adaptSyntheticEvidenceManifest,
  candidateIdentity,
  deterministicIdentity
} from "../src/governance/supplierEvidenceAdapter.js";
import type {
  EvidenceCandidate,
  EvidenceIntakeResult,
  SyntheticEvidenceManifest
} from "../src/governance/supplierEvidenceTypes.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-supplier-evidence");
const MANIFEST = readFixture<SyntheticEvidenceManifest>("managed-service.manifest.json");
const EXPECTED_CANDIDATE = readFixture<EvidenceCandidate>("managed-service.candidate.json");

test("a valid synthetic manifest produces the documented immutable candidate", () => {
  const result = adaptSyntheticEvidenceManifest(structuredClone(MANIFEST));

  assert.deepEqual(result, { outcome: "accepted", candidate: EXPECTED_CANDIDATE });
  if (result.outcome !== "accepted") assert.fail("expected accepted candidate");
  assert.equal(Object.isFrozen(result.candidate), true);
  assert.equal(Object.isFrozen(result.candidate.reasonCodes), true);
});

test("identical canonical manifests return the same candidate", () => {
  assert.deepEqual(
    adaptSyntheticEvidenceManifest(structuredClone(MANIFEST)),
    adaptSyntheticEvidenceManifest(structuredClone(MANIFEST))
  );
});

test("a changed source version produces a different candidate identity", () => {
  const first = accepted(MANIFEST);
  const second = accepted({ ...MANIFEST, sourceVersion: "v2" });

  assert.notEqual(first.candidateId, second.candidateId);
});

test("submission time does not alter candidate identity", () => {
  const first = accepted(MANIFEST);
  const second = accepted({ ...MANIFEST, submittedAt: "2026-09-05T00:30:00.000Z" });

  assert.equal(first.candidateId, second.candidateId);
});

test("candidate identity uses unambiguous length-prefixed canonical values", () => {
  assert.notEqual(deterministicIdentity("candidate", ["ab", "c"]), deterministicIdentity("candidate", ["a", "bc"]));
  assert.equal(
    candidateIdentity(MANIFEST),
    "candidate-17878d4c5d338b8b"
  );
});

test("intake rejects malformed manifests before semantic controls", () => {
  const cases: unknown[] = [
    null,
    [],
    { ...MANIFEST, unknownField: "synthetic" },
    { ...MANIFEST, schemaVersion: "2.0" },
    { ...MANIFEST, contentDigest: "sha256:not-a-digest" },
    { ...MANIFEST, evidenceFamily: "unknown-family" }
  ];

  for (const value of cases) {
    assertRejected(adaptSyntheticEvidenceManifest(value), "manifest-schema-invalid");
  }
});

test("intake applies authenticity and redaction fail-closed precedence", () => {
  assertRejected(
    adaptSyntheticEvidenceManifest({ ...MANIFEST, authenticityState: "failed", redactionState: "failed" }),
    "authenticity-failed"
  );
  assertRejected(
    adaptSyntheticEvidenceManifest({ ...MANIFEST, authenticityState: "unknown", redactionState: "failed" }),
    "authenticity-unknown"
  );
  assertRejected(
    adaptSyntheticEvidenceManifest({ ...MANIFEST, redactionState: "failed" }),
    "redaction-failed"
  );
});

test("intake rejects invalid or inverted time boundaries", () => {
  for (const value of [
    { ...MANIFEST, observedAt: "not-a-time" },
    { ...MANIFEST, validUntil: "2026-08-31T23:59:59.000Z" },
    { ...MANIFEST, submittedAt: "2026-08-31T23:59:59.000Z" }
  ]) {
    assertRejected(adaptSyntheticEvidenceManifest(value), "time-boundary-invalid");
  }
});

test("rejected intake returns one bounded reason without source diagnostics", () => {
  const result = adaptSyntheticEvidenceManifest({
    ...MANIFEST,
    sourceReference: "https://example.com/private-looking-source",
    contentDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    authenticityState: "failed"
  });

  assertRejected(result, "authenticity-failed");
  const serialized = JSON.stringify(result);
  for (const prohibited of [
    "private-looking-source",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "parser",
    "stack",
    "Error"
  ]) {
    assert.equal(serialized.includes(prohibited), false);
  }
});

function accepted(manifest: SyntheticEvidenceManifest): EvidenceCandidate {
  const result = adaptSyntheticEvidenceManifest(manifest);
  if (result.outcome !== "accepted") assert.fail(`expected accepted candidate, got ${result.reasonCodes[0]}`);
  return result.candidate;
}

function assertRejected(
  result: EvidenceIntakeResult,
  reasonCode: Extract<EvidenceIntakeResult, { outcome: "rejected" }>['reasonCodes'][number]
): void {
  assert.deepEqual(result, { outcome: "rejected", reasonCodes: [reasonCode] });
}

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(EXAMPLE_DIR, fileName), "utf8")) as T;
}
