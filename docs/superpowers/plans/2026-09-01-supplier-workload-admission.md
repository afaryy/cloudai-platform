# Supplier-Aware Workload Admission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, metadata-only workload admission gate that replays and re-evaluates supplier readiness, requires bounded human acceptance for conditional dependencies, and records workload-to-supplier evidence correlation.

**Architecture:** Extend the existing supplier decision and workload profile contracts with stable identities and explicit dependency references. A new provider-neutral evaluator consumes complete synthetic contract objects, calls the existing supplier evaluator for replay and admission-time evaluation, and emits a closed fail-closed admission decision. Stored scenarios and the existing control-plane evidence map prove correlation without calling a supplier, cloud API, scheduler, or runtime.

**Tech Stack:** TypeScript 5.8, Node.js test runner, JSON Schema 2020-12, JSON fixtures, Markdown, pnpm 11.7.0

**Spec:** `docs/superpowers/specs/2026-09-01-supplier-workload-admission-design.md`

## Global Constraints

- Use explicit caller-supplied timestamps only; never read the wall clock.
- Call `evaluateSupplierReadiness`; do not duplicate its freshness, revocation, expiry, or readiness rules.
- Keep all examples synthetic, metadata-only, provider-neutral, and free of supplier names, accounts, contracts, assurance payloads, prompts, credentials, or personal approver identities.
- `admitted` records only a contract decision; it does not grant scheduler, Kubernetes, GPU, provider, procurement, or runtime authority.
- Missing, mismatched, stale, revoked, expired, replay-inconsistent, or `not-eligible` dependencies fail closed.
- A current `conditional` dependency requires a separate, bounded acceptance record tied to the recorded decision and exact conditional evidence families.
- Preserve the existing five P6d evidence lanes; add workload dependency correlation beside them.
- Do not add runtime dependencies, provider calls, network access, cloud resources, persistent storage, or autonomous approval.
- Use `corepack pnpm@11.7.0`; do not change the package-manager version.
- Use the existing branch `feature/yy-64-supplier-workload-admission`; do not use a `codex/` branch prefix.

## File Structure

### Existing files to modify

- `providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts` — versioned supplier decision identity and scope.
- `providers/aws/app/api/tests/supplierReadinessEvaluator.test.ts` — supplier decision 1.1 unit expectations.
- `providers/aws/app/api/tests/supplierReadinessContracts.test.ts` — supplier schema and six-fixture replay checks.
- `shared/schemas/ai-supplier-readiness/supplier-readiness-decision.schema.json` — supplier decision 1.1 contract.
- `shared/examples/ai-supplier-readiness/*.decision.json` — six replayable supplier decisions.
- `shared/schemas/ai-workload-readiness/workload-profile.schema.json` — workload profile 1.1 and closed supplier dependency union.
- `shared/examples/ai-workload-readiness/*.synthetic.json` — four current workload profiles plus one denied-dependency scenario profile.
- `providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts` — workload dependency schema and fixture checks.
- `shared/schemas/control-plane-evidence/evidence-map.schema.json` — workload dependency correlation.
- `shared/examples/control-plane-evidence/evidence-map.mock.json` — one applicable workload correlation.
- `providers/aws/app/api/tests/controlPlaneEvidenceContracts.test.ts` — correlation and evidence-path checks.
- `docs/practices/ai-workload-operating-contract.md` — supplier-aware admission lifecycle.
- `docs/practices/ai-supplier-readiness-gate.md` — downstream workload-admission consumer.
- `docs/evidence/control-plane-evidence-map.md` — correlation evidence semantics.
- `docs/practices/current-status.md` and `README.md` — exact implemented and deferred boundaries.

### New files to create

- `providers/aws/app/api/src/governance/supplierWorkloadAdmissionEvaluator.ts` — admission types and deterministic evaluator.
- `providers/aws/app/api/tests/supplierWorkloadAdmissionEvaluator.test.ts` — unit-level precedence and boundary tests.
- `providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts` — schema validation and three stored replay scenarios.
- `providers/aws/app/api/tests/helpers/schemaAssertion.ts` — focused JSON Schema subset assertion used by the new workload-admission contract tests.
- `shared/schemas/ai-workload-admission/conditional-supplier-acceptance.schema.json` — metadata-only human acceptance contract.
- `shared/schemas/ai-workload-admission/workload-supplier-admission-decision.schema.json` — closed applicable/not-applicable decision union.
- `shared/examples/ai-workload-admission/dedicated-ai-capacity.acceptance.json` — bounded synthetic acceptance.
- `shared/examples/ai-workload-admission/managed-ai-service.admission.json` — eligible managed-service result.
- `shared/examples/ai-workload-admission/dedicated-ai-capacity.admission.json` — accepted conditional result.
- `shared/examples/ai-workload-admission/revoked-evidence.admission.json` — denied dependency result.
- `/Users/yvonne/Documents/projects/cloudai-platform/_private/docs/notes/yy-64-supplier-aware-workload-admission-2026-09-01.md` — private implementation and debugging record; never stage this file.

