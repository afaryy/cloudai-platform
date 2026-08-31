# Featured Solutions

These cases provide a short, public-safe route through the repository. They show bounded engineering evidence rather than production claims. All examples use synthetic data, generic identifiers, and documented control boundaries.

## Governed AI Gateway

- **Status:** Implemented — mock-first
- **Engineering focus:** Controlled model access and request-policy enforcement
- **Primary technologies:** TypeScript, Node.js, JSON Schema, GitHub Actions, AWS Bedrock adapter boundary

### Problem

Teams need a repeatable way to expose AI capabilities without treating every application request as an unrestricted direct provider call.

### Scope

The local gateway provides mock-default chat, governed RAG metadata, Guardrails-as-a-Service verdicts, request-policy checks, and metadata-only AgentOps decisions. A separately confirmed Bedrock adapter demonstrates the provider-client boundary while leaving mock mode as the default.

### Architecture summary

The [GenAI / LLM gateway](./genai-llm-gateway.md) sits between a client-facing contract and provider-specific clients. The implementation under [providers/aws/app/api](../../providers/aws/app/api) keeps validation, token boundaries, structured metadata, and provider selection explicit.

### Technical evidence

- TypeScript routes, provider-client interfaces, JSON schemas, fixtures, and contract tests.
- Mock mode is the ordinary runtime path; provider mode is an explicit, bounded operator action.
- [Gateway README](../../providers/aws/app/api/README.md) records the API boundary and safe provider-adapter behavior.

### Test or validation evidence

Run `corepack pnpm@11.7.0 --dir providers/aws/app/api test` to compile the API and run the local contract, route, evaluation, and adapter-boundary tests.

### Key trade-offs

- A deterministic mock default favours repeatability and public safety over a permanently connected model service.
- The provider adapter demonstrates integration shape, not broad runtime feature coverage.

### What this demonstrates

How a platform engineer can put contracts, policy checks, usage metadata, and a provider boundary around AI access.

### What it does not claim

It is not a production gateway, persistent audit service, enterprise model catalogue, or unrestricted agent runtime.

## AI Workload Operating Contract and Supplier Readiness Gate

- **Status:** Workload contract is design/future reference; synthetic supplier gate is locally implemented
- **Engineering focus:** AI Factory and AI data-centre workload readiness

### Scope

The [AI Workload Operating Contract](../practices/ai-workload-operating-contract.md) defines a shared operating model for service inference, batch processing, fine-tuning, and future distributed training. It makes ownership, identity, access, capacity, cost, approval, supplier evidence, applicable infrastructure sustainability/location evidence, and shutdown expectations explicit. The [Synthetic AI Supplier Readiness Gate](../practices/ai-supplier-readiness-gate.md) implements one bounded slice using closed schemas, deterministic decisions, and generic managed-service and dedicated-capacity scenarios.

### What this demonstrates

How the existing CloudAI control-plane patterns can extend into a vendor-neutral AI Factory practice track while distinguishing current requirements, announced policy directions, planned standards, and watch items. The gate also demonstrates fail-closed handling of missing evidence and incomplete conditional remediation without changing the portfolio's mock-first operating boundary.

### What it does not claim

It does not implement a GPU cluster, Slurm deployment, distributed training job, Prometheus/Grafana stack, production AI data centre, supplier integration, procurement approval, or regulatory certification.

## Bounded EKS GPU + Kueue POC

- **Status:** Implemented — source path; runtime pending
- **Engineering focus:** One-node GPU admission, queue governance, and
  fail-closed operating controls
- **Primary technologies:** Terraform, Amazon EKS, NVIDIA device plugin,
  Kueue, GitHub Actions OIDC

### Problem

Shared accelerator capacity needs more than a GPU request in a Pod spec. The
platform must make node capacity, identity, queue admission, image provenance,
runtime bounds, cost approval, and shutdown responsibilities explicit.

### Scope

The [EKS GPU + Kueue POC design](./eks-gpu-kueue-poc-design.md) and
[operator runbook](./eks-gpu-kueue-poc-runbook.md) define a Terraform source
path that attaches only to an existing EKS sandbox. It has one on-demand GPU
node at most, scale-to-zero defaults, a pinned NVIDIA device plugin and Kueue
chart, a synthetic CUDA Job, and a protected GitHub Actions lifecycle.

