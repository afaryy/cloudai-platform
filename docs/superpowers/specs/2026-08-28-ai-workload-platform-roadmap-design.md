# AI Workload Platform Roadmap Design

## Status

**Architecture and final task map approved: 28 August 2026.**

This specification defines the next CloudAI implementation sequence for a
bounded AI workload platform. It connects private network foundations,
recoverable CI/CD, private EKS, ephemeral self-hosted runners, Kubernetes GPU
admission, and end-to-end operational evidence.

Approval of this design does not authorise an AWS apply, create an EKS cluster,
add GPU capacity, install ARC, deploy Kafka, or create a Slurm environment.
Each paid or state-changing runtime stage retains its own protected workflow,
budget gate, exact confirmation phrase, acceptance evidence, and later teardown
approval.

## Decision

Build one staged, end-to-end learning path rather than several disconnected
tool demonstrations:

```text
Private network foundation
  -> VPC-connected bootstrap and recovery runner
  -> private EKS CPU baseline
  -> ARC controller and ephemeral runner scale set
  -> workload job control plane
  -> OpenTelemetry + Prometheus + Grafana baseline
  -> ARC-delivered Helm / Argo CD / Kueue components
  -> bounded GPU commissioning and deterministic CUDA proof
  -> Kueue admission and failure cases
  -> DCGM GPU telemetry and correlated operational evidence
  -> security, reliability and FinOps scenarios
  -> conditional Kafka lifecycle-event proof
  -> later Slurm comparison lab
```

The platform uses two deliberately separate runner classes:

1. A VPC-connected, CodeBuild-hosted ephemeral runner owns network, EKS
   bootstrap, recovery, stop, and future teardown operations.
2. ARC-managed ephemeral GitHub Actions runner scale sets inside private EKS
   own steady-state Kubernetes delivery after the cluster is healthy.

ARC alone is not a bootstrap or recovery solution because it depends on the
cluster it would need to create or repair. CodeBuild alone is not the preferred
steady-state workload runner because it does not demonstrate Kubernetes-native,
ephemeral delivery. The two-runner model removes that circular dependency.

## Outcomes

The completed path should let a reviewer follow one synthetic workload through:

```text
request
  -> validated workload profile
  -> queued execution
  -> Kueue admission
  -> GPU allocation
  -> deterministic CUDA result
  -> metrics, logs and trace evidence
  -> cost and capacity attribution
  -> terminal outcome or controlled cancellation
```

It should answer six practical questions:

1. Who or what submitted the work, and under which identity?
2. Why was the workload admitted, delayed, rejected, or cancelled?
3. Which cluster, node class, accelerator and software compatibility set ran it?
4. Did the computation complete correctly, rather than merely detect a GPU?
5. Can request, queue, job, GPU health, result and cost evidence be correlated?
6. Can every paid layer be stopped and later removed through an independently
   reviewed lifecycle path?

## Evidence language

Every public document and portfolio statement must use one of these evidence
states:

| Evidence state | Meaning |
| --- | --- |
| Design only | Architecture or contract exists; no executable source or runtime proof is claimed. |
| Source implemented | Terraform, workflow, manifest or application source exists and passes source checks. |
| Locally contract-tested | Deterministic tests validate contracts without claiming cloud runtime behaviour. |
| Sandbox validated | A bounded protected run completed and sanitised evidence was reviewed. |
| Sandbox validated and destroyed | Runtime proof completed and paid resources were removed through the approved teardown path. |

The project must not claim production readiness, fleet-scale GPU operations,
multi-node training, or production Slurm experience. Synthetic data, bounded
capacity, and current lifecycle status must remain explicit.

## Current foundation and unresolved boundaries

The repository already contains useful source foundations:

- a private-EKS reference architecture and protected delivery workflows;
- a VPC-connected CodeBuild runner design and Terraform environment;
- an ARC handoff workflow and runbook;
- a bounded EKS GPU + Kueue source path;
- application Prometheus metrics, a ServiceMonitor, Grafana dashboard assets,
  and kube-prometheus-stack values;
