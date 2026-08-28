# Workload Control Plane and Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a deterministic synthetic workload API and prove request-to-result observability with OpenTelemetry, Prometheus and Grafana before using paid GPU infrastructure.

**Architecture:** A versioned workload profile is immutable reusable intent; a workload execution is an individual stateful run. An in-memory deterministic service owns state and emits transition events. OpenTelemetry carries trace context, Prometheus stores bounded metrics, and Grafana presents operational views without identifiers in metric labels.

**Tech Stack:** TypeScript, Node.js HTTP server/test runner, JSON Schema, OpenTelemetry SDK/Collector, prom-client, Prometheus, Grafana, Docker Compose

**Spec:** `docs/superpowers/specs/2026-08-28-ai-workload-platform-roadmap-design.md`

## Global Constraints

- Use synthetic data only.
- Keep profile and execution schemas separate and versioned.
- Submission must be idempotent; terminal execution states are immutable.
- Cancellation is an observed state transition, not an optimistic response.
- Do not use job IDs, trace IDs, user IDs, repository names or free-form errors as Prometheus labels.
- `cloudai_workflow_state_total` is a transition counter, never current state.
- Keep CloudWatch and GPU/DCGM work outside this local proof.
- No AWS credentials or paid resources are required by this plan.
- Use a non-`codex/` branch and commit each independently reviewable task.

---

### Task 1: Add versioned workload execution contracts

**Files:**
- Create: `shared/schemas/ai-workload-readiness/workload-execution.schema.json`
- Create: `shared/schemas/ai-workload-readiness/workload-submit-request.schema.json`
- Create: `shared/examples/ai-workload-readiness/execution.queued.synthetic.json`
- Create: `shared/examples/ai-workload-readiness/execution.cancelled.synthetic.json`
- Modify: `providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts`

**Interfaces:**
- Consumes: `workload-profile.schema.json` version `1.0` and its `workloadId`.
- Produces: `WorkloadSubmitRequest` and `WorkloadExecution` JSON contracts used by the TypeScript service and later Kubernetes adapter.

- [ ] **Step 1: Write failing contract tests**

Add tests requiring these fields:

```ts
assert.deepEqual(executionSchema.required, [
  "schemaVersion", "executionId", "profileId", "profileVersion",
  "idempotencyKey", "state", "submittedAt", "updatedAt", "history",
  "limits", "result", "evidence"
]);
assert.deepEqual(executionSchema.properties.state.enum, [
  "SUBMITTED", "QUEUED", "ADMITTED", "RUNNING", "SUCCEEDED",
  "FAILED", "CANCELLED", "EXPIRED", "REJECTED"
]);
assert.equal(executionSchema.properties.additionalProperties, undefined);
assert.equal(executionSchema.additionalProperties, false);
```

Validate both fixtures with the existing schema-test helper and assert terminal
fixtures cannot contain a later transition.

- [ ] **Step 2: Run the test and verify failure**

```bash
cd providers/aws/app/api
pnpm test
```

Expected: FAIL because the execution schemas and fixtures do not exist.

- [ ] **Step 3: Create the submit schema**

Define this shape:

```json
{
  "schemaVersion": "1.0",
  "idempotencyKey": "synthetic-submit-001",
  "profileId": "batch-inference-demo",
  "profileVersion": "1.0",
  "parameters": {
    "datasetRef": "synthetic://batch-input-v1"
  }
}
```

Constrain `idempotencyKey`, `profileId`, and `profileVersion` to bounded strings;
allow only synthetic URI values in `parameters`.

- [ ] **Step 4: Create the execution schema**

History items use:

```json
{
  "sequence": 1,
  "from": null,
  "to": "SUBMITTED",
  "reasonCode": "submission_accepted",
  "recordedAt": "2026-08-28T00:00:00.000Z"
}
```

