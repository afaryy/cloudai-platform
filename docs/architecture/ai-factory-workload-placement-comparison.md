# AI Factory Workload Placement Comparison

## Purpose and boundary

This is a design-only comparison for YY-11. It does not provision GPU nodes,
install a scheduler, create a managed training environment, or reserve data-
centre capacity. The comparison uses synthetic workload contracts and asks one
question:

> Which execution pattern gives a workload the right capacity, control,
> evidence, and recovery boundary without overbuilding the platform?

## Placement options

| Option | Best fit | Control boundary | Main strength | Main trade-off |
| --- | --- | --- | --- | --- |
| Kubernetes scheduler + GPU device plugin | Interactive inference, agent/RAG inference, small batch jobs | Namespace, quota, workload identity, node labels/taints, network policy | Familiar platform primitives and flexible application integration | The platform team owns drivers, node lifecycle, scheduling policy, telemetry, and cost attribution |
| Kubernetes + Kueue-style queue governance | Batch inference, fine-tuning, shared accelerator pools | Queue, cohort, quota, priority, admission, preemption | Makes scarce capacity and fair-share policy explicit before a job starts | Adds queue governance and requires clear resource-flavour and recovery contracts |
| Managed training or HyperPod/EKS | Fine-tuning and distributed training with repeatable managed operations | Managed task lifecycle, cluster policy, checkpoint/restart, usage reporting | Provides purpose-built lifecycle and capacity patterns for larger jobs | More service coupling, longer setup, and higher operational/cost complexity |
| Future HPC/data-centre fabric | Large distributed training and tightly coupled workloads | Reservation, topology, fabric, storage, power, cooling, site resilience | Supports high-throughput multi-node workloads and predictable placement | Requires specialist operations, physical capacity planning, and significant capital or reservation commitment |
| Managed inference endpoint | Stable interactive inference with a clear SLO | Endpoint IAM, model version, autoscaling, request budget, regional fallback | Lowest application-team scheduling burden | Less control over placement, queue fairness, and low-level accelerator utilisation |

## Decision matrix

Score each option against the workload contract rather than choosing a platform
by product familiarity. A score of `3` means the option is a strong default,
`2` means it needs compensating controls, and `1` means it is a poor fit.

| Criterion | Kubernetes | Kubernetes + queue governance | Managed training / HyperPod | Future HPC/data-centre | Managed endpoint |
| --- | ---: | ---: | ---: | ---: | ---: |
| Interactive latency | 3 | 2 | 1 | 1 | 3 |
| Bursty multi-call agent/RAG work | 3 | 3 | 2 | 1 | 3 |
| Batch cost efficiency | 2 | 3 | 3 | 2 | 1 |
| Fine-tuning lifecycle | 2 | 3 | 3 | 2 | 1 |
| Distributed-training topology | 1 | 2 | 3 | 3 | 1 |
| Developer self-service | 3 | 2 | 2 | 1 | 3 |
| Platform ownership and portability | 3 | 3 | 2 | 1 | 2 |
| Operational simplicity | 2 | 2 | 2 | 1 | 3 |
| Cost attribution and stop control | 2 | 3 | 3 | 2 | 2 |

The scores are architecture heuristics, not benchmark results. They should be
replaced with measured latency, queue, goodput, utilisation, failure-recovery,
and cost evidence before a real placement decision.

## Recommended routing by synthetic profile

| Synthetic profile | Initial placement recommendation | Admission evidence required |
| --- | --- | --- |
| Agent/RAG inference | Kubernetes or managed endpoint | latency, trace correlation, tool boundary, human escalation, request/token budget |
| Batch inference | Kubernetes with queue governance | queue wait, retry/preemption, completion, GPU-hours, cost ceiling |
| Fine-tuning | Managed training or HyperPod/EKS reference | dataset lineage, checkpoint duration, evaluation gate, reserved quota, spend stop |
| Distributed training | Future HPC or managed training reference | gang scheduling, topology, fabric/storage throughput, checkpoint/restart, energy estimate |
| Embeddings/RAG indexing | Queue worker with CPU/GPU mix | freshness, idempotency, provenance, source lifecycle, storage and ingestion cost |

## Fail-closed placement gate

An execution option is not eligible merely because it has available
accelerators. The placement gate must deny admission when any of the following
is missing:

1. named owner and shutdown owner;
2. synthetic-public or explicitly approved data classification;
3. approved image and model version;
4. capacity/quota decision and maximum accelerator count;
5. budget owner, cost ceiling, and automatic stop condition;
6. telemetry, alert owner, and workload outcome signals;
7. checkpoint, retry, pause, rollback, and teardown path where applicable;
8. evidence retention and human approval for high-risk actions.

## Interview-ready architecture statement

> I would route workloads by behaviour and operating constraints, not by
> choosing one universal GPU platform. Interactive agent/RAG workloads need
> low-latency runtime and traceable tool access; batch and fine-tuning need
> queue fairness, checkpointing, and cost stops; distributed training needs
> topology-aware placement, high-throughput storage/fabric, and restart
> evidence. The platform gate should make those requirements explicit before
> any scarce accelerator capacity is admitted.

## Next safe experiment

The next experiment should remain metadata-only:

1. Take the four synthetic profiles and score each placement option.
2. Record the expected signals and fail-closed controls.
3. Compare the score with a hypothetical quota and budget envelope.
4. Do not create GPU capacity until a separate sandbox design is approved.

## References

- [Kubernetes: Schedule GPUs](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
- [Kueue documentation](https://kueue.sigs.k8s.io/docs/)
- [Amazon SageMaker HyperPod](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod.html)
- [HyperPod usage reporting](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-usage-reporting.html)