### Technical evidence

- Isolated Terraform module and remote-state environment; no second VPC or
  EKS control plane.
- Digest-pinned synthetic image, exactly one GPU request/limit, five-minute
  active deadline, no retry, and bounded retention.
- Manual `discover`, `preflight`, `plan`, `apply`, `validate`, and `stop` workflow modes;
  protected OIDC, budget flag, existing-cluster check, quota/offering check,
  private operator handoff, and sanitised boolean/category evidence.

### What it does not claim

The source implementation is not a deployed GPU runtime. It has not created
or validated a GPU node, device-plugin allocation, Kueue admission, CUDA Job
completion, DCGM/Prometheus/Grafana telemetry, HyperPod, Slurm, or any
data-centre capacity.

## Private EKS Enterprise AI Target

- **Status:** Implemented — source and protected CI path; runtime pending
- **Engineering focus:** Private worker topology, endpoint-first egress, VPC-connected delivery, and cost/safety boundaries
- **Primary technologies:** Terraform, Amazon VPC, Amazon EKS, VPC endpoints, GitHub Actions OIDC, self-hosted runner contract

### Problem

The low-cost public-subnet EKS sandbox is useful for inexpensive development
validation, but it is not the preferred topology for enterprise worker or GPU
capacity. Enterprise AI workloads need private workers, explicit AWS-service
access, controlled egress, private API operations, and evidence that does not
expose account-specific details.

### Scope

The [private EKS reference architecture](../architecture/private-eks-reference-architecture.md),
[Terraform environment](../../providers/aws/infra/terraform/envs/eks-private-sandbox),
and [protected delivery runbook](./eks-private-sandbox-runbook.md) define a
separate boundary from `eks-sandbox` with three state owners:

- `eks-private-network` owns the VPC, VPC CIDR, controlled public-egress
  subnets, private subnets, routes, endpoints, shared security groups, and the
  optional NAT decision;
- `eks-private-runner` consumes reviewed network remote-state outputs for the
  CodeBuild-hosted ephemeral delivery runner; its protected lifecycle workflow
  is source implemented while dedicated-role and runtime validation are pending;
- `eks-private-sandbox` consumes the same network remote state and owns only
  the EKS control plane, its control-plane security group, and CPU worker
  baseline without recreating network resources.

The resulting source path defines no-public-IP workers, endpoint-first AWS
service access, private-only EKS API intent, and a VPC-connected runner
contract. NAT is an explicit network-state exception and disabled by default.

### Technical evidence

- Terraform native tests cover subnet public-IP prohibition, endpoint-policy
  scope, private DNS, endpoint security-group sources, and the explicit NAT
  exception path.
- Remote-state contract tests prove the EKS composition receives its VPC CIDR,
  private subnets, worker security group, and runner security group from the
  network state rather than copied inputs.
- The protected workflow supports source validation, isolated plan,
  same-run apply preflight, exact endpoint-set checks, sanitised evidence, and
  fail-closed scale-to-zero stop.
- The existing public EKS sandbox remains unchanged and is not reused as the
  private environment's Terraform state.

### What it does not claim

The private EKS worker/bootstrap runtime has not yet been applied or validated.
No private GPU node, Kueue admission, CUDA smoke test, HyperPod, Slurm, or
data-centre capacity is claimed. The shared EKS module's cluster-admin access
is documented as a temporary bootstrap exception until provisioning,
cluster-bootstrap, and namespace-scoped identities are separated.

## AI Release Engineering on EKS

- **Status:** Implemented — sandbox-validated
- **Engineering focus:** Controlled Kubernetes delivery and GitOps operations
- **Primary technologies:** Terraform, Amazon EKS, Helm, Argo CD, GitHub Actions, OIDC

### Problem

AI-facing services need the same disciplined release path as other platform workloads: packaging, policy gates, rollout checks, rollback, access control, and teardown.

### Scope

This implementation packages the mock API with Helm, defines a GitOps application, and documents manually approved validation, release, rollback, cleanup, and destroy paths for a personal sandbox using a synthetic workload.

### Architecture summary

Terraform provides the sandbox foundation; GitHub Actions uses short-lived OIDC access; Helm packages the service; and Argo CD reconciles a pinned revision. The [EKS release engineering guide](./ai-release-engineering-on-eks.md) explains the delivery and cleanup boundaries.

