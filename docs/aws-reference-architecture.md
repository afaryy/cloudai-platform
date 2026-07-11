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

## AI Factory Operating Model

For the later P7 stretch track, an AWS AI Factory reference pattern separates accountable governance from the platform and compute layers:

```text
CDAO or equivalent data-and-AI governance owner
  -> use-case, data, model-risk, Responsible AI, and investment accountability
Central Cloud & AI platform team
  -> landing zones, IAM, network, KMS, CI/CD, model and agent controls, observability, FinOps
AI Factory compute plane
  -> SageMaker AI lifecycle services and optional HyperPod accelerated clusters with EKS or Slurm
Product and ML teams
  -> approved training, evaluation, deployment, inference, and operational outcomes
```

The CDAO is an operating-model and governance role, not a service deployed by this repository. HyperPod is similarly a future compute-capacity option. Any personal sandbox POC must use synthetic data, no committed credentials or state, a defined budget, and explicit cleanup.

## Current State

The repository contains placeholder folders only. No Terraform resources are defined yet, and no AWS deployment is performed.
