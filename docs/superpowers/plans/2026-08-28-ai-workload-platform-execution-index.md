# AI Workload Platform Execution Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the four independently testable implementation plans that deliver the approved T0–T14 AI workload platform roadmap.

**Architecture:** Foundation/recovery, workload control plane, GPU operations, and optional event/HPC learning remain separate review units. The index preserves dependencies, evidence status and protected runtime gates across those units.

**Tech Stack:** Terraform, GitHub Actions OIDC, CodeBuild, EKS, ARC, TypeScript, OpenTelemetry, Prometheus, Grafana, Kueue, CUDA, DCGM, Kafka and Slurm

**Spec:** `docs/superpowers/specs/2026-08-28-ai-workload-platform-roadmap-design.md`

## Global Constraints

- This index does not authorise implementation or cloud mutation by itself.
- Execute tasks in dependency order; parallelise only tasks whose dependencies are complete.
- Keep source implementation and runtime validation as separate tracker issues when permissions or costs differ.
- Do not mark a parent complete while a required runtime child is pending.
- Use non-`codex/` task branches.
- Update public status, runbook and architecture evidence at every sandbox-validated milestone.
- Keep private runtime and interview notes under `_private/` and out of Git.
- Require fresh exact confirmations for apply, recovery and destructive operations.

---

## Plan set

| Plan | Scope | Roadmap tasks |
| --- | --- | --- |
| `2026-08-28-private-eks-runner-arc-implementation-plan.md` | Network ownership, CodeBuild recovery runner, teardown design, private EKS CPU and ARC | T0, T1, T2, T5, T6, T7 |
| `2026-08-28-workload-control-plane-observability-implementation-plan.md` | Execution contracts/API, deterministic state, OTel, Prometheus and Grafana | T3, T4 |
| `2026-08-28-gpu-kueue-dcgm-implementation-plan.md` | ARC/Argo delivery, GPU/CUDA, Kueue, DCGM, security, reliability and FinOps | T8, T9, T10, T11, T12 |
| `2026-08-28-kafka-slurm-learning-implementation-plan.md` | Kafka decision/proof and disposable Slurm comparison | T13, T14 |

## Tracker mapping

| Task | Tracker issue title | Parent | Blocked by | Completion evidence |
| --- | --- | --- | --- | --- |
| T0 | Reconcile AI workload platform status and validation modes | AI workload platform execution | None | Source and runtime states are unambiguous |
| T1 | Make private network and CodeBuild runner source-ready | AI workload platform execution | T0 | Terraform/workflow tests pass without AWS mutation |
| T2 | Add layered private platform teardown planning gate | AI workload platform execution | T1 | Refusal tests pass; no delete execution exists |
| T3 | Implement deterministic workload execution control plane | AI workload platform execution | T0 | Submit/status/cancel/events tests pass |
| T4 | Prove local OTel, Prometheus and Grafana chain | AI workload platform execution | T3 | Disposable local smoke and telemetry-gap tests pass |
| T5 | Validate private network and CodeBuild recovery runner | AI workload platform execution | T1, T2 | Protected sanitised runtime evidence |
| T6 | Validate private EKS CPU baseline | AI workload platform execution | T5 | Private API, CPU node and Job evidence |
| T7 | Validate ARC ephemeral runner handoff | AI workload platform execution | T6 | Real ARC-routed workflow and pod cleanup evidence |
| T8 | Deliver platform components through ARC and Argo CD | AI workload platform execution | T4, T7 | Pinned GitOps sync and rollback evidence |
| T9 | Prove bounded GPU commissioning and deterministic CUDA | AI workload platform execution | T8 | Device visibility, vector-add result and scale-to-zero |
| T10 | Validate Kueue positive and negative admission cases | AI workload platform execution | T3, T9 | Six deterministic admission/outcome cases |
| T11 | Correlate DCGM, Prometheus and Grafana GPU evidence | AI workload platform execution | T4, T10 | Queue/job/GPU/result/cost operational view |
| T12 | Exercise GPU security, reliability and FinOps controls | AI workload platform execution | T11 | Detection, containment, recovery and cost cases |
| T13 | Decide and conditionally prove Kafka lifecycle events | AI workload platform execution | T12 | Decision record or disposable local proof |
| T14 | Build disposable Slurm operations comparison lab | AI workload platform execution | T12 | CPU scheduler-operation and comparison evidence |

## Execution waves

### Wave 1 — No paid resources

- [ ] T0: reconcile status and validation modes.
- [ ] T1: make network/runner source-ready.
- [ ] T2: complete teardown planning and refusal tests.
- [ ] T3: implement the deterministic workload control plane.
- [ ] T4: prove local observability.

T3 may run in parallel with T1/T2 after T0. T4 follows T3. T5 remains blocked
until T2 is reviewed.

### Wave 2 — Private platform runtime

- [ ] T5: validate the private network and CodeBuild runner.
- [ ] T6: validate private EKS CPU.
- [ ] T7: install ARC and execute a real ephemeral runner smoke.
- [ ] T8: deliver reviewed platform components through ARC/Argo.

Each task requires a protected runtime approval. A failure stops the wave and
returns to the CodeBuild recovery path; it does not skip forward.

### Wave 3 — Bounded GPU operations

- [ ] T9: commission one GPU and prove deterministic CUDA.
- [ ] T10: validate all Kueue behavioural cases.
- [ ] T11: prove DCGM/Prometheus/Grafana correlation.
- [ ] T12: run security, reliability and FinOps exercises.

The GPU node scales to zero in the exercise cleanup even when validation fails.
Full cluster/network teardown is a separate approval.

### Wave 4 — Conditional adjacent capabilities

- [ ] T13: make the Kafka decision; stop if the gate rejects adoption.
- [ ] T14: run the isolated CPU-only Slurm lab and publish the comparison.

Neither task blocks the validated Kubernetes GPU story. They extend learning
without changing the main platform runtime.

## Review and commit rule

For every tracker issue:

1. create a non-`codex/` branch named from the tracker identifier and outcome;
2. write a failing deterministic test;
3. run it and capture the expected failure;
4. implement the smallest complete change;
5. run focused tests and the relevant full suite;
6. update architecture, runbook, status and private learning record when needed;
7. commit only the issue scope;
8. open a PR and wait for checks/review before merge;
9. update the tracker with commit, PR, tests and honest evidence state;
10. begin the next dependency only after merge.

## Runtime approval rule

Source-complete tracker issues may create separate runtime-validation children.
Those children must identify:

```text
protected environment
workflow and mode
expected maximum cost and duration
exact confirmation phrase
stop/cleanup owner
sanitised evidence artifact
rollback or recovery route
```

The tracker description must never contain secrets, cloud account identifiers,
private subnet IDs, role ARNs, kubeconfig, state output or raw provider logs.
