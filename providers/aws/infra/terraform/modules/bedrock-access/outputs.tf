output "github_actions_bedrock_role_name" {
  description = "Name of the GitHub Actions role intended for the future synthetic Bedrock smoke test."
  value       = aws_iam_role.github_actions_bedrock.name
}

output "bedrock_policy_name" {
  description = "Name of the Bedrock smoke-test IAM policy."
  value       = aws_iam_policy.bedrock_smoke_test.name
}

output "allowed_model_resource_count" {
  description = "Number of model resources included in the Bedrock invoke boundary."
  value       = length(local.model_resources)
}
