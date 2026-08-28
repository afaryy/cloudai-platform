# Kafka and Slurm Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an evidence-based Kafka adoption decision for workload lifecycle events and build a disposable CPU-only Slurm lab that compares the same workload operating contract with Kubernetes/Kueue.

**Architecture:** Kafka is admitted only when the completed workload platform has multiple independent event consumers or needs replay/back-pressure. The first event proof is local and disposable. Slurm is an isolated CPU lab for scheduler operations and accounting; it never co-manages EKS/Kueue nodes.

**Tech Stack:** JSON Schema, TypeScript, Kafka protocol, Docker Compose, Slurm, Munge, Bash contract tests

**Spec:** `docs/superpowers/specs/2026-08-28-ai-workload-platform-roadmap-design.md`

## Global Constraints

- Begin only after the workload/GPU operational proof is complete.
- Kafka is optional; a documented rejection is a valid completion result.
- Do not use Kafka as the Prometheus or OpenTelemetry transport in this POC.
- Use execution ID as an event partition key but never as a Prometheus label.
- Define ordering, idempotency, retry, dead-letter and retention contracts before running a broker.
- Keep Kafka local/CI and disposable; no managed AWS Kafka cluster.
- Keep Slurm local, CPU-only and disposable for the first lab.
- Do not let Slurm and Kueue manage the same nodes.
- Do not claim production Kafka, Slurm, HPC or GPU-fleet experience.
- Use a non-`codex/` branch and retain synthetic data only.

---

### Task 1: Decide whether Kafka has a real workload-lifecycle requirement

**Files:**
- Create: `docs/decisions/workload-lifecycle-event-transport.md`
- Create: `shared/schemas/ai-workload-readiness/event-transport-decision.schema.json`
- Create: `shared/examples/ai-workload-readiness/event-transport-decision.synthetic.json`
- Modify: `providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts`

**Interfaces:**
- Consumes: observed workload lifecycle, status projection, audit/evidence and FinOps needs from the completed platform.
- Produces: `ADOPT_LOCAL_POC` or `DO_NOT_ADOPT` with machine-checked reasons.

- [ ] **Step 1: Write the failing decision-contract test**

Require this schema shape:

```json
{
  "schemaVersion": "1.0",
  "decision": "ADOPT_LOCAL_POC",
  "independentConsumers": ["status-projection", "audit-evidence", "finops-aggregation"],
  "requiresReplay": true,
  "requiresBackPressure": true,
  "existingStoreInsufficient": true,
  "reasonCodes": ["multiple_consumers", "replay_required", "back_pressure_required"]
}
```

The schema also permits `DO_NOT_ADOPT`, but then
`existingStoreInsufficient` must be false and the reason code must be one of
`single_consumer`, `no_replay_requirement`, or `existing_store_sufficient`.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api && pnpm test
```

Expected: FAIL because the decision schema and record do not exist.

- [ ] **Step 3: Create the schema and decision guide**

The guide requires evidence for all five questions:

```text
Are there at least two independently deployed consumers?
Must a consumer rebuild state by replaying old events?
Must producers remain decoupled from slow consumers?
Is per-execution ordering required?
Why is the existing control-plane store insufficient?
```

Admit the local POC only when the first three answers are yes and the final
answer identifies a tested limitation. Otherwise record `DO_NOT_ADOPT` and end
Kafka work after this task.

- [ ] **Step 4: Populate the decision from observed evidence**

Do not copy the example blindly. Use the completed control-plane tests and
runtime evidence. Public documentation may state only the decision and generic
reason codes.

- [ ] **Step 5: Run tests and commit**

```bash
cd providers/aws/app/api && pnpm test
git add docs/decisions/workload-lifecycle-event-transport.md shared/schemas/ai-workload-readiness/event-transport-decision.schema.json shared/examples/ai-workload-readiness/event-transport-decision.synthetic.json providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts
git commit -m "docs: decide workload event transport boundary"
```

If the result is `DO_NOT_ADOPT`, skip Tasks 2–3 and proceed to Task 4.

### Task 2: Define versioned workload lifecycle events

**Files:**
- Create: `shared/schemas/ai-workload-readiness/workload-lifecycle-event.schema.json`
- Create: `shared/examples/ai-workload-readiness/workload-lifecycle-events.synthetic.json`
- Create: `providers/aws/app/api/src/lib/workloadEvents.ts`
- Create: `providers/aws/app/api/tests/workloadEvents.test.ts`

**Interfaces:**
- Consumes: `WorkloadTransitionEvent` from the control plane.
- Produces: `WorkloadLifecycleEventV1` and `toLifecycleEvent(transition)`.

- [ ] **Step 1: Write failing schema and mapping tests**

Require:

```ts
const event = toLifecycleEvent(transition);
assert.deepEqual(event, {
  schemaVersion: "1.0",
  eventType: "workload.state.changed",
  executionId: "exec-synthetic-001",
  sequence: 3,
  occurredAt: "2026-08-28T00:00:03.000Z",
  state: "ADMITTED",
  previousState: "QUEUED",
  reasonCode: "quota_reserved",
  dataClassification: "synthetic-public"
});
assert.equal(partitionKeyFor(event), "exec-synthetic-001");
```

Reject payload, prompt, user identity, repository, cloud ARN and free-form error.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/workloadEvents.test.js
```