- AgentCore Gateway, Runtime and RAG validation as a separate managed-runtime
  platform path.

These foundations do not yet prove the complete runtime path. Before a paid GPU
run, implementation planning must resolve these boundaries:

1. The private EKS baseline must consume the single approved private-network
   state rather than create overlapping network resources.
2. The private runner needs a dedicated lifecycle workflow and controlled
   outbound GitHub connectivity.
3. Source validation and protected runtime validation must be separate workflow
   modes with different permissions and prerequisites.
4. The destroyed public EKS sandbox reference must not remain the implicit GPU
   target.
5. The current `nvidia-smi` check proves device visibility but not CUDA
   computation.
6. GPU workloads need a dedicated service account, disabled automatic service
   account token, restricted security context, and controlled network egress.
7. A full layered teardown design must exist before the first paid apply, even
   though teardown will not run without a separate later confirmation.
8. The Kubernetes authentication mode, cluster access entries, security-group
   flows, private image pulls, DNS, and endpoint policies require runtime proof.
9. Prometheus and Grafana assets are source-implemented but not yet validated in
   this private sandbox.
10. OpenTelemetry SDK, Collector and end-to-end spans are not yet implemented.

The AgentCore path remains a complementary managed-agent reference. This plan
does not move AgentCore Runtime onto EKS or treat it as a GPU scheduler.

## Target architecture

### Lifecycle and delivery plane

```text
GitHub protected environments
  |
  +-- GitHub-hosted source checks
  |     - formatting, schema, policy and Terraform validation
  |     - no AWS or Kubernetes mutation
  |
  +-- network bootstrap workflow
  |     - short-lived GitHub OIDC role
  |     - VPC, private subnets, endpoints and controlled egress
  |
  +-- VPC-connected CodeBuild ephemeral runner
  |     - private EKS bootstrap, recovery, stop and teardown boundary
  |     - private API, endpoint and worker readiness checks
  |
  +-- private EKS CPU baseline
        - private-only Kubernetes API
        - CPU system node group
        - ARC controller
        - ephemeral ARC runner scale set
              |
              +-- Helm / Argo CD delivery
              +-- Kueue and GPU components
              +-- observability components
              +-- bounded workload releases
```

The CodeBuild runner is outside the cluster failure domain and is therefore the
recovery path. ARC runners are replaceable workload-delivery pods and receive no
VPC, EKS control-plane, or account-recovery authority.

### Controlled egress

Private workers and runners receive no public IP addresses. AWS service traffic
uses reviewed VPC endpoints where practical. GitHub Actions, Helm chart sources,
and other required public dependencies still require outbound connectivity.

For this bounded learning environment, the selected implementation is a
short-lived NAT path with explicit routes, egress rules, cost alarms and
teardown. A larger deployment could replace this with centralised egress,
firewall, proxy and allow-list controls. An endpoint-only design is a different
operating model: it would need pre-mirrored images and charts plus a non-GitHub
native build invocation path. It is not assumed here.

### Workload control plane

Keep a reusable workload definition separate from an individual execution:

**Workload profile**

- workload class and owner;
- approved image digest;
- CPU, memory and accelerator request;
- queue and priority class;
- maximum runtime and retry policy;
- data, network and secret-access policy;
- observability and retention policy;
- budget and concurrency limits.

**Workload execution**

- immutable execution identifier;
- profile version and submitted parameters;
- submission identity and timestamp;
- queue, admission and scheduling history;
- allocated node and accelerator class;
- result, failure or cancellation reason;
- evidence references and cost attribution.

The deterministic execution state machine is:

```text
SUBMITTED -> QUEUED -> ADMITTED -> RUNNING -> SUCCEEDED
                 |         |          |       FAILED
                 |         |          |       CANCELLED
                 |         |          +-----> EXPIRED
                 |         +----------------> REJECTED
                 +--------------------------> CANCELLED
```

Submission is idempotent. Terminal states are immutable. Cancellation is a
request followed by an observed terminal transition, not an optimistic API
response. Maximum queue time and maximum runtime are explicit.