Limits require `maxQueueWaitSeconds`, `maxRuntimeSeconds`, and `maxAttempts`.
Evidence contains metadata-only trace/log/metric reference categories, never raw
payloads or cloud identifiers. Result is `null` before terminal state and a
bounded `{ outcome, reasonCode }` object afterward.

- [ ] **Step 5: Run tests and commit**

```bash
cd providers/aws/app/api && pnpm test
git add shared/schemas/ai-workload-readiness shared/examples/ai-workload-readiness providers/aws/app/api/tests/gpuWorkloadProfileContracts.test.ts
git commit -m "feat: add workload execution contracts"
```

Expected: all tests pass.

### Task 2: Implement the deterministic execution state machine

**Files:**
- Create: `providers/aws/app/api/src/lib/workloadControlPlane.ts`
- Create: `providers/aws/app/api/tests/workloadControlPlane.test.ts`
- Modify: `providers/aws/app/api/src/types.ts`

**Interfaces:**
- Consumes: `WorkloadSubmitRequest`, a `Clock`, and an `ExecutionIdFactory`.
- Produces: `WorkloadControlPlane.submit`, `.get`, `.cancel`, `.transition`, and `.events`.

- [ ] **Step 1: Write failing state-machine tests**

Use an injected fixed clock and ID factory:

```ts
const controlPlane = createInMemoryWorkloadControlPlane({
  now: () => new Date("2026-08-28T00:00:00.000Z"),
  nextExecutionId: () => "exec-synthetic-001"
});
```

Tests must prove:

```ts
const first = controlPlane.submit(request);
const repeated = controlPlane.submit(request);
assert.equal(first.executionId, repeated.executionId);
assert.deepEqual(first.history.map(event => event.to), ["SUBMITTED", "QUEUED"]);
assert.throws(
  () => controlPlane.transition(first.executionId, "SUCCEEDED", "task_completed"),
  /QUEUED cannot transition directly to SUCCEEDED/
);
```

Also test `QUEUED -> ADMITTED -> RUNNING -> SUCCEEDED`, cancellation from
`QUEUED` and `RUNNING`, expiry, rejection, unknown ID, and refusal to mutate a
terminal state.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/workloadControlPlane.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Define exact TypeScript types**

```ts
export type WorkloadExecutionState =
  | "SUBMITTED" | "QUEUED" | "ADMITTED" | "RUNNING"
  | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REJECTED";

export type WorkloadTransitionReason =
  | "submission_accepted" | "queued_for_capacity" | "quota_reserved"
  | "job_started" | "task_completed" | "task_failed"
  | "cancellation_requested" | "queue_wait_expired" | "admission_rejected";
```

Define `WorkloadExecution`, `WorkloadTransitionEvent`, and
`WorkloadSubmitRequest` with the same property names as the JSON schemas.

- [ ] **Step 4: Implement the transition table**

```ts
const ALLOWED_TRANSITIONS: Record<WorkloadExecutionState, readonly WorkloadExecutionState[]> = {
  SUBMITTED: ["QUEUED", "REJECTED"],
  QUEUED: ["ADMITTED", "CANCELLED", "EXPIRED", "REJECTED"],
  ADMITTED: ["RUNNING", "CANCELLED", "EXPIRED"],
  RUNNING: ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  SUCCEEDED: [], FAILED: [], CANCELLED: [], EXPIRED: [], REJECTED: []
};
```

Store executions and `idempotencyKey -> executionId` in private Maps. Return
deep copies so callers cannot mutate stored state.