### Technical evidence

- [Helm chart](../../helm/ai-api-service), [Argo CD application](../../argocd/applications/cloudai-api-sandbox.yaml), Terraform, and manual GitHub Actions workflows.
- Explicit release gates, rollback guidance, synthetic-only configuration, and post-exercise teardown.

### Test or validation evidence

The P4e, P4f, and P4g workflow paths are recorded as sandbox-validated in [Current status](../practices/current-status.md), with scoped validation, release, GitOps, health, cleanup, and destroy evidence described in the EKS guide.

### Key trade-offs

- A short-lived personal sandbox demonstrates delivery discipline without presenting a persistent platform service.
- The workload remains mock and synthetic, so Kubernetes operations are evidenced without claiming AI inference on EKS.

### What this demonstrates

How infrastructure, CI/CD, GitOps, rollout verification, rollback, and cost-bounded teardown fit together for an AI-ready delivery platform.

### What it does not claim

It is not a production EKS platform, a live AI inference service, or a reusable enterprise cluster baseline.

## Governed RAG Lifecycle

- **Status:** Implemented — local synthetic workflow
- **Engineering focus:** Knowledge provenance, lifecycle controls, and deterministic quality checks
- **Primary technologies:** Python, JSON artifacts, unit tests, synthetic Markdown sources

### Problem

Retrieval-based AI needs controls around which sources are approved, active, retired, attributable, and suitable for evaluation—not only a retrieval API.

### Scope

The local workflow ingests synthetic Markdown, creates chunk metadata and evaluation artifacts, and scores synthetic mock responses deterministically. The companion gateway contracts model approved-source and metadata boundaries without performing live retrieval.

### Architecture summary

The [RAG knowledge lifecycle](./rag-knowledge-lifecycle.md) links provenance, owner, classification, retention, review, and active/retired state. The implementation in [examples/rag-pattern/python](../../examples/rag-pattern/python) provides the local artifact and quality path.

### Technical evidence

- Python ingestion, chunking, export, evaluation-dataset, and quality-scoring modules.
- Synthetic source documents, sample artifacts, and governed RAG API contracts.

### Test or validation evidence

Run `PYTHONPATH=examples/rag-pattern/python python3 -m unittest discover -s examples/rag-pattern/python/tests` to verify the local ingestion, artifact, evaluation, and scoring workflow.

### Key trade-offs

- Deterministic local scoring makes the portfolio reproducible, but does not represent semantic evaluation by a live model.
- Synthetic Markdown proves lifecycle mechanics without introducing data residency or content-risk concerns.

### What this demonstrates

How platform engineering can treat RAG sources as governed assets with lifecycle and evaluation evidence.

### What it does not claim

It does not provide a vector database, embeddings, provider-backed retrieval, or live RAG answer generation.

## Bounded Bedrock Sandbox

- **Status:** Implemented — bounded synthetic sandbox validation
- **Engineering focus:** Least-privilege model access and narrow Guardrail validation
- **Primary technologies:** Terraform, AWS IAM, GitHub Actions OIDC, Amazon Bedrock, Guardrails

### Problem

Real provider access needs stronger boundaries than a local mock: short-lived identity, explicit approval, narrowly scoped permissions, limited use, and sanitized evidence.

### Scope

The sandbox uses a Terraform-managed access boundary and manually confirmed, synthetic-only validation paths. The scope includes one constrained model-access smoke path, an opt-in gateway adapter boundary, one guarded `Converse` attachment path, and three direct metadata-only Guardrail evaluations.

### Architecture summary

GitHub Actions assumes dedicated short-lived roles through OIDC. Terraform controls the narrowly scoped IAM and Guardrail configuration; workflows require explicit confirmation and emit only sanitized result categories. [The Bedrock sandbox design](./p8-real-bedrock-sandbox-design.md) records the control model and limits.

### Technical evidence

- [Bedrock Terraform environment](../../providers/aws/infra/terraform/envs/bedrock-sandbox), separate IAM boundaries, and protected manual workflow modes.
- [Current status](../practices/current-status.md) records bounded synthetic smoke, guarded attachment, and direct-evaluation validation.

### Test or validation evidence