## Observability architecture

The observability chain is:

```text
User request / trace
  -> API and workload control plane
  -> scheduler and queue
  -> Kubernetes Job
  -> node and GPU
  -> AI application and deterministic result
```

Each tool has a distinct role:

| Component | Primary responsibility | Not used as |
| --- | --- | --- |
| OpenTelemetry SDK and Collector | Service spans, trace context, structured logs/metrics export and cross-layer correlation | GPU hardware collector or long-term dashboard |
| Prometheus | Scrape and retain bounded time-series service, Kubernetes, Kueue and GPU metrics | Trace store or unbounded event archive |
| Grafana | Query, dashboard and operational drill-down across approved data sources | Source of truth for workload state |
| DCGM Exporter | NVIDIA GPU utilisation, memory, power, temperature and hardware-health metrics | Job scheduler or cost ledger |
| CloudWatch | AWS service logs, infrastructure evidence, alarms and protected workflow diagnostics | Replacement for workload-level Prometheus signals |
| Kafka, conditional | Durable workload lifecycle events for multiple independent consumers | First-stage metrics or trace transport |

Minimum signal families are:

- API request rate, latency, errors and outcome;
- queue depth, oldest item age, admission decision, retry and preemption;
- job transition count, queue duration, runtime and terminal outcome;
- GPU allocation, utilisation, memory, power, temperature and hardware errors;
- deterministic task goodput and failed-computation count;
- GPU-hours, idle allocation, failed-job waste and bounded cost estimate;
- exporter, scrape and trace-collection health.

Prometheus labels use small reviewed enumerations only. Workload identifiers,
trace identifiers, user identities, repository names and free-form errors must
not become metric labels. Per-execution correlation uses trace context, logs and
an allocation record joined over a bounded time window.

`cloudai_workflow_state_total` remains a transition counter; it must not be
presented as current queue state. Current state requires a gauge or a
control-plane query. ServiceMonitor selectors and the pinned
kube-prometheus-stack release must be explicitly aligned before deployment.

Tempo or another trace store may be selected during implementation, but it is
an implementation choice rather than a required brand in this architecture.

## Security contract

Before the first live GPU workload, the platform must enforce:

- GitHub OIDC and short-lived AWS credentials;
- separate bootstrap, EKS lifecycle and in-cluster runner permissions;
- private worker nodes and no inbound Internet route;
- dedicated namespaces and service accounts;
- `automountServiceAccountToken: false` unless an explicit workload need exists;
- restricted pod security context, seccomp, no privilege escalation, dropped
  capabilities and non-root execution where the image permits it;
- immutable images by digest and reviewed software compatibility versions;
- controlled egress and explicit model, data, registry and telemetry endpoints;
- secrets retrieved at runtime rather than committed or embedded in images;
- sanitised evidence that excludes credentials, state, kubeconfig, account IDs,
  private endpoints and raw provider output;
- independent runner revocation and workload cancellation paths.

The GPU device plugin and DCGM require privileged host integration. Their
permissions, node selection and namespaces must be isolated from ordinary
workloads and documented as explicit platform exceptions.

## FinOps and lifecycle contract

Every paid runtime stage must declare:

- expected hourly and maximum exercise cost;
- instance type and maximum node count;
- maximum run duration and idle timeout;
- alerts and stop conditions;
- evidence retention and deletion policy;
- stop procedure and full teardown dependency order.

The layered teardown design is:

```text
workloads and queued jobs
  -> DCGM / device plugin / Kueue releases
  -> GPU node group and GPU-specific IAM
  -> ARC runner scale set and controller
  -> CPU nodes and EKS control plane
  -> CodeBuild runner foundation
  -> endpoints, NAT and private network
```

Writing and validating this plan is mandatory before apply. Executing it is a
separate destructive action and requires a new exact confirmation. The current
decision is to keep existing learning resources until that later approval.

## Implementation and validation stages

### Stage 0 — Reconcile status and source boundaries