---

### Task 1: Upgrade supplier decisions to version 1.1

**Files:**
- Modify: `providers/aws/app/api/tests/supplierReadinessEvaluator.test.ts`
- Modify: `providers/aws/app/api/tests/supplierReadinessContracts.test.ts`
- Modify: `providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts`
- Modify: `shared/schemas/ai-supplier-readiness/supplier-readiness-decision.schema.json`
- Modify: all six `shared/examples/ai-supplier-readiness/*.decision.json`

**Interfaces:**
- Consumes: `SupplierAssessment.assessmentId`, `SupplierAssessment.scope`, and explicit `evaluatedAt`.
- Produces: `SupplierAssessmentDecision` version `1.1` with deterministic `decisionId` and copied `scope` for Tasks 2-7.

- [ ] **Step 1: Write failing decision-identity unit expectations**

Change the eligible expectation in `supplierReadinessEvaluator.test.ts` to:

```ts
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
```

Add contract assertions:

```ts
assert.equal(decisionSchema.properties.schemaVersion.const, "1.1");
assert.ok(decisionSchema.required.includes("decisionId"));
assert.ok(decisionSchema.required.includes("scope"));
assert.equal(decision.decisionId, `${decision.assessmentId}:${decision.evaluatedAt}`);
assert.equal(decision.scope, assessment.scope);
```

- [ ] **Step 2: Install the pinned API dependencies**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 install --frozen-lockfile
```

Expected: install succeeds without changing `package.json` or `pnpm-lock.yaml`.

- [ ] **Step 3: Run tests and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run test
```

Expected: FAIL because the evaluator and stored decisions still return version `1.0` without `decisionId` or `scope`.

- [ ] **Step 4: Implement supplier decision 1.1**

Update the TypeScript interface and decision constructor:

```ts
export interface SupplierAssessmentDecision {
  schemaVersion: "1.1";
  decisionId: string;
  assessmentId: string;
  scope: string;
  decision: SupplierReadinessDecision;
  reasonCodes: SupplierReadinessReasonCode[];
  evaluatedAt: string;
  reviewBy: string;
  evidenceReferences: string[];
}

return {
  schemaVersion: "1.1",
  decisionId: `${assessment.assessmentId}:${evaluatedAt}`,
  assessmentId: assessment.assessmentId,
  scope: assessment.scope,
  decision: outcome,
  reasonCodes: [reasonCode],
  evaluatedAt,
  reviewBy: assessment.reviewBy,
  evidenceReferences: [...assessment.evidenceReferences]
};
```

Update the decision schema to require the same fields, using:

```json
"schemaVersion": { "const": "1.1" },
"decisionId": { "type": "string", "minLength": 1, "maxLength": 180 },
"scope": { "type": "string", "minLength": 1, "maxLength": 240 }
```

Regenerate each decision fixture by adding `decisionId`, copying the exact assessment `scope`, and changing only `schemaVersion` from `1.0` to `1.1`. Do not alter its recorded outcome, reason code, evaluation time, review boundary, or evidence references.

- [ ] **Step 5: Run supplier tests and verify GREEN**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierReadinessEvaluator.test.js dist/tests/supplierReadinessContracts.test.js
```

Expected: all supplier evaluator, schema, and six-fixture replay tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add providers/aws/app/api/src/governance/supplierReadinessEvaluator.ts providers/aws/app/api/tests/supplierReadinessEvaluator.test.ts providers/aws/app/api/tests/supplierReadinessContracts.test.ts shared/schemas/ai-supplier-readiness/supplier-readiness-decision.schema.json shared/examples/ai-supplier-readiness
git commit -m "feat: version supplier readiness decisions"
```

---

### Task 2: Add the closed workload supplier dependency contract

**Files:**
- Create: `providers/aws/app/api/tests/helpers/schemaAssertion.ts`
- Modify: `providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts`
- Modify: `shared/schemas/ai-workload-readiness/workload-profile.schema.json`
- Modify: four current `shared/examples/ai-workload-readiness/*.synthetic.json` fixtures

**Interfaces:**
- Consumes: supplier decision `decisionId`, assessment ID, supplier class, and copied scope from Task 1.
- Produces: workload profile `1.1` with a closed `supplierDependency` discriminated union for the admission evaluator.

- [ ] **Step 1: Write failing workload dependency contract tests**

Require the new field and version:

```ts
assert.equal(schema.properties.schemaVersion.const, "1.1");
assert.ok(schema.required.includes("supplierDependency"));
assert.equal(schema.properties.supplierDependency.oneOf.length, 2);
```

Validate all four fixtures against the full schema, then assert:

```ts
assert.equal(agent.supplierDependency.assessmentId, "synthetic-managed-ai-service");
assert.equal(batch.supplierDependency.assessmentId, "synthetic-managed-ai-service");
assert.equal(fineTuning.supplierDependency.assessmentId, "synthetic-dedicated-ai-capacity");
assert.equal(distributed.supplierDependency.assessmentId, "synthetic-dedicated-ai-capacity");
assert.equal(
  fineTuning.supplierDependency.conditionalAcceptanceId,
  "synthetic-dedicated-ai-capacity:2026-08-31T01:00:00.000Z:conditional-acceptance"
);
```

Add negative schema checks for an applicable dependency without `decisionId` and a not-applicable dependency carrying `assessmentId`.

Create `tests/helpers/schemaAssertion.ts` with this focused validator:

```ts
import assert from "node:assert/strict";

export function assertMatchesSchema(value: unknown, schema: any, path = "$"): void {
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((candidate: any) => matchesSchema(value, candidate, path));
    assert.equal(matches.length, 1, `${path} must match exactly one documented variant`);
  }

  if ("const" in schema) assert.deepEqual(value, schema.const, `${path} must match the documented constant`);
  if (Array.isArray(schema.enum)) assert.ok(schema.enum.includes(value), `${path} must be documented`);

  if (schema.type === "object" || schema.properties) {
    assert.ok(isRecord(value), `${path} must be an object`);
    for (const key of schema.required ?? []) assert.ok(key in value, `${path} missing required field: ${key}`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) assert.ok(key in (schema.properties ?? {}), `${path}.${key} is not documented`);
    }
    for (const [key, childSchema] of Object.entries<any>(schema.properties ?? {})) {
      if (key in value) assertMatchesSchema(value[key], childSchema, `${path}.${key}`);
    }
    return;
  }

  if (schema.type === "array" || schema.items) {
    assert.ok(Array.isArray(value), `${path} must be an array`);
    if (typeof schema.minItems === "number") assert.ok(value.length >= schema.minItems, `${path} has too few items`);
    if (typeof schema.maxItems === "number") assert.ok(value.length <= schema.maxItems, `${path} has too many items`);
    if (schema.uniqueItems) {
      assert.equal(new Set(value.map((item) => JSON.stringify(item))).size, value.length, `${path} items must be unique`);
    }
    for (const [index, item] of value.entries()) assertMatchesSchema(item, schema.items ?? {}, `${path}[${index}]`);
    return;
  }

  if (schema.type === "string") {
    assert.ok(typeof value === "string", `${path} must be a string`);
    const stringValue = value as string;
    if (typeof schema.minLength === "number") assert.ok(stringValue.length >= schema.minLength, `${path} is too short`);
    if (typeof schema.maxLength === "number") assert.ok(stringValue.length <= schema.maxLength, `${path} is too long`);
    if (typeof schema.pattern === "string") assert.match(stringValue, new RegExp(schema.pattern), `${path} has an invalid format`);
    if (schema.format === "date-time") assert.ok(Number.isFinite(Date.parse(stringValue)), `${path} must be a date-time`);
    if (schema.format === "uri") assert.doesNotThrow(() => new URL(stringValue), `${path} must be a URI`);
  }

  if (schema.type === "boolean") assert.equal(typeof value, "boolean", `${path} must be a boolean`);
  if (schema.type === "integer" || schema.type === "number") {
    assert.ok(typeof value === "number", `${path} must be a number`);
    const numberValue = value as number;
    if (schema.type === "integer") assert.ok(Number.isInteger(numberValue), `${path} must be an integer`);
    if (typeof schema.minimum === "number") assert.ok(numberValue >= schema.minimum, `${path} is below minimum`);
    if (typeof schema.maximum === "number") assert.ok(numberValue <= schema.maximum, `${path} is above maximum`);
  }
}

function matchesSchema(value: unknown, schema: any, path: string): boolean {
  try {
    assertMatchesSchema(value, schema, path);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

Import it in the workload test with:

```ts
import { assertMatchesSchema } from "./helpers/schemaAssertion.js";
```

- [ ] **Step 2: Run the workload contract test and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/gpuWorkloadProfileContracts.test.js
```

Expected: FAIL because schema version `1.0` and all fixtures lack `supplierDependency`.

- [ ] **Step 3: Implement workload profile 1.1**

Add `supplierDependency` to the root required list and define:

```json
"supplierDependency": {
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "applicability",
        "assessmentId",
        "decisionId",
        "expectedSupplierClass",
        "expectedScope"
      ],
      "properties": {
        "applicability": { "const": "applicable" },
        "assessmentId": { "type": "string", "minLength": 3, "maxLength": 80 },
        "decisionId": { "type": "string", "minLength": 3, "maxLength": 180 },
        "expectedSupplierClass": {
          "enum": ["managed-ai-service", "dedicated-ai-capacity"]
        },
        "expectedScope": { "type": "string", "minLength": 1, "maxLength": 240 },
        "conditionalAcceptanceId": { "type": "string", "minLength": 3, "maxLength": 220 }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": ["applicability", "reason"],
      "properties": {
        "applicability": { "const": "not-applicable" },
        "reason": { "type": "string", "minLength": 10, "maxLength": 240 }
      }
    }
  ]
}
```

