# Cloud Provider Abstraction

The provider abstraction describes a stable contract between the CloudAI Control Plane and cloud-specific services.

## Adapter Capabilities

- Model invocation and routing.
- Agent runtime, tool invocation, and agent gateway integration.
- Retrieval and vector search integration.
- Guardrail, safety policy, and content filtering integration.
- Identity and authorization integration.
- Secrets and key management.
- Logging, metrics, and tracing export.
- Cost and usage reporting.
- Network and endpoint controls.
- Quota, throughput, and capacity metadata.

## AWS First

The repository has a narrow Amazon Bedrock client boundary and bounded synthetic Guardrail validation. A fuller AWS adapter would map the broader capability set to services such as Amazon Bedrock, Amazon Bedrock Guardrails, Amazon Bedrock AgentCore, Amazon SageMaker AI, IAM, KMS, Secrets Manager, CloudWatch, S3, DynamoDB, Lambda, API Gateway, ECS, and EKS.

Azure and GCP adapters remain documentation-only placeholders in early phases. Azure mappings should track Microsoft Foundry, Foundry Models sold by Azure, Azure AI Search, Azure AI Content Safety, Microsoft Entra ID, Key Vault, Azure Monitor, API Management, and Private Link. GCP mappings should track Gemini Enterprise Agent Platform, Vertex AI/Model Garden, Model Armor, Agent Gateway, Agent Runtime, Vector Search, IAM, Cloud KMS, Secret Manager, Cloud Logging, Cloud Monitoring, Private Service Connect, Cloud Run, and GKE.