The manually approved P8c, P8f, and P8g workflow paths provide narrow synthetic validation evidence. The environment README documents the confirmation gates, constrained actions, and sanitized-output rules.

### Key trade-offs

- The boundary deliberately uses tiny, synthetic checks rather than a persistent Bedrock application.
- Guardrail results are narrow configuration evidence, not a claim of real-world safety quality or sensitive-data detection effectiveness.

### What this demonstrates

How to extend cloud-platform controls into a real provider boundary while retaining least privilege, manual approval, cost discipline, and public-safe evidence handling.

### What it does not claim

It is not a production Bedrock service, chatbot, knowledge base, agent runtime, or broad Guardrail effectiveness assessment.

## AgentCore Governed RAG POC

- **Status:** Implemented — sandbox-validated
- **Engineering focus:** Gateway-only agent-runtime access, governed retrieval, citations-or-abstention behavior, and bounded operational evidence
- **Primary technologies:** Terraform, GitHub Actions OIDC, Amazon Bedrock Knowledge Bases, AgentCore Gateway, AgentCore Runtime, IAM, and CloudWatch

### Problem

An enterprise knowledge assistant needs more than a model endpoint. It needs a controlled entry point, approved source lifecycle, read-only retrieval, explicit failure behavior, and evidence that can be reviewed without publishing prompts, answers, credentials, or customer data.

### Scope

The POC uses self-authored synthetic material and a protected CI/CD path to create and validate a bounded Knowledge Base, AgentCore Runtime, Gateway, and Runtime target. The Runtime is reachable through the Gateway contract, direct Runtime bypass is denied, and the response contract requires a citation or a safe abstention.

### Architecture summary

The [AgentCore Governed RAG architecture](../architecture/agentcore-governed-rag-poc.md) places the flow behind a Gateway-only boundary:

```text
synthetic request
  -> Gateway admission and IAM boundary
  -> AgentCore Runtime
  -> approved Knowledge Base retrieval
  -> cited answer or safe abstention
  -> sanitized evidence and CloudWatch signals
```

The [POC runbook](./agentcore-governed-rag-poc-runbook.md) records the protected workflow sequence, confirmation gates, evidence rules, and separately gated teardown boundary.

### Technical evidence

- [AgentCore Runtime implementation](../../providers/aws/app/agentcore-rag-runtime/) with admission, deployment controls, validation, and observability contracts.
- [AgentCore Terraform environment](../../providers/aws/infra/terraform/envs/agentcore-rag-sandbox/) with isolated state and protected workflow modes.
- [Synthetic RAG data foundation](./p8i-agentcore-rag-data-foundation.md) and [key process record](./p8i-agentcore-rag-key-process-record.md).
- Gateway-only IAM target, direct Bedrock preflight, protected ingestion, and sanitized invocation evidence.

### Test or validation evidence

The local contract suite covers admission, direct-runtime bypass denial, disabled and retired-source behavior, insufficient evidence, prompt-attack-shaped blocking, sanitized provider failures, and confirmation gates. Protected CI also validated the synthetic Knowledge Base ingestion path, IAM-authenticated Gateway path, and bounded CloudWatch observability.

The separate [framework-neutral agent evaluation telemetry gate](./agent-evaluation-telemetry-runbook.md)
adds locally contract-tested OpenTelemetry GenAI and OpenInference
normalization, fixed prompts, expected tool trajectories, strict versioned
thresholds, and metadata-only pull-request evidence. Its required CI path does
not call AWS. AgentCore managed evaluation remains an optional protected
provider-parity lane rather than a current runtime claim.

### Key trade-offs

- Synthetic content and read-only retrieval provide reproducible, public-safe evidence but do not represent customer-data quality or production answer accuracy.
- The Gateway and Runtime boundary demonstrates a governed integration pattern; it is not a general autonomous-agent platform.
- CloudWatch evidence is bounded to the sandbox validation and does not claim long-term SLO, SIEM, or enterprise incident-management integration.

### What this demonstrates

How a platform engineer can extend Terraform, OIDC, IAM, CI/CD, RAG governance, deterministic evaluation, and observability controls into a real but deliberately bounded AgentCore provider path.

### What it does not claim

It is not a production autonomous agent platform, customer-facing knowledge assistant, broad model-safety assessment, or unrestricted tool-execution environment. Teardown remains separately confirmed and is not implied by deployment success.