- [ ] **Step 5: Run focused and full tests**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/workloadControlPlane.test.js
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add providers/aws/app/api/src/lib/workloadControlPlane.ts providers/aws/app/api/src/types.ts providers/aws/app/api/tests/workloadControlPlane.test.ts
git commit -m "feat: add deterministic workload state machine"
```

### Task 3: Expose submit, status, cancel and event routes

**Files:**
- Create: `providers/aws/app/api/src/routes/workloads.ts`
- Create: `providers/aws/app/api/tests/workloads.test.ts`
- Modify: `providers/aws/app/api/src/server.ts`
- Modify: `providers/aws/app/api/src/lib/metrics.ts`

**Interfaces:**
- Consumes: `WorkloadControlPlane` from Task 2.
- Produces: `POST /workloads`, `GET /workloads/:executionId`, `POST /workloads/:executionId/cancel`, and `GET /workloads/:executionId/events`.

- [ ] **Step 1: Write failing HTTP tests**

```ts
const submitted = await postJson(server, "/workloads", request);
assert.equal(submitted.status, 202);
assert.equal(submitted.body.state, "QUEUED");

const repeated = await postJson(server, "/workloads", request);
assert.equal(repeated.body.executionId, submitted.body.executionId);

const cancelled = await postJson(server, `/workloads/${submitted.body.executionId}/cancel`, {});
assert.equal(cancelled.status, 200);
assert.equal(cancelled.body.state, "CANCELLED");
```

Also require 400 for malformed submission, 404 for unknown execution, and 409
for cancellation of a terminal execution.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/workloads.test.js
```

Expected: FAIL because the routes are missing.

- [ ] **Step 3: Implement route parsing without broad dynamic matching**

Use these exact patterns:

```ts
const EXECUTION_PATH = /^\/workloads\/([a-z0-9][a-z0-9-]{2,63})$/;
const CANCEL_PATH = /^\/workloads\/([a-z0-9][a-z0-9-]{2,63})\/cancel$/;
const EVENTS_PATH = /^\/workloads\/([a-z0-9][a-z0-9-]{2,63})\/events$/;
```

Inject one `WorkloadControlPlane` into `createMockApiServer`; create a fresh
in-memory instance per server when none is supplied. Do not put request bodies,
profile IDs or execution IDs into metric labels.

- [ ] **Step 4: Run focused and full tests**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/workloads.test.js
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add providers/aws/app/api/src/routes/workloads.ts providers/aws/app/api/tests/workloads.test.ts providers/aws/app/api/src/server.ts providers/aws/app/api/src/lib/metrics.ts
git commit -m "feat: expose synthetic workload lifecycle API"
```

### Task 4: Add bounded queue, transition and goodput metrics

**Files:**
- Modify: `providers/aws/app/api/src/lib/metrics.ts`
- Modify: `providers/aws/app/api/tests/metrics.test.ts`
- Modify: `helm/ai-api-service/dashboards/cloudai-mock-api-dashboard.json`
- Modify: `providers/aws/app/api/tests/observabilityAssets.test.ts`

**Interfaces:**
- Consumes: workload transitions from Tasks 2–3.
- Produces: bounded Prometheus counters, gauges and histograms.

- [ ] **Step 1: Write failing metric tests**

Require:

```ts
assert.match(metrics, /cloudai_workload_current\{state="QUEUED"\} 1/);
assert.match(metrics, /cloudai_workload_transition_total\{from="SUBMITTED",to="QUEUED",reason="queued_for_capacity"\} 1/);
assert.match(metrics, /cloudai_workload_queue_duration_seconds_bucket/);
assert.match(metrics, /cloudai_workload_task_goodput_total\{outcome="succeeded"\} 1/);
assert.doesNotMatch(metrics, /exec-synthetic-001|trace-|user|repository/i);
```

Add a test that passes an unapproved state/reason string and expects
`not_applicable` rather than a new label value.

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/metrics.test.js
```

Expected: FAIL because the metrics do not exist.

- [ ] **Step 3: Replace regex-only labels with enum allow-lists**

```ts
const SAFE_WORKLOAD_STATES = new Set<WorkloadExecutionState>([
  "SUBMITTED", "QUEUED", "ADMITTED", "RUNNING", "SUCCEEDED",
  "FAILED", "CANCELLED", "EXPIRED", "REJECTED"
]);
const SAFE_TRANSITION_REASONS = new Set<WorkloadTransitionReason>([
  "submission_accepted", "queued_for_capacity", "quota_reserved",
  "job_started", "task_completed", "task_failed", "cancellation_requested",
  "queue_wait_expired", "admission_rejected"
]);
```

