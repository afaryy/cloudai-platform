# AWS Reference Architecture

AWS is the first implementation provider for this platform.

## Candidate Service Mapping

- Model access: Amazon Bedrock.
- Agent runtime and governance: Amazon Bedrock AgentCore.
- ML lifecycle and GPU-oriented workloads: Amazon SageMaker AI and SageMaker HyperPod.
- API boundary: Amazon API Gateway and AWS Lambda.
- Identity: AWS IAM.
- Encryption: AWS KMS.
- Secrets: AWS Secrets Manager.
- State and metadata: Amazon DynamoDB and Amazon S3.
- Observability: Amazon CloudWatch.
- Runtime options: AWS Lambda, Amazon ECS, and Amazon EKS.
- Future container platform: Amazon EKS.

## AI Platform Considerations

The AWS mapping should separate model access, agent runtime, ML lifecycle, and platform runtime concerns:

- Amazon Bedrock is the primary managed foundation-model and GenAI application service pattern.
- Amazon Bedrock AgentCore is the future reference point for production agent runtime, memory, identity, gateway, observability, and evaluation concepts.
- Amazon SageMaker AI is the ML lifecycle pattern for training, customization, deployment, MLOps, and foundation-model workflows.
- Amazon SageMaker HyperPod is an optional capacity reference for large-scale distributed training, fine-tuning, batch inference, and high-throughput GPU-oriented serving. Its documented EKS and Slurm orchestration options make it a useful architecture pattern for an AI Factory compute plane, not a required project deployment.
- API Gateway, Lambda, ECS, and EKS remain candidate runtime patterns for the project gateway, provider adapter, mock services, and future agent experiments.
- CloudWatch, cost tags, request metadata, and audit events should be treated as required platform signals, not optional logging.

## P4 EKS Sandbox Readiness

P4 keeps EKS release engineering separate from general AWS runtime choices:

- **Public default:** Helm, Kubernetes, Argo CD, release metadata, and rollback examples that can be reviewed without a cloud account.
- **Optional personal sandbox:** Terraform-managed EKS proof of concept in a personal account, using synthetic workloads, manual approval, budget controls, and teardown guidance.
- **Bootstrap pattern:** CloudFormation can create the Terraform state bucket, DynamoDB lock table, and a GitHub Actions IAM role that trusts an existing account-level GitHub OIDC provider.
- **Delivery-plane pattern:** GitHub Actions is the intended control point for Terraform plan/apply, container build and push, Helm deployment, GitOps updates, and teardown.
- **OIDC boundary:** the repository should reuse an existing `token.actions.githubusercontent.com` OIDC provider where one already exists in the account, rather than creating duplicates.
- **Cost boundary:** avoid NAT-heavy defaults and long-lived clusters until the sandbox workload, budget, and teardown process are explicit.

The next real-cloud design step is documented in `docs/p4b-real-eks-sandbox-design.md`. It includes a validate-only Terraform skeleton and keeps the first real deployment focused on EKS, Terraform, GitHub Actions OIDC, Helm, rollout evidence, and teardown before adding Bedrock or Bedrock AgentCore.

Bedrock Guardrails and AgentCore-aligned resources remain later optional extensions. They should not be added to the EKS sandbox until the Terraform backend, identity, release, observability, and cleanup controls are proven with synthetic examples.

## Landing Zone Scale Boundary

This repository uses a small/medium Terraform pattern for a bounded sandbox:

- reusable Terraform modules;
- deployable Terraform stacks;
- environment-specific example values;
- one backend bucket;
- one DynamoDB lock table;
- unique state keys per stack.

That pattern is appropriate for a personal sandbox, portfolio demonstration, or a small number of platform stacks. For tens of stacks, the same structure can still work with GitHub Actions matrix workflows, consistent state-key naming, and clear ownership metadata.

For hundreds, thousands, or more landing zones and AWS accounts, the model should change. Enterprises should not create one hand-written folder per account or landing zone. At that scale, the better pattern is a landing-zone factory:

- account inventory;
- landing-zone blueprint catalog;
- account vending;
- baseline stacks for identity, network, logging, security, and observability;
- policy-as-code;
- AWS Organizations, Control Tower, StackSets, or equivalent baseline rollout mechanisms;
- CI/CD orchestration by account, region, and stack;
- drift detection;
- ownership, cost, and lifecycle metadata.

In that model, Terraform state keys are generated from inventory metadata rather than manually maintained folders, for example:

```text
cloudai-platform/<account-name>/<region>/<stack-name>/terraform.tfstate
```

