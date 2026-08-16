output "ecr_repository_url" {
  description = "Repository where GitHub Actions publishes immutable runtime image digests."
  value       = aws_ecr_repository.runtime.repository_url
}

output "image_publisher_role_name" {
  description = "Dedicated GitHub OIDC role name allowed to push only this runtime image repository."
  value       = aws_iam_role.image_publisher.name
}

output "image_publisher_role_arn" {
  description = "Dedicated GitHub OIDC role ARN used only by the image-build workflow."
  value       = aws_iam_role.image_publisher.arn
}

output "agent_runtime_name" {
  description = "The named AgentCore Runtime when runtime deployment is enabled."
  value       = var.enable_runtime ? aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_name : null
}

output "agent_runtime_arn" {
  description = "The AgentCore Runtime ARN when runtime deployment is enabled."
  value       = var.enable_runtime ? aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_arn : null
}

output "gateway_authorizer_type" {
  description = "Inbound authorizer type; IAM is required for this sandbox."
  value       = var.enable_runtime ? aws_bedrockagentcore_gateway.governed_rag[0].authorizer_type : null
}

output "gateway_url" {
  description = "IAM-authenticated gateway URL when runtime deployment is enabled."
  value       = var.enable_runtime ? aws_bedrockagentcore_gateway.governed_rag[0].gateway_url : null
}