Keep `cloudai_workflow_state_total` for backward-compatible transitions but
change its help text so it cannot be interpreted as current state.

- [ ] **Step 4: Implement metric methods**

Extend `MetricsCollector` with:

```ts
recordWorkloadTransition(event: WorkloadTransitionEvent): void;
setWorkloadCurrent(state: WorkloadExecutionState, value: number): void;
observeQueueDuration(state: "admitted" | "expired" | "cancelled", seconds: number): void;
recordTaskGoodput(outcome: "succeeded" | "failed" | "cancelled"): void;
```

Use Gauge for current state, Counter for transitions/goodput, and Histogram for
queue duration.

- [ ] **Step 5: Update dashboard tests and panels**

Add panels named exactly:

```text
Current workload state
Queue duration
Workload transitions
Task goodput
```

Tests must reject `executionId`, `traceId`, `user`, `prompt`, and `payload` in
dashboard queries or legends.

- [ ] **Step 6: Run and commit**

```bash
cd providers/aws/app/api && pnpm test
git add providers/aws/app/api/src/lib/metrics.ts providers/aws/app/api/tests/metrics.test.ts providers/aws/app/api/tests/observabilityAssets.test.ts helm/ai-api-service/dashboards/cloudai-mock-api-dashboard.json
git commit -m "feat: add bounded workload operational metrics"
```

### Task 5: Add explicit OpenTelemetry spans and collector configuration

**Files:**
- Create: `providers/aws/app/api/src/lib/telemetry.ts`
- Create: `providers/aws/app/api/tests/telemetry.test.ts`
- Modify: `providers/aws/app/api/src/server.ts`
- Modify: `providers/aws/app/api/package.json`
- Modify: `providers/aws/app/api/pnpm-lock.yaml`
- Create: `observability/otel-collector.local.yaml`

**Interfaces:**
- Consumes: route, execution state and transition reason as bounded span attributes.
- Produces: `Telemetry.startSpan(name, attributes, operation)` and OTLP/HTTP export when configured.

- [ ] **Step 1: Write a failing fake-telemetry test**

```ts
const telemetry = createRecordingTelemetry();
const server = createMockApiServer(undefined, undefined, "mock", undefined, undefined, undefined, telemetry);
await postJson(server, "/workloads", request);
assert.deepEqual(telemetry.spans.map(span => span.name), [
  "http.post.workloads", "workload.submit", "workload.transition"
]);
assert.doesNotMatch(JSON.stringify(telemetry.spans), /datasetRef|idempotencyKey|executionId/);
```

- [ ] **Step 2: Run and verify failure**

```bash
cd providers/aws/app/api
pnpm run build
node --test dist/tests/telemetry.test.js
```

Expected: FAIL because the telemetry interface is missing.

- [ ] **Step 3: Install exact locked dependencies**

