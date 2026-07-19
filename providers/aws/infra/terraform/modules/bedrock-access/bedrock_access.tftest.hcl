mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect   = "Allow"
            Action   = "bedrock:InvokeModel"
            Resource = "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
          }
        ]
      })
    }
  }
}

run "bedrock_access_boundary" {
  command = plan

  variables {
    name_prefix              = "cloudai-platform-bedrock-sandbox"
    github_oidc_provider_arn = "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com"
    github_subject           = "repo:example/cloudai-platform:environment:aws-sandbox"
    allowed_model_arns       = ["arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"]
    tags = {
      Project     = "cloudai-platform"
      Environment = "bedrock-sandbox"
      DataScope   = "synthetic-only"
    }
  }

  assert {
    condition     = aws_iam_role.github_actions_bedrock.name == "cloudai-platform-bedrock-sandbox-bedrock-smoke-test"
    error_message = "The Bedrock sandbox role name should use the expected prefix."
  }

  assert {
    condition     = output.allowed_model_resource_count == 1
    error_message = "The Bedrock invoke boundary should include exactly one model resource in this test."
  }

  assert {
    condition     = aws_bedrock_guardrail_version.sandbox.description == "P8f synthetic guarded Converse smoke-test version."
    error_message = "The Bedrock sandbox must define an explicit Guardrail version for guarded inference."
  }

  assert {
    condition     = aws_iam_role.github_actions_bedrock_guardrail.name == "cloudai-platform-bedrock-sandbox-bedrock-guardrail-smoke-test"
    error_message = "The guarded smoke path must use a separate role from the model-only smoke path."
  }
}
