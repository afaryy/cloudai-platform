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

run "bedrock_sandbox_stack" {
  command = plan

  variables {
    github_oidc_provider_arn = "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com"
    allowed_model_arns       = ["arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"]
  }

  assert {
    condition     = output.allowed_model_resource_count == 1
    error_message = "The Bedrock sandbox stack should preserve an explicit model resource boundary."
  }
}
