# AgentCore Governed RAG Sandbox

This isolated Terraform stack deploys the minimum reviewed boundary for the
public, synthetic-only AgentCore RAG POC:

```text
GitHub Actions (OIDC + environment approval)
  -> Terraform
  -> ECR image repository
  -> AgentCore Runtime (bounded Bedrock retrieval)
  -> AgentCore Gateway (AWS_IAM)
```

The runtime has a single approved Bedrock Knowledge Base and model boundary. Terraform creates a single-region application inference profile from the approved generation foundation model, so Knowledge Base response generation receives a supported profile ARN while inference remains in the sandbox region.
It has no memory, browser, write tools, public anonymous gateway, customer
data, or production-system access.

## Delivery model

Deploy through `.github/workflows/terraform-agentcore-rag-sandbox.yml` only:

1. `validate` checks Terraform without credentials.
2. `bootstrap-plan` / `bootstrap-apply` creates only the ECR and IAM
   foundation; `bootstrap-apply` requires GitHub Environment approval and an
   explicit confirmation string. Copy its `image_publisher_role_arn` output to
   the protected GitHub Environment before the image build.
3. A later image-build workflow will publish an immutable ECR digest.
4. `deploy-plan` / `deploy-apply` creates or updates Runtime, Gateway and
   Gateway Target using that digest; `deploy-apply` also requires approval and
   an explicit confirmation string.
5. `destroy-plan` is review-only. Destruction is intentionally not automated.

Local Terraform use is limited to formatting, validation and tests. Do not use
local credentials or a local AgentCore CLI to create, update or destroy AWS
resources.

## Protected GitHub Environment inputs

Set these in `aws-sandbox`, never in tracked files:

- `AWS_ROLE_TO_ASSUME`
- `AWS_OIDC_PROVIDER_ARN`
- `TF_BACKEND_BUCKET`
- `TF_BACKEND_LOCK_TABLE`
- `TF_STATE_KEY_PREFIX`
- `AGENTCORE_RAG_KNOWLEDGE_BASE_ID`
- `AGENTCORE_RAG_KNOWLEDGE_BASE_ARN`
- `AGENTCORE_RAG_MODEL_ARN`
- `AGENTCORE_RAG_CONTAINER_IMAGE_URI` (immutable `@sha256:` digest)
- `AWS_AGENTCORE_RAG_IMAGE_PUBLISHER_ROLE_TO_ASSUME` (Terraform output from
  the approved bootstrap)

Do not commit account IDs, backend locations, state, tfvars, model approval
evidence, Knowledge Base identifiers, image digests, credentials, prompts or
responses.
`AGENTCORE_RAG_MODEL_ARN` remains the approved foundation-model source;
Terraform derives the Runtime's single-region application inference-profile ARN
from it.