- make public status pages distinguish source from runtime evidence;
- archive or relabel destroyed public-EKS GPU references;
- split source validation from AWS/Kubernetes runtime validation;
- confirm each Terraform environment has one state owner.

**Acceptance:** a reviewer cannot mistake a source check for a live sandbox
validation, and no plan creates overlapping private-network resources.

### Stage 1 — Private network and recovery runner source readiness

- consume one private-network state boundary;
- add the dedicated CodeBuild runner lifecycle workflow;
- define controlled GitHub egress, AWS endpoint, log-delivery and revocation
  checks;
- validate Terraform, workflow, budget and sanitised-evidence contracts without
  a cloud mutation.

**Acceptance:** source validation proves one network owner, a separate runner
state, protected lifecycle modes and fail-closed inputs. No runtime claim is
made.

### Stage 2 — Teardown design and rehearsal

- document layered stop and teardown order;
- implement source-only plan and confirmation gates;
- validate refusal of missing, mismatched and delete-capable confirmations;
- do not execute deletion in this stage.

**Acceptance:** each resource owner and dependency is known, and a reviewer can
prove that no destructive workflow runs without a fresh explicit approval.

### Stage 3 — Workload API and local control plane

- version profile and execution JSON schemas;
- implement deterministic submit, status, cancel, queue and event contracts;
- test idempotency, terminal-state immutability, timeout and retry behaviour;
- keep metadata and evidence safe by default.

**Acceptance:** one synthetic workload follows every positive and negative state
transition locally with deterministic evidence.

### Stage 4 — Local and CI observability proof

- instrument the API/control plane with the OpenTelemetry SDK;
- run an OpenTelemetry Collector, Prometheus and Grafana in a disposable path;
- expose reviewed metrics and trace-linked structured evidence;
- test exporter failure and telemetry-gap detection.

**Acceptance:** a local/CI scenario shows request, queue and result evidence in
Prometheus/Grafana and trace output without high-cardinality labels.

### Stage 5 — Private network and recovery runner runtime validation

- create the bounded private-network layer through its protected workflow;
- start one ephemeral CodeBuild runner through the reviewed lifecycle path;
- prove DNS, required GitHub outbound access, AWS endpoints, log delivery,
  evidence sanitisation, termination and revocation;
- confirm budget alarms and the later teardown path before continuing.

**Acceptance:** the VPC-connected runner starts and terminates, reaches only
approved dependencies, and remains independently recoverable when EKS is
absent.

### Stage 6 — Private EKS CPU baseline

- create the bounded CPU-only private cluster through protected CI;
- prove private API access, node readiness, DNS, image pull, endpoints, logs,
  access entries and security-group flows;
- run a non-GPU Job and exercise stop behaviour.

**Acceptance:** the CPU baseline is sandbox validated with sanitised evidence;
GPU resources remain absent.

### Stage 7 — ARC runtime handoff

- install ARC in a dedicated namespace from the CodeBuild recovery runner;
- create an ephemeral runner scale set with bounded resources and RBAC;
- execute one real GitHub Actions smoke workflow on an ARC runner;
- prove pod ephemerality, secret handling, revocation and uninstall behaviour.

**Acceptance:** the workflow is visibly routed to ARC, completes a bounded
Kubernetes delivery action, and leaves no persistent runner pod or credential.

### Stage 8 — Steady-state platform delivery

- use ARC for reviewed Helm/Argo CD delivery;
- install the pinned observability baseline and Kueue control plane;
- keep cluster/bootstrap operations on the CodeBuild runner;
- validate rollback and drift evidence.

**Acceptance:** ARC delivers a versioned release through the normal GitOps path;
it cannot mutate the VPC or EKS control plane.

### Stage 9 — GPU commissioning

- approve a compatibility matrix for instance, driver, CUDA, device plugin,
  Kubernetes and test image;
- add one bounded GPU node;
- prove node labels, allocatable GPU and device visibility;
- run a deterministic CUDA computation such as vector addition with a known
  expected result.