Set `schemaVersion` to `1.1`. Add the managed-service dependency to agent/RAG and batch fixtures using the exact managed assessment ID, decision ID, class, and scope. Add the dedicated-capacity dependency plus the exact conditional acceptance ID to fine-tuning and distributed-training fixtures.

- [ ] **Step 4: Run the workload contract test and verify GREEN**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/gpuWorkloadProfileContracts.test.js
```

Expected: PASS, including the two negative union-shape checks.

- [ ] **Step 5: Commit Task 2**

```bash
git add shared/schemas/ai-workload-readiness/workload-profile.schema.json shared/examples/ai-workload-readiness providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts providers/aws/app/api/tests/helpers/schemaAssertion.ts
git commit -m "feat: bind workloads to supplier decisions"
```

---

### Task 3: Create the bounded conditional acceptance contract

**Files:**
- Create: `shared/schemas/ai-workload-admission/conditional-supplier-acceptance.schema.json`
- Create: `shared/examples/ai-workload-admission/dedicated-ai-capacity.acceptance.json`
- Create: `providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts`

**Interfaces:**
- Consumes: dedicated-capacity decision ID from Task 1 and `conditionalAcceptanceId` from Task 2.
- Produces: `ConditionalSupplierAcceptance` fixture and schema for Tasks 5-7.

- [ ] **Step 1: Write a failing conditional acceptance contract test**

Create the test file with schema/fixture loading and assertions:

```ts
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
```

Set `SCHEMA_DIR` to `../../../../shared/schemas/ai-workload-admission` and `EXAMPLE_DIR` to `../../../../shared/examples/ai-workload-admission`. Import the exact helper produced by Task 2:

```ts
import { assertMatchesSchema } from "./helpers/schemaAssertion.js";
```

- [ ] **Step 2: Run the new contract test and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionContracts.test.js
```

Expected: FAIL because the acceptance schema and fixture do not exist.

- [ ] **Step 3: Implement the acceptance schema and fixture**

The schema is closed and requires exactly these fields:

```json
[
  "schemaVersion",
  "acceptanceId",
  "assessmentId",
  "decisionId",
  "acceptanceState",
  "acceptedEvidenceFamilies",
  "acceptedByRole",
  "acceptedAt",
  "validUntil",
  "evidenceReferences"
]
```

Use `schemaVersion: "1.0"`, `acceptanceState: "accepted" | "revoked"`, unique non-empty arrays, `date-time` formats for both timestamps, and URI-formatted evidence references. Create this exact synthetic record:

```json
{
  "schemaVersion": "1.0",
  "acceptanceId": "synthetic-dedicated-ai-capacity:2026-08-31T01:00:00.000Z:conditional-acceptance",
  "assessmentId": "synthetic-dedicated-ai-capacity",
  "decisionId": "synthetic-dedicated-ai-capacity:2026-08-31T01:00:00.000Z",
  "acceptanceState": "accepted",
  "acceptedEvidenceFamilies": ["sustainability-location"],
  "acceptedByRole": "platform-governance-reviewer",
  "acceptedAt": "2026-08-31T02:00:00.000Z",
  "validUntil": "2026-10-15T00:00:00.000Z",
  "evidenceReferences": ["https://example.com/cloudai-platform/supplier-acceptance/dedicated-ai-capacity"]
}
```

