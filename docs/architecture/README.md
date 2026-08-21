# Architecture

Architecture reference material: platform context, reference architectures,
provider boundaries, and future capacity design.

- [CloudAI Architecture](architecture.md) — enterprise context, capability
  layers, platform domains, lifecycle, and evidence boundaries.
- [CloudAI Control Plane](control-plane.md) — platform coordination and
  governance responsibilities.
- [Cloud Provider Abstraction](cloud-provider-abstraction.md) and
  [Multi-Cloud Strategy](multi-cloud-strategy.md) — AWS-first portability
  boundaries.
- [AWS](aws-reference-architecture.md), [Azure](azure-reference-architecture.md),
  and [GCP](gcp-reference-architecture.md) reference architectures.
- [AI Factory Infrastructure Lens](ai-factory-infrastructure-lens.md) —
  future capacity and accelerator context.
- [AI Factory, GPU, and AI Data-Centre Workload Readiness](ai-factory-gpu-workload-readiness.md) —
  workload profiles, accelerator placement, GPU observability, FinOps,
  resilience, and safe future-sandbox gates; no GPU deployment.
- [AI Factory Workload Placement Comparison](ai-factory-workload-placement-comparison.md) —
  design-only routing criteria and correlation-first evidence chain for
  Kubernetes, queue governance, managed training, future HPC, and managed
  inference; no GPU deployment.
- [EKS GPU + Kueue POC Design](../solutions/eks-gpu-kueue-poc-design.md) and
  [runbook](../solutions/eks-gpu-kueue-poc-runbook.md) — a future synthetic GPU
  admission path that attaches only to an active EKS sandbox; it does not claim
  a deployed GPU runtime or authorise EKS recovery, GPU apply, stop, or teardown.
- [AgentCore Governed RAG POC](agentcore-governed-rag-poc.md) — deployed synthetic sandbox with protected ingestion, completed direct-preflight/Gateway verification, and bounded CloudWatch observability
  using a Gateway, Runtime, Knowledge Base, approved inference profile, and synthetic knowledge-retrieval contract.
- [Three-Cloud Governed RAG Reference](three-cloud-governed-rag-reference.md)
  — shared control and evaluation contract with AWS, Azure, and GCP mappings.
- [Architecture Library](architecture-library.md) — the curated entry point
  across the repository.
