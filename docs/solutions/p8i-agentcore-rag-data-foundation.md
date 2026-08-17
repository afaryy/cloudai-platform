# P8i AgentCore RAG data foundation

## CI deployment incident: S3 Vectors creation ordering

The first synthetic data-foundation apply failed during CloudFormation creation even though S3 Vectors is supported in `ap-southeast-2`. `AWS::S3Vectors::Index` received the vector bucket name through a template parameter, so CloudFormation did not infer a dependency on `AWS::S3Vectors::VectorBucket`. The index creation raced the bucket creation and returned `The specified vector bucket could not be found` (HTTP 404); the source bucket and vector bucket were then cancelled during rollback.

The template now declares `DependsOn: VectorBucket` on `VectorIndex`. This keeps the resource lifecycle declarative while making the cross-resource ordering explicit. The protected CI recovery workflow removed the failed `ROLLBACK_COMPLETE` stack before the next apply, and no synthetic source document was uploaded.

The next apply created the complete data foundation successfully, then failed only while uploading the synthetic handbook because the GitHub Terraform role lacked `s3:PutObjectTagging`. The bootstrap policy now grants object tag read/write/delete actions on the narrowly named synthetic source-bucket prefix; the existing stack and vector data remain managed and are not recreated.

The first arm64 image verification also exposed a separate least-privilege gap: the dedicated image-publisher role could push to ECR but could not pull its own digest for CI architecture verification. Terraform now grants only `ecr:GetDownloadUrlForLayer` alongside its existing repository-scoped push and manifest-read actions.

The first AgentCore runtime deployment reached AWS but was denied while AgentCore attempted to create its runtime-identity service-linked role. The Terraform execution role now grants only the narrowly scoped `iam:CreateServiceLinkedRole` permission for `runtime-identity.bedrock-agentcore.amazonaws.com`.

AgentCore's create flow validates both the default workload-identity directory ARN and the child workload-identity ARN pattern. The bootstrap policy grants only those two resource shapes for `bedrock-agentcore:CreateWorkloadIdentity`; it does not broaden the action to all AgentCore resources.

The Runtime and Gateway resources then created successfully, but the first Gateway Target apply rejected `credential_provider_configuration.gateway_iam_role`: AgentCore Runtime targets do not support `IamCredentialProvider` (that provider is for MCP, OpenAPI, and Passthrough targets). The target configuration now relies on the Runtime target type without that unsupported block.

The follow-up read showed the target API/provider normalizes the supported Runtime authorization as an empty `gateway_iam_role {}` block. The Terraform configuration uses that empty block (without `service` or `region`) so the provider emits the Runtime-compatible `GATEWAY_IAM_ROLE` type instead of the unsupported nested IAM credential provider.

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
