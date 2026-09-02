import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertMatchesSchema } from "./helpers/schemaAssertion.js";
import { evaluateWorkloadSupplierAdmission } from "../src/governance/supplierWorkloadAdmissionEvaluator.js";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-workload-admission");
const WORKLOAD_SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-workload-readiness");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-workload-admission");
const WORKLOAD_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-workload-readiness");
const SUPPLIER_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-supplier-readiness");
const SCENARIOS = [
  {
    workload: "agent-rag-inference.synthetic.json",
    supplier: "managed-ai-service",
    acceptance: undefined,
    admission: "managed-ai-service.admission.json",
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    workload: "fine-tuning.synthetic.json",
    supplier: "dedicated-ai-capacity",
    acceptance: "dedicated-ai-capacity.acceptance.json",
    admission: "dedicated-ai-capacity.admission.json",
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  },
  {
    workload: "revoked-evidence.synthetic.json",
    supplier: "revoked-evidence",
    acceptance: undefined,
    admission: "revoked-evidence.admission.json",
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  }
] as const;

test("conditional supplier acceptance is bounded and metadata-only", async () => {
  const schema = await readJson("conditional-supplier-acceptance.schema.json", SCHEMA_DIR);
  const acceptance = await readJson("dedicated-ai-capacity.acceptance.json", EXAMPLE_DIR);

  assertMatchesSchema(acceptance, schema);
  assert.equal(acceptance.acceptanceState, "accepted");
  assert.deepEqual(acceptance.acceptedEvidenceFamilies, ["sustainability-location"]);
  assert.equal(acceptance.acceptedByRole, "platform-governance-reviewer");
  assert.ok(acceptance.evidenceReferences.every((value: string) => value.startsWith("https://example.com/")));

  assert.throws(
    () => assertMatchesSchema({ ...acceptance, rawApproval: "not-allowed" }, schema),
    /not documented/
  );
});

test("stored supplier-aware workload admissions replay exactly", async () => {
  const schema = await readJson("workload-supplier-admission-decision.schema.json", SCHEMA_DIR);
  const workloadSchema = await readJson("workload-profile.schema.json", WORKLOAD_SCHEMA_DIR);

  for (const scenario of SCENARIOS) {
    const workload = await readJson(scenario.workload, WORKLOAD_DIR);
    const assessment = await readJson(`${scenario.supplier}.assessment.json`, SUPPLIER_DIR);
    const supplierDecision = await readJson(`${scenario.supplier}.decision.json`, SUPPLIER_DIR);
    const conditionalAcceptance = scenario.acceptance
      ? await readJson(scenario.acceptance, EXAMPLE_DIR)
      : undefined;
    const recordedAdmission = await readJson(scenario.admission, EXAMPLE_DIR);

    assertMatchesSchema(workload, workloadSchema);
    assertMatchesSchema(recordedAdmission, schema);
    assert.ok(Number.isFinite(Date.parse(recordedAdmission.evaluatedAt)));
    assert.deepEqual(
      evaluateWorkloadSupplierAdmission({
        workloadProfile: workload,
        supplierAssessment: assessment,
        recordedSupplierDecision: supplierDecision,
        conditionalAcceptance,
        evaluatedAt: scenario.evaluatedAt
      }),
      recordedAdmission
    );
  }
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}