- [ ] **Step 4: Run the acceptance contract test and verify GREEN**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionContracts.test.js
```

Expected: PASS for the fixture and raw-field rejection.

- [ ] **Step 5: Commit Task 3**

```bash
git add shared/schemas/ai-workload-admission shared/examples/ai-workload-admission/dedicated-ai-capacity.acceptance.json providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts
git commit -m "feat: define conditional supplier acceptance"
```

---

### Task 4: Implement base supplier-aware admission and replay

**Files:**
- Create: `providers/aws/app/api/src/governance/supplierWorkloadAdmissionEvaluator.ts`
- Create: `providers/aws/app/api/tests/supplierWorkloadAdmissionEvaluator.test.ts`
- Create: `shared/schemas/ai-workload-admission/workload-supplier-admission-decision.schema.json`

**Interfaces:**
- Consumes: `SupplierAssessment`, `SupplierAssessmentDecision`, workload `supplierDependency`, optional acceptance, and explicit `evaluatedAt`.
- Produces: `evaluateWorkloadSupplierAdmission(input): WorkloadSupplierAdmissionDecision` and all admission reason-code types.

- [ ] **Step 1: Write failing base admission tests**

Define reusable typed fixtures in the test and cover these exact outcomes:

```ts
assert.deepEqual(
  evaluateWorkloadSupplierAdmission({
    workloadProfile: managedWorkload,
    supplierAssessment: managedAssessment,
    recordedSupplierDecision: managedDecision,
    evaluatedAt: "2026-09-01T00:00:00.000Z"
  }),
  {
    schemaVersion: "1.0",
    admissionDecisionId: "synthetic-agent-rag-inference:synthetic-managed-ai-service:2026-08-31T01:00:00.000Z:2026-09-01T00:00:00.000Z",
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
```

Also add focused tests for:

- invalid admission time -> denied / `admission-time-invalid`;
- not-applicable with no supplier inputs -> admitted / `supplier-dependency-not-applicable`;
- missing assessment -> denied / `supplier-assessment-missing`;
- missing decision -> denied / `supplier-decision-missing`;
- assessment ID, decision ID, supplier class, or scope mismatch -> denied / `supplier-reference-mismatch`;
- modified recorded outcome or reason code -> denied / `supplier-decision-replay-mismatch`;
- current revoked/expired/not-eligible assessment -> denied / `supplier-decision-not-eligible` with the evaluator's supplier reason code; and
- an eligible path carrying an acceptance object or ID -> denied / `conditional-acceptance-unexpected`.

- [ ] **Step 2: Run the evaluator test and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
```

Expected: TypeScript FAIL because `supplierWorkloadAdmissionEvaluator.ts` and its exported types do not exist.

- [ ] **Step 3: Define the exact TypeScript interface**

Create these exported types:

```ts
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
```

Define a closed union for `WorkloadSupplierAdmissionDecision`; both variants contain the common fields, while only the applicable variant contains supplier IDs and optional `conditionalAcceptanceId`.

- [ ] **Step 4: Implement deterministic base precedence**

Use this exported function signature:

```ts
export function evaluateWorkloadSupplierAdmission(input: {
  workloadProfile: SupplierAwareWorkloadProfile;
  supplierAssessment?: SupplierAssessment;
  recordedSupplierDecision?: SupplierAssessmentDecision;
  conditionalAcceptance?: ConditionalSupplierAcceptance;
  evaluatedAt: string;
}): WorkloadSupplierAdmissionDecision
```

Implement in the spec order. Parse `evaluatedAt` first. For recorded replay, call:

```ts
const replayed = evaluateSupplierReadiness(
  input.supplierAssessment,
  input.recordedSupplierDecision.evaluatedAt
);
```

Compare every closed decision field, including ordered arrays, rather than trusting IDs. Re-evaluate the unchanged assessment at admission time. Construct IDs exactly as:

```ts
`${workloadId}:${supplierDecisionId}:${evaluatedAt}`
`${workloadId}:not-applicable:${evaluatedAt}`
```

For invalid time, preserve the caller string in `evaluatedAt`, deny with `admission-time-invalid`, and do not call the supplier evaluator.

- [ ] **Step 5: Create the decision schema**

The root schema is `oneOf` with two closed object variants discriminated by:

```json
"supplierDependencyApplicability": { "const": "applicable" }
```

or:

```json
"supplierDependencyApplicability": { "const": "not-applicable" }
```

Both variants require `schemaVersion`, `admissionDecisionId`, `workloadId`, the discriminator, `decision`, `reasonCodes`, `supplierReasonCodes`, `evaluatedAt`, and `evidenceReferences`. The applicable variant additionally requires `supplierAssessmentId` and `supplierDecisionId`; the not-applicable variant cannot contain them. Permit `supplierReasonCodes` and `evidenceReferences` to be empty. Keep `evaluatedAt` as a non-empty string so `admission-time-invalid` can preserve the attempted value; tests enforce valid date-time for every other reason code.

- [ ] **Step 6: Run base evaluator tests and verify GREEN**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionEvaluator.test.js
```

Expected: all base precedence, replay, mismatch, not-applicable, and eligible tests PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add providers/aws/app/api/src/governance/supplierWorkloadAdmissionEvaluator.ts providers/aws/app/api/tests/supplierWorkloadAdmissionEvaluator.test.ts shared/schemas/ai-workload-admission/workload-supplier-admission-decision.schema.json
git commit -m "feat: add supplier-aware workload admission"
```

---

### Task 5: Enforce conditional acceptance boundaries

**Files:**
- Modify: `providers/aws/app/api/tests/supplierWorkloadAdmissionEvaluator.test.ts`
- Modify: `providers/aws/app/api/src/governance/supplierWorkloadAdmissionEvaluator.ts`

**Interfaces:**
- Consumes: `ConditionalSupplierAcceptance` from Task 3 and base evaluator from Task 4.
- Produces: fail-closed conditional admission with exact evidence-family and temporal boundaries.

- [ ] **Step 1: Write failing conditional admission tests**

Add tests for these exact paths:

```ts
const result = evaluateWorkloadSupplierAdmission({
  workloadProfile: dedicatedWorkload,
  supplierAssessment: dedicatedAssessment,
  recordedSupplierDecision: dedicatedDecision,
  conditionalAcceptance: dedicatedAcceptance,
  evaluatedAt: "2026-09-01T00:00:00.000Z"
});

assert.equal(result.decision, "admitted");
assert.deepEqual(result.reasonCodes, ["conditional-supplier-decision-accepted"]);
assert.deepEqual(result.supplierReasonCodes, ["bounded-remediation-required"]);
assert.equal(
  result.conditionalAcceptanceId,
  "synthetic-dedicated-ai-capacity:2026-08-31T01:00:00.000Z:conditional-acceptance"
);
```

Cover missing object or ID, mismatched acceptance ID/assessment ID/decision ID, missing or extra accepted evidence family, invalid timestamp, `acceptedAt` before decision, `acceptedAt` after admission, `acceptedAt` after `validUntil`, `validUntil` after assessment review, `validUntil` after remediation due date, revoked acceptance, expired acceptance, and exact-boundary acceptance.

- [ ] **Step 2: Run conditional evaluator tests and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionEvaluator.test.js
```

Expected: conditional cases FAIL because Task 4 has not yet implemented acceptance validation.

- [ ] **Step 3: Implement exact conditional-family validation**

Derive the expected family set only from applicable conditional assessment evidence:

```ts
const expectedConditionalFamilies = assessment.evidenceFamilies
  .filter((item) => item.applicability === "applicable" && item.status === "conditional")
  .map((item) => item.family)
  .sort();

const acceptedFamilies = [...acceptance.acceptedEvidenceFamilies].sort();
```

Require equal lengths and equal values at every index. Do not treat a subset or superset as acceptance.

- [ ] **Step 4: Implement temporal and state precedence**

Parse `recordedDecision.evaluatedAt`, `acceptedAt`, `validUntil`, assessment `reviewBy`, and every conditional remediation `dueAt`. Return:

- `conditional-acceptance-boundary-invalid` for invalid or contradictory timestamps;
- `conditional-acceptance-revoked` before expiry checks;
- `conditional-acceptance-expired` only when admission time is later than `validUntil`; and
- `conditional-supplier-decision-accepted` when identity, exact families, state, and boundaries pass.

Boundary equality is valid. Merge acceptance evidence references after assessment references with duplicates removed while preserving first-seen order.

- [ ] **Step 5: Run evaluator tests and verify GREEN**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionEvaluator.test.js
```

Expected: all base and conditional tests PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add providers/aws/app/api/src/governance/supplierWorkloadAdmissionEvaluator.ts providers/aws/app/api/tests/supplierWorkloadAdmissionEvaluator.test.ts
git commit -m "feat: enforce conditional supplier acceptance"
```

---

### Task 6: Add stored replay scenarios and evidence-map correlation

**Files:**
- Modify: `providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts`
- Create: `shared/examples/ai-workload-readiness/revoked-evidence.synthetic.json`
- Create: three `shared/examples/ai-workload-admission/*.admission.json` files
- Modify: `shared/schemas/control-plane-evidence/evidence-map.schema.json`
- Modify: `shared/examples/control-plane-evidence/evidence-map.mock.json`
- Modify: `providers/aws/app/api/tests/controlPlaneEvidenceContracts.test.ts`

**Interfaces:**
- Consumes: Task 1 supplier decisions, Task 2 workload dependencies, Task 3 acceptance, and Tasks 4-5 evaluator.
- Produces: three exact replayable admission records and one P6d workload dependency correlation.

- [ ] **Step 1: Write failing stored replay tests**

In `supplierWorkloadAdmissionContracts.test.ts`, add three table-driven scenarios:

```ts
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
```

For each scenario, validate the stored admission against the decision schema, call `evaluateWorkloadSupplierAdmission`, and `assert.deepEqual(evaluated, recordedAdmission)`.

- [ ] **Step 2: Write failing evidence correlation tests**

Require a `workloadDependencyCorrelation` object and assert:

```ts
assert.equal(correlation.workloadId, "synthetic-agent-rag-inference");
assert.equal(correlation.supplierAssessmentId, "synthetic-managed-ai-service");
assert.equal(
  correlation.supplierDecisionId,
  "synthetic-managed-ai-service:2026-08-31T01:00:00.000Z"
);
assert.ok(correlation.evidencePaths.includes(
  "shared/examples/ai-workload-admission/managed-ai-service.admission.json"
));
```

Resolve every `evidencePath` from the repository root, read it, and parse it as JSON. Preserve the existing assertion that there are exactly five evidence lanes.

- [ ] **Step 3: Run both contract tests and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionContracts.test.js dist/tests/controlPlaneEvidenceContracts.test.js
```

Expected: FAIL because stored admissions, denied workload profile, and evidence correlation do not yet exist.

- [ ] **Step 4: Add the denied workload and exact admission fixtures**

Create `revoked-evidence.synthetic.json` with workload ID `synthetic-revoked-dependency-workload` as a valid workload-profile `1.1` using profile `agent-rag-inference` and an applicable supplier dependency bound to the existing revoked-evidence assessment and decision. Keep all data synthetic and reuse the bounded controls from the agent/RAG fixture.

Hand-author the three closed admission records from the fixed inputs below; the replay test then proves that the real evaluator returns the same objects:

| File | Workload ID | Supplier assessment | Decision | Admission reason | Supplier reason | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| `managed-ai-service.admission.json` | `synthetic-agent-rag-inference` | `synthetic-managed-ai-service` | `admitted` | `supplier-decision-eligible` | `evidence-complete` | omitted |
| `dedicated-ai-capacity.admission.json` | `synthetic-fine-tuning-adapter` | `synthetic-dedicated-ai-capacity` | `admitted` | `conditional-supplier-decision-accepted` | `bounded-remediation-required` | exact Task 3 acceptance ID |
| `revoked-evidence.admission.json` | `synthetic-revoked-dependency-workload` | `synthetic-revoked-evidence` | `denied` | `supplier-decision-not-eligible` | `evidence-revoked` | omitted |

All three use `evaluatedAt: "2026-09-01T00:00:00.000Z"`, `supplierDependencyApplicability: "applicable"`, the exact Task 1 supplier decision ID, and the deterministic admission ID formula from the spec. Evidence references come from the assessment, plus the Task 3 acceptance reference only for the dedicated-capacity result.

- [ ] **Step 5: Add the evidence correlation schema and fixture**

Add `workloadDependencyCorrelation` to the root required list with a closed object requiring:

```json
[
  "workloadId",
  "supplierAssessmentId",
  "supplierDecisionId",
  "admissionDecisionId",
  "evaluatedAt",
  "evidencePaths"
]
```

Allow optional `conditionalAcceptanceId`. Require at least four unique paths matching `^shared/examples/.+\\.json$`. Populate the fixture with the managed-service scenario's workload, assessment, supplier decision, and admission paths. Do not alter the five existing evidence lanes.

- [ ] **Step 6: Run stored replay and evidence tests and verify GREEN**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionContracts.test.js dist/tests/controlPlaneEvidenceContracts.test.js
```

Expected: all three stored admissions replay exactly; every correlation path resolves and parses; five existing P6d lanes remain unchanged.

- [ ] **Step 7: Commit Task 6**

```bash
git add shared/examples/ai-workload-readiness/revoked-evidence.synthetic.json shared/examples/ai-workload-admission shared/schemas/control-plane-evidence/evidence-map.schema.json shared/examples/control-plane-evidence/evidence-map.mock.json providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts providers/aws/app/api/tests/controlPlaneEvidenceContracts.test.ts
git commit -m "test: record supplier-aware admission evidence"
```

---

### Task 7: Document the implemented boundary and complete regression verification

**Files:**
- Modify: `docs/practices/ai-workload-operating-contract.md`
- Modify: `docs/practices/ai-supplier-readiness-gate.md`
- Modify: `docs/evidence/control-plane-evidence-map.md`
- Modify: `docs/practices/current-status.md`
- Modify: `README.md`
- Create outside Git: `/Users/yvonne/Documents/projects/cloudai-platform/_private/docs/notes/yy-64-supplier-aware-workload-admission-2026-09-01.md`

**Interfaces:**
- Consumes: all Task 1-6 public contracts, evaluator behavior, fixtures, and validation evidence.
- Produces: exact public claims, explicit non-claims, and a private implementation/debugging record.

- [ ] **Step 1: Write failing documentation assertions**

Extend `supplierWorkloadAdmissionContracts.test.ts` to load the five public documents and require these phrases or equivalent exact headings:

```ts
assert.match(workloadDoc, /supplier-aware workload admission/i);
assert.match(workloadDoc, /replay/i);
assert.match(workloadDoc, /conditional acceptance/i);
assert.match(supplierDoc, /downstream workload admission/i);
assert.match(evidenceDoc, /workloadDependencyCorrelation/);
assert.match(statusDoc, /Supplier-aware workload admission/);
assert.match(readme, /supplier-aware admission/i);
```

Also assert that the public description contains `synthetic`, `metadata-only`, and no runtime-authority claim.

- [ ] **Step 2: Run the contract test and verify RED**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run build
node --test dist/tests/supplierWorkloadAdmissionContracts.test.js
```

Expected: FAIL because the public docs do not yet describe the implemented YY-64 path.

- [ ] **Step 3: Update public documentation**

Document this exact flow:

```text
workload dependency declaration
  -> recorded supplier decision replay
  -> supplier re-evaluation at admission time
  -> exact ID / class / scope correlation
  -> eligible, bounded conditional acceptance, or fail-closed denial
  -> metadata-only admission decision
  -> control-plane evidence correlation
```

State explicitly that it is local and synthetic, does not retrieve evidence, and does not approve procurement, call a provider, schedule a workload, grant Kubernetes/GPU access, or execute runtime actions. Update current status from a standalone supplier readiness gate to an implemented local supplier-aware workload admission consumer while retaining provider integration and YY-65 human-owned adapter as deferred.

- [ ] **Step 4: Create the private process record**

Create the private note at the absolute path above with these headings:

```markdown
# YY-64 Supplier-Aware Workload Admission — Implementation Record

## Objective and boundary
## Approved architecture
## Contract migrations
## RED/GREEN sequence
## Replay and admission-time evaluation
## Conditional acceptance edge cases
## Evidence-map correlation
## Debugging and design corrections
## Validation commands and results
## Public claims and explicit non-claims
## Next work: YY-65
```

Record actual commit IDs, observed failing messages, passing test counts, and any debugging decisions. Do not place credentials, account IDs, real supplier details, or raw evidence in the note. Do not stage `_private/`.

- [ ] **Step 5: Run documentation tests and all required local regression suites**

Working directory: `providers/aws/app/api`

```bash
corepack pnpm@11.7.0 run test
corepack pnpm@11.7.0 run agent-eval:gate -- --output /tmp/yy64-agent-evaluation-report.json
```

Expected: the complete API TypeScript build, all API Node test files, and the framework-neutral evaluation gate PASS.

Working directory: `providers/aws/app/agentcore-rag-runtime`

```bash
corepack pnpm@11.7.0 install --frozen-lockfile
corepack pnpm@11.7.0 run test
```

Expected: AgentCore Runtime build and observability contract tests PASS without provider calls.

- [ ] **Step 6: Validate JSON, Markdown links, and diff hygiene**

From repository root:

```bash
scripts/validate-argocd-gitops.sh
bash scripts/tests/test-gpu-quota.sh
find shared -type f -name "*.json" -print0 | xargs -0 -n1 jq empty
git diff --check
git status --short
```

Expected: Argo CD static contracts pass; GPU quota parser regressions pass; every JSON file parses; Markdown link tests are already green within the API suite; `git diff --check` emits no output; status lists only intended YY-64 public files and never `_private/` or `.pnpm-store/`.

- [ ] **Step 7: Commit Task 7**

```bash
git add docs/practices/ai-workload-operating-contract.md docs/practices/ai-supplier-readiness-gate.md docs/evidence/control-plane-evidence-map.md docs/practices/current-status.md README.md providers/aws/app/api/tests/supplierWorkloadAdmissionContracts.test.ts
git commit -m "docs: publish supplier-aware admission boundary"
```

- [ ] **Step 8: Push and prepare the review gate**

Create `/tmp/yy-64-pr-body.md` with `apply_patch` using this exact review summary:

```markdown
## Summary

- version supplier readiness decisions with deterministic identity and scope
- bind workload profiles to applicable or explicitly not-applicable supplier dependencies
- require a separate bounded acceptance for current conditional supplier outcomes
- replay recorded supplier decisions before admission-time re-evaluation
- record three synthetic admission scenarios and P6d workload dependency correlation
- publish exact local, metadata-only, provider-neutral boundaries

## Verification

- `corepack pnpm@11.7.0 --dir providers/aws/app/api test` — PASS
- `corepack pnpm@11.7.0 --dir providers/aws/app/agentcore-rag-runtime test` — PASS
- `scripts/validate-argocd-gitops.sh` — PASS
- `bash scripts/tests/test-gpu-quota.sh` — PASS
- all JSON files under `shared/` parse with `jq empty`
- `git diff --check` — PASS

## Boundary

No supplier integration, procurement approval, cloud call, scheduler action, Kubernetes/GPU authority, runtime execution, or autonomous approval is added.

Linear: YY-64
```

Then run:

```bash
git push origin feature/yy-64-supplier-workload-admission
gh pr create --base main --head feature/yy-64-supplier-workload-admission --title "feat: integrate supplier readiness with workload admission" --body-file /tmp/yy-64-pr-body.md
```

Confirm the PR shows the seven delivery commits and that `_private/` is absent from Files changed. Do not merge without explicit user approval.

---

## Final Acceptance Checklist

- [ ] Supplier decision `1.1` contains deterministic `decisionId` and copied `scope`.
- [ ] All six supplier decisions replay exactly through the existing evaluator.
- [ ] Workload profile `1.1` requires a closed applicable/not-applicable dependency union.
- [ ] Conditional acceptance is separate, metadata-only, exact-family-bound, revocable, and time-bounded.
- [ ] Admission replays the recorded supplier decision before admission-time re-evaluation.
- [ ] Every specified missing, mismatch, replay, freshness, revocation, expiry, and conditional case fails closed.
- [ ] Three stored admission scenarios replay exactly.
- [ ] P6d retains five evidence lanes and adds workload dependency correlation beside them.
- [ ] Public documentation distinguishes local contract evidence from provider, procurement, scheduler, and runtime authority.
- [ ] Private process notes contain no sensitive values and remain outside Git.
- [ ] Full API suite, JSON parsing, Markdown links, and diff hygiene pass.
- [ ] Linear YY-64 is updated with commit, PR, test, and boundary evidence; YY-65 remains blocked until YY-64 is merged.