**Acceptance:** the proof verifies a correct computation, not only
`nvidia-smi`; the node can be scaled to zero after validation.

### Stage 10 — Kueue admission and behavioural cases

- submit the GPU Job through a LocalQueue and ClusterQueue;
- prove accepted, queued, rejected, cancelled, expired and failed cases;
- capture queue wait, admission, execution and terminal evidence;
- prevent direct workload bypass of the approved queue path.

**Acceptance:** positive and negative scenarios produce deterministic,
sanitised evidence and release capacity correctly.

### Stage 11 — GPU observability

- deploy DCGM Exporter through the reviewed delivery path;
- scrape with Prometheus and present bounded Grafana views;
- correlate workload timing with GPU utilisation, memory, power, temperature
  and error signals;
- prove missing telemetry is itself observable.

**Acceptance:** one dashboard and evidence pack connect queue, job, GPU health,
task outcome and estimated cost without identifier labels.

### Stage 12 — Security, reliability and FinOps exercises

- denied image, denied tool/endpoint and denied identity;
- quota exhaustion, queue timeout, job failure and cancellation;
- observability exporter failure and partial telemetry;
- idle capacity, failed-job waste and budget threshold;
- runner revocation, release rollback and scale-to-zero.

**Acceptance:** every scenario has an owner, detection signal, containment action,
recovery path and safe evidence record.

### Stage 13 — Conditional Kafka lifecycle-event proof

Kafka enters only when the workload lifecycle has at least two independent
consumers or requires replay/back-pressure beyond the control-plane store. The
initial proof is disposable and local/CI, not an AWS managed cluster.

If admitted, it must define:

- versioned event schema;
- execution identifier as the partition key;
- ordering and idempotent consumer rules;
- retry and dead-letter handling;
- consumers for status projection, audit evidence, or FinOps aggregation;
- retention and data-classification boundaries.

**Acceptance:** the proof demonstrates a real asynchronous requirement and
safe replay. If the gate is not met, document the decision not to add Kafka.

### Stage 14 — Slurm comparison lab

After the Kubernetes GPU path is complete, create a disposable CPU-only Slurm
lab to practise `sbatch`, `squeue`, `sacct`, priority, cancel, requeue,
drain/resume and accounting. Compare the same workload contract with Kueue.
GPU Slurm is a later option only when quota, budget and a specific learning goal
justify it. Kueue and Slurm must not co-manage the same nodes.

**Acceptance:** the comparison explains when a Kubernetes-native platform or an
HPC scheduler is the better operating model, without claiming fleet experience.

## Dependency map

```text
0 Status/source reconciliation
  -> 1 Network + CodeBuild runner source readiness
       -> 2 Teardown design
            -> 5 Network + CodeBuild runner runtime validation
                 -> 6 Private EKS CPU baseline
                      -> 7 ARC runtime handoff
                           -> 8 Steady-state platform delivery
                                -> 9 GPU commissioning
                                     -> 10 Kueue admission
                                          -> 11 DCGM observability
                                               -> 12 Security/FinOps exercises

3 Workload API/control plane
  -> 4 Local OTel/Prometheus/Grafana
       -> 8 Steady-state platform delivery

12 Completed operational proof
  -> 13 Conditional Kafka proof
  -> 14 Slurm comparison lab
```

No stage may claim runtime validation based only on a downstream source file.
Stages 1 through 4 can proceed without paid AWS resources. Stage 2 is a hard
gate before Stage 5 or any later paid apply.

### Final task map summary

