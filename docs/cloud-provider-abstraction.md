# Cloud Provider Abstraction

The provider abstraction describes a stable contract between the Enterprise AI Control Plane and cloud-specific services.

## Adapter Capabilities

- Model invocation and routing.
- Identity and authorization integration.
- Secrets and key management.
- Logging, metrics, and tracing export.
- Cost and usage reporting.
- Network and endpoint controls.

## AWS First

The AWS adapter will eventually map these capabilities to services such as Amazon Bedrock, IAM, KMS, Secrets Manager, CloudWatch, S3, DynamoDB, Lambda, API Gateway, and EKS.

Azure and GCP adapters remain documentation-only placeholders in early phases.
