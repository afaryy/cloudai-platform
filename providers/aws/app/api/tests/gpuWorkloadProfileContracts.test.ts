import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertMatchesSchema } from "./helpers/schemaAssertion.js";

const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/ai-workload-readiness");
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/ai-workload-readiness");

test("GPU workload profile schema requires an accountable, bounded workload contract", async () => {
  const schema = await readJson("workload-profile.schema.json", SCHEMA_DIR);

  assert.deepEqual(schema.required, [
    "schemaVersion",
    "workloadId",
    "profile",
    "owner",
    "dataClassification",
    "runtime",
    "capacity",
    "supplierDependency",
    "admission",
    "controls",
    "evidence"
  ]);
  assert.deepEqual(schema.properties.profile.enum, [
    "interactive-inference",
    "agent-rag-inference",
    "batch-inference",
    "fine-tuning",
    "distributed-training",
    "embeddings-rag-indexing"
  ]);
  assert.equal(schema.properties.schemaVersion.const, "1.1");
  assert.ok(schema.required.includes("supplierDependency"));
  assert.equal(schema.properties.supplierDependency.oneOf.length, 2);
  assert.equal(schema.properties.controls.properties.budgetStopRequired.const, true);
  assert.equal(schema.properties.controls.properties.teardownPlanRequired.const, true);
  assert.equal(schema.properties.evidence.properties.mode.const, "metadata-only");
});

test("GPU workload profile schema defines a Kueue-aware admission contract", async () => {
  const schema = await readJson("workload-profile.schema.json", SCHEMA_DIR);
  const admission = schema.properties.admission;

  assert.ok(schema.required.includes("admission"));
  assert.equal(admission.type, "object");
  assert.equal(admission.additionalProperties, false);
  assert.deepEqual(admission.required, [
    "resourceFlavor",
    "clusterQueue",
    "localQueue",
    "admissionChecks",
    "topologyIntent",
    "maxQueueWaitSeconds",
    "retryPolicy",
    "preemptionPolicy"
  ]);
  assert.equal(admission.properties.resourceFlavor.type, "string");
  assert.equal(admission.properties.clusterQueue.type, "string");
  assert.equal(admission.properties.localQueue.type, "string");
  assert.equal(admission.properties.admissionChecks.uniqueItems, true);
  assert.deepEqual(admission.properties.topologyIntent.enum, [
    "none",
    "prefer-local",
    "required-single-domain",
    "required-multi-node-domain"
  ]);
  assert.equal(admission.properties.maxQueueWaitSeconds.minimum, 1);
  assert.equal(admission.properties.retryPolicy.additionalProperties, false);
  assert.deepEqual(admission.properties.preemptionPolicy.enum, [
    "never",
    "reclaim-within-cohort",
    "borrow-within-cohort",
    "within-queue"
  ]);
});

test("all synthetic workload fixtures declare a complete Kueue admission boundary", async () => {
  const fixtures = await Promise.all([
    readJson("agent-rag-inference.synthetic.json", EXAMPLE_DIR),
    readJson("batch-inference.synthetic.json", EXAMPLE_DIR),
    readJson("fine-tuning.synthetic.json", EXAMPLE_DIR),
    readJson("distributed-training.synthetic.json", EXAMPLE_DIR)
  ]);

  const [agent, batch, fineTuning, distributed] = fixtures;

  for (const fixture of fixtures) {
    assertMatchesSchema(fixture, await readJson("workload-profile.schema.json", SCHEMA_DIR));
  }

  assert.equal(agent.supplierDependency.assessmentId, "synthetic-managed-ai-service");
  assert.equal(batch.supplierDependency.assessmentId, "synthetic-managed-ai-service");
  assert.equal(fineTuning.supplierDependency.assessmentId, "synthetic-dedicated-ai-capacity");
  assert.equal(distributed.supplierDependency.assessmentId, "synthetic-dedicated-ai-capacity");
  assert.equal(
    fineTuning.supplierDependency.conditionalAcceptanceId,
    "synthetic-dedicated-ai-capacity:2026-08-31T01:00:00.000Z:conditional-acceptance"
  );

  assert.equal(agent.admission.preemptionPolicy, "never");
  assert.equal(agent.admission.topologyIntent, "none");
  assert.ok(agent.admission.admissionChecks.includes("human-approved"));

  assert.equal(batch.admission.preemptionPolicy, "reclaim-within-cohort");
  assert.equal(batch.admission.topologyIntent, "prefer-local");
  assert.equal(batch.admission.borrowingLimit, 2);

  assert.equal(fineTuning.profile, "fine-tuning");
  assert.equal(fineTuning.admission.preemptionPolicy, "never");
  assert.ok(fineTuning.admission.admissionChecks.includes("human-approved"));

  assert.equal(distributed.profile, "distributed-training");
  assert.equal(distributed.admission.gangScheduling, true);
  assert.equal(distributed.admission.topologyIntent, "required-multi-node-domain");
  assert.ok(distributed.admission.admissionChecks.includes("topology-ready"));

  for (const fixture of fixtures) {
    assertAdmissionBoundary(fixture);
  }
});