Expected: FAIL because the module and schema are absent.

- [ ] **Step 3: Define the exact event envelope**

Use only the fields shown in the test. Constrain `eventType` to
`workload.state.changed`, state/reason to the existing enums, and sequence to a
positive integer. Add a schema `$id` ending in
`workload-lifecycle-event.schema.json`.

- [ ] **Step 4: Implement deterministic mapping and key selection**

```ts
export function partitionKeyFor(event: WorkloadLifecycleEventV1): string {
  return event.executionId;
}
```

Do not include trace ID in the event. Trace correlation remains in the
telemetry/evidence store.

- [ ] **Step 5: Run and commit**

```bash
cd providers/aws/app/api && pnpm test
git add shared/schemas/ai-workload-readiness/workload-lifecycle-event.schema.json shared/examples/ai-workload-readiness/workload-lifecycle-events.synthetic.json providers/aws/app/api/src/lib/workloadEvents.ts providers/aws/app/api/tests/workloadEvents.test.ts
git commit -m "feat: add versioned workload lifecycle events"
```

### Task 3: Prove local Kafka ordering, idempotency, replay and dead-letter handling

**Files:**
- Create: `events/local/docker-compose.yaml`
- Create: `events/local/topics.sh`
- Create: `providers/aws/app/api/src/lib/kafkaWorkloadEventPublisher.ts`
- Create: `providers/aws/app/api/src/lib/kafkaWorkloadEventConsumer.ts`
- Create: `providers/aws/app/api/tests/kafkaWorkloadEvents.test.ts`
- Create: `scripts/local-kafka-workload-events-smoke.sh`
- Create: `scripts/tests/test-local-kafka-assets.sh`
- Modify: `providers/aws/app/api/package.json`
- Modify: `providers/aws/app/api/pnpm-lock.yaml`

**Interfaces:**
- Consumes: `WorkloadLifecycleEventV1` and its execution partition key.
- Produces: topic `cloudai.workload.lifecycle.v1`, dead-letter topic `cloudai.workload.lifecycle.v1.dlq`, status projection and audit/FinOps test consumers.

- [ ] **Step 1: Write failing asset and integration tests**

Require:

```bash
grep -q 'cloudai.workload.lifecycle.v1' events/local/topics.sh
grep -q 'cloudai.workload.lifecycle.v1.dlq' events/local/topics.sh
grep -q '127.0.0.1:' events/local/docker-compose.yaml
! grep -Eq '0\.0\.0\.0:' events/local/docker-compose.yaml
```

Integration tests publish sequences 1, 2, 2, 3 for one execution and assert
the projection applies 1, 2, 3 once. Publish an invalid event and assert one DLQ
record with generic `schema_validation_failed` only.

- [ ] **Step 2: Run and verify failure**

```bash
bash scripts/tests/test-local-kafka-assets.sh
```

Expected: FAIL because local Kafka assets do not exist.

- [ ] **Step 3: Add the locked Kafka client**

