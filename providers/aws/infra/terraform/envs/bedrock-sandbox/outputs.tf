output "github_actions_bedrock_role_name" {
  description = "Name of the GitHub Actions role intended for the future synthetic Bedrock smoke test."
  value       = module.bedrock_access.github_actions_bedrock_role_name
}

output "bedrock_policy_name" {
  description = "Name of the Bedrock smoke-test IAM policy."
  value       = module.bedrock_access.bedrock_policy_name
}

output "allowed_model_resource_count" {
  description = "Number of model resources included in the Bedrock invoke boundary."
  value       = module.bedrock_access.allowed_model_resource_count
}