```bash
cd providers/aws/app/api
pnpm add --save-exact @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

Commit the resolved exact versions in `package.json` and `pnpm-lock.yaml`.

- [ ] **Step 4: Implement the injectable telemetry interface**

```ts
export interface Telemetry {
  startSpan<T>(name: string, attributes: Record<string, string | number | boolean>, operation: () => T | Promise<T>): Promise<T>;
}
```

Provide `NoopTelemetry` for tests/default local use, `RecordingTelemetry` for
deterministic tests, and `createOtelTelemetry(env)` for configured execution.
Only allow `http.route`, `http.method`, `workload.state`, `workload.reason`, and
`workload.outcome` attributes.

- [ ] **Step 5: Configure the local Collector**

Use OTLP HTTP receiver on `4318`, batch processor, debug exporter, and a
`health_check` extension. Bind the debug/health interfaces to the local Docker
network only; do not expose them through Kubernetes ingress.

- [ ] **Step 6: Run and commit**

```bash
cd providers/aws/app/api && pnpm test
git add providers/aws/app/api/src/lib/telemetry.ts providers/aws/app/api/tests/telemetry.test.ts providers/aws/app/api/src/server.ts providers/aws/app/api/package.json providers/aws/app/api/pnpm-lock.yaml observability/otel-collector.local.yaml
git commit -m "feat: add workload OpenTelemetry spans"
```

### Task 6: Prove the local OpenTelemetry, Prometheus and Grafana chain

**Files:**
- Create: `observability/local/docker-compose.yaml`
- Create: `observability/local/prometheus.yaml`
- Create: `observability/local/grafana/provisioning/datasources/prometheus.yaml`
- Create: `observability/local/grafana/provisioning/dashboards/cloudai.yaml`
- Create: `scripts/local-observability-smoke.sh`
- Create: `scripts/tests/test-local-observability-assets.sh`
- Modify: `docs/solutions/eks-prometheus-grafana-observability-demo.md`

**Interfaces:**
- Consumes: `/metrics`, OTLP/HTTP spans and the reviewed Grafana dashboard.
- Produces: disposable local operational proof and telemetry-gap failure evidence.

- [ ] **Step 1: Write failing asset tests**

```bash
test -f observability/local/docker-compose.yaml
grep -q 'otel-collector' observability/local/docker-compose.yaml
grep -q 'prometheus' observability/local/docker-compose.yaml
grep -q 'grafana' observability/local/docker-compose.yaml
! grep -Eq '0\.0\.0\.0:3000|0\.0\.0\.0:9090' observability/local/docker-compose.yaml
grep -q '127.0.0.1:3000:3000' observability/local/docker-compose.yaml
grep -q '127.0.0.1:9090:9090' observability/local/docker-compose.yaml
```

- [ ] **Step 2: Run and verify failure**

```bash
bash scripts/tests/test-local-observability-assets.sh
```

Expected: FAIL because the local composition is absent.

- [ ] **Step 3: Create the disposable local composition**

Pin image digests during implementation review. Bind Grafana and Prometheus to
localhost only. Mount read-only configs and use no persistent volumes. Configure
Prometheus to scrape `api:3000/metrics`; configure Grafana with the Prometheus
data source and dashboard provider.

- [ ] **Step 4: Implement the smoke script**

The script must:

```bash
docker compose -f observability/local/docker-compose.yaml up -d --wait
curl --fail --silent http://127.0.0.1:3000/health >/dev/null
curl --fail --silent http://127.0.0.1:9090/-/ready >/dev/null
curl --fail --silent http://127.0.0.1:3000/api/health >/dev/null
curl --fail --silent http://127.0.0.1:9090/api/v1/query?query=cloudai_request_total >/tmp/cloudai-prometheus-query.json
jq -e '.status == "success"' /tmp/cloudai-prometheus-query.json >/dev/null
```

Use a shell trap to run `docker compose down --volumes --remove-orphans` on
success or failure.

- [ ] **Step 5: Add a telemetry-gap case**

Stop the Collector, submit a synthetic workload, and prove API/Prometheus health
continues while the Collector health check fails. Record only:

```json
{"api_available":true,"metrics_available":true,"trace_export_unavailable":true}
```

- [ ] **Step 6: Run all validation**

```bash
bash scripts/tests/test-local-observability-assets.sh
bash scripts/local-observability-smoke.sh
cd providers/aws/app/api && pnpm test
```

Expected: all commands pass and the composition is removed afterward.

- [ ] **Step 7: Commit**

```bash
git add observability/local scripts/local-observability-smoke.sh scripts/tests/test-local-observability-assets.sh docs/solutions/eks-prometheus-grafana-observability-demo.md
git commit -m "feat: prove local workload observability chain"
```
