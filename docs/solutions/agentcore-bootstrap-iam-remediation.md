# AgentCore Bootstrap IAM Remediation

## Why Bootstrap failed

The GitHub Actions Terraform execution role authenticated successfully and created a remote-state plan. Its first apply failed because the role lacks `ecr:CreateRepository` and `iam:CreateRole`.

No AgentCore Runtime, Gateway, target, ECR repository, or POC IAM role was created by the failed run.

## Approved remediation boundary

Attach [agentcore-terraform-execution-role-policy.json](agentcore-terraform-execution-role-policy.json) as an inline or customer-managed policy to the existing IAM role referenced by the protected `AWS_ROLE_TO_ASSUME` setting.

The policy is intentionally scoped to the Sydney ECR repository `cloudai-platform-agentcore-rag-sandbox`, IAM roles beginning `cloudaiplatformagentcoreragsandbox-`, tagged AgentCore resources, and `iam:PassRole` only to `bedrock-agentcore.amazonaws.com`.

It does not authorize general IAM administration, general ECR repository management, Bedrock model invocation, Knowledge Base reads, browser access, or autonomous actions. The policy also permits only the tagged, single-sandbox application inference profile lifecycle required by the AgentCore RAG response-generation path.

## Observability apply remediation

The first CloudWatch observability apply ([run 32158283596](https://github.com/afaryy/cloudai-platform/actions/runs/32158283596)) reached Terraform apply but was denied because the Terraform execution role did not yet have `cloudwatch:PutDashboard` or `cloudwatch:PutMetricAlarm`.

The bootstrap template now scopes the additional CloudWatch lifecycle permissions to the named AgentCore RAG observability dashboard and the two named alarms. This remains a CI/CD-managed change: create and review a CloudFormation change set, apply it through the protected bootstrap workflow, then rerun the reviewed AgentCore deploy apply. No console policy edit is required.

The first remediation attempt was rolled back because the existing Terraform execution role inline policy was already at AWS's 10,240-byte maximum. The CloudWatch statements now live in a dedicated `AgentCoreRagTerraformPolicy` managed policy instead of increasing the inline policy size. The same policy now owns the complete AgentCore RAG Terraform lifecycle (ECR, AgentCore Runtime/Gateway, data foundation, source documents, and observability), while the existing `AgentCoreRagFunctionalPolicy` remains limited to runtime invocation and retrieval.

## AWS Console steps

1. Open **IAM** → **Roles**.
2. Find the role whose ARN is stored in GitHub `aws-sandbox` as `AWS_ROLE_TO_ASSUME`.
3. Open **Permissions** → **Add permissions** → **Create inline policy**.
4. Select **JSON** and paste the policy file contents.
5. Confirm the summary shows scoped ECR, IAM, and Bedrock AgentCore permissions only.
6. Name it `cloudai-platform-agentcore-rag-terraform-execution` and create it.
7. In GitHub Actions, run `terraform-agentcore-rag-sandbox` with `mode=bootstrap-plan`.
8. If the plan stays limited to the expected ECR and three IAM roles, rerun `bootstrap-apply` using the same confirmation phrase.

## After a successful Bootstrap

Read `image_publisher_role_arn` from Terraform output and add it to `aws-sandbox` as `AWS_AGENTCORE_RAG_IMAGE_PUBLISHER_ROLE_TO_ASSUME`. Then run the separate image build workflow. Do not run `deploy-apply` until its plan and synthetic Knowledge Base/model boundary are reviewed.

## Sources

- [AWS: Bedrock AgentCore service authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrockagentcore.html)
- [AWS: AgentCore Gateway permissions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-prerequisites-permissions.html)
- [AWS: Amazon ECR service authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ecr.html)
