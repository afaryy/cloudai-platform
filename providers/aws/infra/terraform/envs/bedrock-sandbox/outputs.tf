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

output "github_actions_bedrock_guardrail_role_name" {
  description = "Name of the separate GitHub Actions role for the guarded Converse smoke test."
  value       = module.bedrock_access.github_actions_bedrock_guardrail_role_name
}

output "bedrock_guardrail_id" {
  description = "Identifier for the Terraform-managed synthetic sandbox Guardrail."
  value       = module.bedrock_access.bedrock_guardrail_id
}

output "bedrock_guardrail_version" {
  description = "Pinned version for the guarded Converse smoke test."
  value       = module.bedrock_access.bedrock_guardrail_version
}