```bash
cd providers/aws/app/api
pnpm add --save-exact kafkajs
```

- [ ] **Step 4: Implement publisher and idempotent consumer**

Publisher settings:

```ts
{ acks: -1, idempotent: true, maxInFlightRequests: 1 }
```

The consumer stores the highest applied sequence per execution. It ignores an
equal sequence, rejects a lower sequence, and pauses/retries a gap before
sending the event to DLQ with a bounded reason code.

- [ ] **Step 5: Create disposable local composition**

Use one digest-pinned Kafka-compatible broker in KRaft mode, no ZooKeeper, no
persistent volume and localhost-only host binding. Require the reviewed image
through `KAFKA_IMAGE` and fail if it is not digest-pinned.

- [ ] **Step 6: Implement smoke and cleanup**

The script starts the broker, creates both topics, runs the focused Node test,
proves replay from offset zero rebuilds the same projection, and always runs:

```bash
docker compose -f events/local/docker-compose.yaml down --volumes --remove-orphans
```

- [ ] **Step 7: Run and commit**

```bash
bash scripts/tests/test-local-kafka-assets.sh
bash scripts/local-kafka-workload-events-smoke.sh
cd providers/aws/app/api && pnpm test
git add events/local providers/aws/app/api/src/lib/kafkaWorkloadEventPublisher.ts providers/aws/app/api/src/lib/kafkaWorkloadEventConsumer.ts providers/aws/app/api/tests/kafkaWorkloadEvents.test.ts providers/aws/app/api/package.json providers/aws/app/api/pnpm-lock.yaml scripts/local-kafka-workload-events-smoke.sh scripts/tests/test-local-kafka-assets.sh
git commit -m "feat: prove local workload event streaming"
```

### Task 4: Define one workload translation between Kueue and Slurm

**Files:**
- Create: `shared/schemas/ai-workload-readiness/slurm-job-request.schema.json`
- Create: `shared/examples/ai-workload-readiness/slurm-batch-inference.synthetic.json`
- Create: `docs/architecture/kueue-slurm-workload-comparison.md`
- Modify: `providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts`

**Interfaces:**
- Consumes: the existing `batch-inference.synthetic.json` workload profile.
- Produces: a CPU-only Slurm job request and field-by-field Kueue/Slurm mapping.

- [ ] **Step 1: Write failing mapping tests**

Require the fixture:

```json
{
  "schemaVersion": "1.0",
  "jobName": "synthetic-batch-inference",
  "partition": "cpu-lab",
  "account": "cloudai-learning",
  "qos": "bounded",
  "nodes": 1,
  "tasks": 1,
  "cpusPerTask": 1,
  "memoryMiB": 256,
  "timeLimitSeconds": 120,
  "requeue": true,
  "dataClassification": "synthetic-public"
}
```

