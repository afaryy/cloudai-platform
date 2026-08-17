# P8i AgentCore RAG data foundation

## CI deployment incident: S3 Vectors creation ordering

The first synthetic data-foundation apply failed during CloudFormation creation even though S3 Vectors is supported in `ap-southeast-2`. `AWS::S3Vectors::Index` received the vector bucket name through a template parameter, so CloudFormation did not infer a dependency on `AWS::S3Vectors::VectorBucket`. The index creation raced the bucket creation and returned `The specified vector bucket could not be found` (HTTP 404); the source bucket and vector bucket were then cancelled during rollback.

The template now declares `DependsOn: VectorBucket` on `VectorIndex`. This keeps the resource lifecycle declarative while making the cross-resource ordering explicit. The protected CI recovery workflow removed the failed `ROLLBACK_COMPLETE` stack before the next apply, and no synthetic source document was uploaded.

The next apply created the complete data foundation successfully, then failed only while uploading the synthetic handbook because the GitHub Terraform role lacked `s3:PutObjectTagging`. The bootstrap policy now grants object tag read/write/delete actions on the narrowly named synthetic source-bucket prefix; the existing stack and vector data remain managed and are not recreated.

The first ingestion attempt then reached `StartIngestionJob` successfully but S3 Vectors rejected a generated record because the Bedrock text and citation metadata were still filterable and exceeded the filterable-metadata limit. The vector index now declares `AMAZON_BEDROCK_TEXT` and `AMAZON_BEDROCK_METADATA` as non-filterable metadata keys, preserving retrieval context without treating large text fields as query filters.

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
5. `ingest` starts and polls a Bedrock Knowledge Base ingestion job through the same protected OIDC role; it uploads a seven-day synthetic evidence artifact.
6. `deploy-plan` and `deploy-apply` create the AgentCore Runtime, Gateway and target.
7. `invoke` signs a request through the IAM-authenticated Gateway target and uploads a seven-day synthetic response artifact. A successful deployment is not treated as an end-to-end result until this response contains an answer, a citation, and `citationPresent=true`.

## Teardown note

The data source and vector resources are tagged `TeardownRequired=true`. If an ingestion job has populated the vector index, the index must be emptied before the CloudFormation stack can delete the vector bucket. Always review `destroy-plan` before teardown.

## AgentCore deployment record — 2026-08-17

The synthetic-only sandbox is now deployed through the protected GitHub Actions/Terraform path:

- arm64 image build and verification: workflow run `32016558170` (immutable image digest recorded in the protected environment variable).
- bootstrap permission updates: workflow runs `32013786218`, `32021683295`, `32022234140`, `32023071204`.
- successful Runtime/Gateway/Target deployment: workflow run `32024230745`.
- final convergence check: workflow run `32024337019`, result `No changes`.

Deployed outputs (account number intentionally omitted):

- Runtime ARN: `arn:aws:bedrock-agentcore:ap-southeast-2:<account>:runtime/cloudaiplatformagentcoreragsandbox-WRwCFJGSvf`
- Gateway URL: `https://cloudai-platform-agentcore-rag-cdpwqgxwvl.gateway.bedrock-agentcore.ap-southeast-2.amazonaws.com`
- Knowledge Base ID: `ZKODO1FLUS`
- Data source ID: `MG4TMXZI3G`

The next functional step is a CI-only Bedrock Knowledge Base ingestion job followed by a synthetic gateway invocation and evidence capture. Deployment success alone does not prove retrieval quality until ingestion and an end-to-end query are completed.

## Functional-closure workflow contract — 2026-08-17

The existing `terraform-agentcore-rag-sandbox` workflow now has two additional protected modes:

- `ingest` requires `I_UNDERSTAND_AGENTCORE_RAG_INGESTION`, reads the Knowledge Base and data-source IDs from remote Terraform state, starts `StartIngestionJob`, polls `GetIngestionJob` until `COMPLETE` or `FAILED`, and uploads only synthetic ingestion statistics.
- `invoke` requires `I_UNDERSTAND_AGENTCORE_RAG_GATEWAY_INVOKE`, reads the Runtime ARN and Gateway URL from remote Terraform state, invokes only the `governed-rag-runtime` Gateway target with the active synthetic fixture, validates the citations-or-abstention contract, and uploads the sanitized response artifact.

The bootstrap execution policy now grants only:

- `bedrock:StartIngestionJob` and `bedrock:GetIngestionJob` on tagged AgentCore Knowledge Bases; and
- `bedrock-agentcore:InvokeGateway` on tagged AgentCore Gateways.

It does not grant a direct Runtime invocation permission to the CI role. This preserves the Gateway-only entry boundary while allowing CI to prove the deployed path.
