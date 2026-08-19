import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

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
  assert.equal(schema.properties.controls.properties.budgetStopRequired.const, true);
  assert.equal(schema.properties.controls.properties.teardownPlanRequired.const, true);
  assert.equal(schema.properties.evidence.properties.mode.const, "metadata-only");
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

test("fine-tuning and distributed-training fixtures declare checkpoint and topology boundaries", async () => {
  const fineTuning = await readJson("fine-tuning.synthetic.json", EXAMPLE_DIR);
  const distributed = await readJson("distributed-training.synthetic.json", EXAMPLE_DIR);

  assert.equal(fineTuning.profile, "fine-tuning");
  assert.equal(fineTuning.runtime.type, "hyperpod-eks");
  assert.equal(fineTuning.capacity.queuePolicy, "reserved");
  assert.equal(fineTuning.controls.checkpointRequired, true);
  assert.equal(fineTuning.controls.requiresHumanApproval, true);
  assert.ok(fineTuning.evidence.signals.includes("checkpoint-duration"));
  assert.ok(fineTuning.evidence.signals.includes("cost-estimate"));

  assert.equal(distributed.profile, "distributed-training");
  assert.equal(distributed.runtime.type, "future-hpc");
  assert.equal(distributed.capacity.queuePolicy, "reserved");
  assert.equal(distributed.capacity.minAccelerators, 8);
  assert.equal(distributed.controls.checkpointRequired, true);
  assert.equal(distributed.controls.requiresHumanApproval, true);
  assert.ok(distributed.evidence.signals.includes("checkpoint-duration"));
  assert.ok(distributed.evidence.signals.includes("energy-estimate"));

  for (const fixture of [fineTuning, distributed]) {
    assert.equal(fixture.dataClassification, "synthetic-public");
    assert.equal(fixture.controls.budgetStopRequired, true);
    assert.equal(fixture.controls.teardownPlanRequired, true);
    assert.equal(fixture.controls.telemetryRequired, true);
    assert.equal(fixture.evidence.mode, "metadata-only");
  }
});

async function readJson(fileName: string, directory: string): Promise<any> {
  return JSON.parse(await readFile(resolve(directory, fileName), "utf8"));
}