The comparison must map LocalQueue to partition/account/QoS, Job to `sbatch`,
Kueue conditions to `squeue`/`sacct`, and retry/cancel to requeue/scancel.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api && pnpm test
```

Expected: FAIL because the schema, fixture and comparison are absent.

- [ ] **Step 3: Create the schema and comparison**

Constrain nodes/tasks/CPUs to 1 for the first lab, memory to 256 MiB, time limit
to 120 seconds, partition to `cpu-lab`, and data classification to
`synthetic-public`. Explicitly state that Slurm and Kueue do not share nodes.

- [ ] **Step 4: Run and commit**

```bash
cd providers/aws/app/api && pnpm test
git add shared/schemas/ai-workload-readiness/slurm-job-request.schema.json shared/examples/ai-workload-readiness/slurm-batch-inference.synthetic.json docs/architecture/kueue-slurm-workload-comparison.md providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts
git commit -m "docs: map Kueue workload controls to Slurm"
```

### Task 5: Build a disposable CPU-only Slurm operations lab

**Files:**
- Create: `labs/slurm/Dockerfile`
- Create: `labs/slurm/compose.yaml`
- Create: `labs/slurm/slurm.conf`
- Create: `labs/slurm/cgroup.conf`
- Create: `labs/slurm/entrypoint-controller.sh`
- Create: `labs/slurm/entrypoint-worker.sh`
- Create: `labs/slurm/jobs/synthetic-batch.sh`
- Create: `scripts/slurm-lab-smoke.sh`
- Create: `scripts/tests/test-slurm-lab-assets.sh`
- Create: `docs/solutions/slurm-cpu-learning-lab.md`

**Interfaces:**
- Consumes: the CPU-only Slurm job request from Task 4.
- Produces: controller, one worker, accounting commands and deterministic scheduler-operation evidence.

- [ ] **Step 1: Write failing lab-asset tests**

```bash
grep -q 'PartitionName=cpu-lab' labs/slurm/slurm.conf
grep -q 'NodeName=worker-1' labs/slurm/slurm.conf
grep -q '#SBATCH --time=00:02:00' labs/slurm/jobs/synthetic-batch.sh
grep -q '#SBATCH --requeue' labs/slurm/jobs/synthetic-batch.sh
! grep -Eq 'Gres=gpu|nvidia|--gpus' labs/slurm/slurm.conf labs/slurm/jobs/synthetic-batch.sh
```

- [ ] **Step 2: Run and verify failure**

```bash
bash scripts/tests/test-slurm-lab-assets.sh
```

Expected: FAIL because the lab does not exist.

- [ ] **Step 3: Build the controller and worker image**

Install `slurm-wlm`, `slurm-client` and `munge` from one pinned base image.
Generate one shared Munge key at lab startup, mount it read-only into controller
and worker, and keep all services on an internal Docker network. Use no host
ports and no persistent volumes.

- [ ] **Step 4: Configure bounded scheduling**

`slurm.conf` defines one `cpu-lab` partition, one worker, one CPU, 256 MiB
logical memory, `ReturnToService=2`, backfill scheduling and multifactor
priority. Configure accounting to Slurm's local job completion log for this
disposable lab; do not add a database service.

- [ ] **Step 5: Implement the scheduler smoke**

The script must prove:

```text
sbatch returns a job ID
squeue observes PENDING or RUNNING
sacct reports COMPLETED
scancel terminates a long-running job
scontrol requeue returns an eligible job to the queue
scontrol update NodeName=worker-1 State=DRAIN Reason=synthetic-test blocks work
scontrol update NodeName=worker-1 State=RESUME restores work
```

Evidence contains only operation/result categories and elapsed seconds, not
container IDs or host details. Always remove the Compose project and volumes.

- [ ] **Step 6: Run all tests and commit**

```bash
bash scripts/tests/test-slurm-lab-assets.sh
bash scripts/slurm-lab-smoke.sh
cd providers/aws/app/api && pnpm test
git add labs/slurm scripts/slurm-lab-smoke.sh scripts/tests/test-slurm-lab-assets.sh docs/solutions/slurm-cpu-learning-lab.md
git commit -m "feat: add disposable Slurm operations lab"
```

### Task 6: Publish the scheduler decision record

**Files:**
- Modify: `docs/architecture/kueue-slurm-workload-comparison.md`
- Modify: `docs/practices/current-status.md`
- Create locally: `_private/docs/notes/kafka-slurm-learning-record-2026-08-28.md`

**Interfaces:**
- Consumes: Kafka decision/proof and Slurm lab evidence.
- Produces: honest scheduler/event-transport portfolio boundary.

- [ ] **Step 1: Record observed differences**

Use the same dimensions for both schedulers:

```text
submission and identity
queue/admission
priority/preemption
retry/requeue
cancellation
accounting/observability
node lifecycle
best-fit workload
```

- [ ] **Step 2: Record the Kafka outcome**

State either:

```text
Kafka local proof admitted because multiple consumers and replay/back-pressure were demonstrated.
```

or:

```text
Kafka not adopted because the deterministic control-plane store remained sufficient.
```

Do not imply a managed or production broker.

- [ ] **Step 3: Run documentation contracts and commit public files**

```bash
cd providers/aws/app/api && pnpm test
git add docs/architecture/kueue-slurm-workload-comparison.md docs/practices/current-status.md
git commit -m "docs: record scheduler and event transport decisions"
```

Keep the private learning record ignored.