| Task | Deliverable | Depends on | Target evidence |
| --- | --- | --- | --- |
| T0 | Status and source-boundary reconciliation | None | Source implemented |
| T1 | Single-network and CodeBuild runner source readiness | T0 | Source implemented and locally contract-tested |
| T2 | Layered stop/teardown design and refusal tests | T1 | Source implemented and locally contract-tested |
| T3 | Workload profile/execution API and state machine | T0 | Locally contract-tested |
| T4 | Local OTel, Prometheus and Grafana proof | T3 | Locally contract-tested |
| T5 | Private network and CodeBuild runner runtime proof | T1, T2 | Sandbox validated |
| T6 | Private EKS CPU baseline runtime proof | T5 | Sandbox validated |
| T7 | ARC controller, ephemeral scale set and real runner smoke | T6 | Sandbox validated |
| T8 | ARC-based Helm/Argo/Kueue/observability delivery | T4, T7 | Sandbox validated |
| T9 | GPU commissioning and deterministic CUDA result | T8 | Sandbox validated |
| T10 | Kueue positive/negative admission scenarios | T3, T9 | Sandbox validated |
| T11 | DCGM, Prometheus and Grafana GPU evidence | T4, T10 | Sandbox validated |
| T12 | Security, reliability and FinOps failure exercises | T11 | Sandbox validated |
| T13 | Kafka lifecycle-event decision and conditional proof | T12 | Decision record or locally contract-tested proof |
| T14 | Disposable Slurm operations and scheduler comparison | T12 | Locally/lab validated, with no fleet claim |

The tracker may split a task into implementation and runtime-validation children
when their permissions or costs differ. It must preserve these dependencies and
must not mark a parent complete while a required runtime child remains pending.

## Planned file ownership

| Area | Expected repository surface |
| --- | --- |
| Status and task map | `docs/practices/current-status.md`, `docs/project/BACKLOG.md` |
| Network and CodeBuild runner | private-network/private-runner Terraform environments, protected workflows and runner runbook |
| Private EKS CPU baseline | private-EKS Terraform environment, workflow and runbook |
| ARC | ARC handoff workflow, Helm values/policies and runbook |
| Workload control plane | versioned schemas, API/state-machine implementation and deterministic tests |
| Observability | application instrumentation, Collector config, Prometheus/Grafana assets and operational runbook |
| GPU and Kueue | GPU Terraform composition, pinned manifests/charts, tests and protected workflow |
| DCGM | version-pinned release values, recording/alert rules, dashboard and evidence contract |
| Kafka, conditional | local disposable composition, versioned event schemas and consumer contract tests |
| Slurm, later | isolated lab, workload translation and Kueue/Slurm comparison |
| Private learning notes | `_private/docs/notes/` only; never linked from public documentation |

Implementation plans must name exact files only after reconciling the current
branch and merged source state. They must not silently move ignored private
notes into public paths.

## Implementation governance

- Use non-`codex/` task branches following the repository's agreed naming rule.
- Prefer Terraform and protected GitHub Actions over local cloud mutations and
  console click-ops.
- Keep source validation available without AWS credentials or paid resources.
- Require exact confirmations for apply, recovery and destructive operations.
- Review a same-run Terraform plan before apply; do not apply a stale artifact.
- Pin charts and images; record compatibility and rollback boundaries.
- Upload sanitised evidence only.
- Update public status, implementation record, runbook, architecture diagram and
  private learning notes at each validated milestone.
- Synchronise the approved implementation plan with the project tracker after
  written-spec review; do not create overlapping tickets from this design alone.

## Non-goals

- Rehosting AgentCore Runtime on EKS.
- Deploying a large or persistent GPU fleet.
- Multi-node training, HyperPod or production Slurm in the first path.
- Treating Kafka as mandatory observability infrastructure.
- Replacing deterministic workload state with dashboards or generated text.
- Sharing repository source, cloud identifiers, credentials, state, private
  notes or provider-specific sensitive output as portfolio evidence.
- Executing teardown merely because a teardown design exists.

## Final completion criteria

The roadmap is complete only when:

1. the network, runner, cluster and workload boundaries are independently
   recoverable;
2. one real workflow runs on an ephemeral ARC runner;
3. one queued GPU workload produces a deterministic CUDA result;
4. request, queue, job, GPU, result and cost signals are correlated through an
   explicit observability path;
5. positive and negative security/reliability cases are demonstrated;
6. every public claim matches the evidence-state vocabulary;
7. the live sandbox is either intentionally retained with active cost controls
   or removed through a separately approved teardown run.