test("supplier dependency variants fail closed when their shapes are incomplete or conflicting", async () => {
  const schema = await readJson("workload-profile.schema.json", SCHEMA_DIR);
  const dependencySchema = schema.properties.supplierDependency;

  assert.throws(
    () =>
      assertMatchesSchema(
        {
          applicability: "applicable",
          assessmentId: "synthetic-managed-ai-service",
          expectedSupplierClass: "managed-ai-service",
          expectedScope: "Synthetic managed model and retrieval service boundary"
        },
        dependencySchema
      ),
    /exactly one documented variant/
  );

  assert.throws(
    () =>
      assertMatchesSchema(
        {
          applicability: "not-applicable",
          reason: "This synthetic workload has no external supplier dependency.",
          assessmentId: "synthetic-managed-ai-service"
        },
        dependencySchema
      ),
    /exactly one documented variant/
  );
});

test("admission boundary fails closed when a required admission control is missing", async () => {
  const agent = await readJson("agent-rag-inference.synthetic.json", EXAMPLE_DIR);
  const missingQueueWait = {
    ...agent,
    admission: { ...agent.admission }
  };
  delete missingQueueWait.admission.maxQueueWaitSeconds;

  assert.throws(() => assertAdmissionBoundary(missingQueueWait), /maxQueueWaitSeconds/);
});

test("agent/RAG and batch fixtures declare different capacity and recovery needs", async () => {
  const agent = await readJson("agent-rag-inference.synthetic.json", EXAMPLE_DIR);
  const batch = await readJson("batch-inference.synthetic.json", EXAMPLE_DIR);

  assert.equal(agent.profile, "agent-rag-inference");
  assert.equal(agent.runtime.type, "kubernetes-gpu");
  assert.equal(agent.capacity.queuePolicy, "autoscale");
  assert.equal(agent.controls.checkpointRequired, false);
  assert.equal(agent.controls.requiresHumanApproval, true);

  assert.equal(batch.profile, "batch-inference");
  assert.equal(batch.runtime.type, "queue-worker");
  assert.equal(batch.capacity.queuePolicy, "preemptible");
  assert.equal(batch.controls.checkpointRequired, true);
  assert.equal(batch.controls.requiresHumanApproval, false);

  for (const fixture of [agent, batch]) {
    assert.equal(fixture.dataClassification, "synthetic-public");
    assert.equal(fixture.controls.budgetStopRequired, true);
    assert.equal(fixture.controls.teardownPlanRequired, true);
    assert.equal(fixture.evidence.mode, "metadata-only");
    assert.ok(fixture.evidence.signals.includes("gpu-hours"));
    assert.ok(fixture.evidence.signals.includes("queue-time"));
  }
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}

function assertAdmissionBoundary(fixture: any): void {
  const admission = fixture.admission;
  assert.ok(admission, `${fixture.workloadId} must declare admission`);

  for (const field of [
    "resourceFlavor",
    "clusterQueue",
    "localQueue",
    "admissionChecks",
    "topologyIntent",
    "maxQueueWaitSeconds",
    "retryPolicy",
    "preemptionPolicy"
  ]) {
    assert.notEqual(admission[field], undefined, `${fixture.workloadId} admission requires ${field}`);
  }

  assert.ok(admission.admissionChecks.length > 0, `${fixture.workloadId} requires admission checks`);
  assert.ok(admission.retryPolicy.maxAttempts >= 1, `${fixture.workloadId} requires retry attempts`);
}
