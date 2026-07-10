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
- Amazon SageMaker HyperPod is the capacity reference for large-scale distributed training and GPU-oriented workloads.
- API Gateway, Lambda, ECS, and EKS remain candidate runtime patterns for the project gateway, provider adapter, mock services, and future agent experiments.
- CloudWatch, cost tags, request metadata, and audit events should be treated as required platform signals, not optional logging.

## Current State

The repository contains placeholder folders only. No Terraform resources are defined yet, and no AWS deployment is performed.