Terraform workspaces can separate state, but they are not a complete landing-zone operating model. For enterprise landing zones, explicit account and stack identity should come from inventory, IAM role selection, backend key strategy, approval rules, policy controls, and drift detection.

## Terraform Enterprise Workspace Pattern

If a later enterprise reference design uses Terraform Enterprise or HCP Terraform, Terraform Enterprise should own state, run history, variable sets, policy checks, and approvals. Git remains the source of truth for Terraform code, safe examples, and non-sensitive inventory. Secrets and environment-specific values should be stored in Terraform Enterprise variables, variable sets, or an external secret manager rather than committed to the repository.

Use one workspace for each deployable unit that should be planned, approved, applied, locked, and rolled back independently. A landing zone usually contains several deployable units, so the enterprise pattern is not simply one huge workspace per landing zone.

Example workspace shape:

```text
<platform>-<landing-zone>-<region>-<stack>

cloudai-lz-sandbox-ap-southeast-2-account-baseline
cloudai-lz-sandbox-ap-southeast-2-network
cloudai-lz-sandbox-ap-southeast-2-eks
cloudai-lz-sandbox-ap-southeast-2-bedrock
cloudai-lz-sandbox-ap-southeast-2-agent-platform
```

This keeps blast radius, ownership, approval, and rollback boundaries clear. It also avoids very large plans where unrelated network, EKS, IAM, AI service, and runtime changes are reviewed together.

Variable ownership should be separated:

- safe defaults live in `variables.tf`;
- safe examples live in committed `*.tfvars.example` files;
- real non-sensitive environment values live in Terraform Enterprise workspace variables or variable sets;
- sensitive values live in Terraform Enterprise sensitive variables, Vault, AWS Secrets Manager, or equivalent;
- runtime outputs live in Terraform state and outputs;
- business ownership and lifecycle metadata live in an inventory, service catalog, or CMDB.

For the personal sandbox in this repository, GitHub Actions with an S3 backend and DynamoDB locking is the simpler learning path. Terraform Enterprise remains a professional operating-model reference rather than a requirement for the P4b EKS sandbox.

## AI Factory Infrastructure Lens

For the later P7 stretch track, an AWS AI Factory reference pattern separates accountable governance from the platform, runtime, and compute layers. The useful portfolio framing is that an AI Factory is not just a GPU cluster. It is an integrated operating and infrastructure pattern for turning foundation models, enterprise data, AI tools, and compute capacity into repeatable business AI capability.

```text
CDAO or equivalent data-and-AI governance owner
  -> use-case, data, model-risk, Responsible AI, and investment accountability
Central Cloud & AI platform team
  -> landing zones, IAM, network, KMS, CI/CD, model and agent controls, observability, FinOps
AI platform and runtime layer
  -> model access, RAG, agents, evaluation, release gates, runtime policy, and evidence
AI Factory compute plane
  -> SageMaker AI lifecycle services and optional HyperPod accelerated clusters with EKS or Slurm
Product and ML teams
  -> approved training, evaluation, deployment, inference, and operational outcomes
```

The AI Factory lifecycle can be described as:

```text
foundation models + enterprise data + AI tools
  -> evaluation and customization
  -> deployment and inference
  -> monitoring, audit, and cost evidence
  -> feedback and continuous improvement
```

This lifecycle explains why the repository already emphasizes platform controls around inference and agents:

- **Cloud foundations:** Terraform, backend locking, GitHub OIDC, IAM, network, KMS, secrets, and cleanup boundaries.
- **Release engineering:** EKS, Helm, Argo CD, release gates, rollback guidance, and evidence capture.
- **Governance:** governed model access, RAG lifecycle, capability governance, AgentOps policy decisions, and Responsible AI evidence.
- **Operations:** observability, token and cost metadata, budget states, audit events, resilience, and teardown.
- **Future compute plane:** SageMaker AI and optional HyperPod references for training, fine-tuning, batch inference, and high-throughput serving.

The CDAO is an operating-model and governance role, not a service deployed by this repository. HyperPod is similarly a future compute-capacity option. Larger models, longer reasoning, larger context windows, and agentic tool use increase inference cost, telemetry, capacity, and governance pressure; they do not change the current project boundary. Any personal sandbox POC must use synthetic data, no committed credentials or state, a defined budget, and explicit cleanup.

For a provider-aware overview, see `docs/ai-factory-infrastructure-lens.md`.

## Current State

The repository contains synthetic-only scaffold examples. No Terraform apply is performed, no live AWS resources are required, and no account-specific values should be committed.
