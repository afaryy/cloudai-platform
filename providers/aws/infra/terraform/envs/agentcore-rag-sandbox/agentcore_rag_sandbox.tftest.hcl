mock_provider "aws" {}

# Break caught: removing the AgentCore Runtime or changing the gateway from
# IAM-authenticated access would make the sandbox deployment unsafe.
run "governed_agentcore_rag_stack" {
  command = plan

  variables {
    github_oidc_provider_arn = "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com"
    container_image_uri      = "111122223333.dkr.ecr.ap-southeast-2.amazonaws.com/cloudai-platform-agentcore-rag@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    knowledge_base_id        = "ABCDEFGHIJ"
    knowledge_base_arn       = "arn:aws:bedrock:ap-southeast-2:111122223333:knowledge-base/ABCDEFGHIJ"
    model_arn                = "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
  }

  assert {
    condition     = output.agent_runtime_name == "cloudaiplatformagentcoreragsandbox"
    error_message = "The sandbox must expose a named AgentCore Runtime rather than an ungoverned application endpoint."
  }

  assert {
    condition     = output.gateway_authorizer_type == "AWS_IAM"
    error_message = "The gateway must retain IAM authentication; it must not become an unauthenticated public endpoint."
  }

  assert {
    condition     = output.image_publisher_role_name == "cloudaiplatformagentcoreragsandbox-image-publisher"
    error_message = "Image publishing must use a dedicated OIDC role rather than the Terraform execution role."
  }
}
