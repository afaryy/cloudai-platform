# P8i AgentCore RAG data foundation

## Purpose

The AgentCore runtime needs a real Knowledge Base ID and ARN. The sandbox now creates those dependencies from code instead of accepting hand-written identifiers.

The data foundation is deliberately synthetic-only:

```text
GitHub Actions + Terraform
        |
        v
CloudFormation stack (managed by Terraform)
        |
        +-- encrypted S3 source bucket
        +-- S3 Vectors bucket and 1024-dimension cosine index
        +-- Bedrock Knowledge Base
        +-- Bedrock S3 data source
        |
        v
Terraform uploads one synthetic handbook document
```

## Why CloudFormation is used inside Terraform

The AWS provider version used by this repository manages S3 Vectors indexes, but its Bedrock Knowledge Base S3 Vectors configuration is still evolving. CloudFormation exposes the AWS-native `S3_VECTORS` configuration and the same stack remains controlled by Terraform through `aws_cloudformation_stack`.

This keeps the deployment path declarative and CI-only while avoiding a manual console-created Knowledge Base.

## Security boundaries

- The source bucket is encrypted and blocks public access.
- The Knowledge Base service role can read only the `docs/` prefix, invoke only the embedding model, and access only the named vector index.
- CloudFormation uses a dedicated execution role with only the permissions required for the named data foundation.
- Runtime access remains IAM-scoped to the Knowledge Base ARN and approved generation model ARN.
- The source document is synthetic and contains no customer, employer, credential, or production data.

## CI/CD sequence

1. `bootstrap-plan` plans ECR/IAM plus the synthetic data foundation with `enable_data=true`.
2. `bootstrap-apply` applies the reviewed plan after the exact confirmation phrase.
3. Terraform outputs the real `knowledge_base_id`, `knowledge_base_arn`, source bucket and data source IDs.
4. The sample document is uploaded by Terraform after the stack is available.
5. A later CI step can start a Bedrock ingestion job, then `deploy-plan` and `deploy-apply` can create the AgentCore Runtime, Gateway and target.

## Teardown note

The data source and vector resources are tagged `TeardownRequired=true`. If an ingestion job has populated the vector index, the index must be emptied before the CloudFormation stack can delete the vector bucket. Always review `destroy-plan` before teardown.
