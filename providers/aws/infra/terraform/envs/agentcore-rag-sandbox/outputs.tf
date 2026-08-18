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

output "knowledge_base_id" {
  description = "Synthetic-only Bedrock Knowledge Base ID when the data foundation is enabled."
  value       = var.enable_data ? aws_cloudformation_stack.rag_data[0].outputs["KnowledgeBaseId"] : null
}

output "knowledge_base_arn" {
  description = "Synthetic-only Bedrock Knowledge Base ARN for AgentCore runtime access."
  value       = var.enable_data ? aws_cloudformation_stack.rag_data[0].outputs["KnowledgeBaseArn"] : null
}

output "knowledge_base_source_bucket_name" {
  description = "S3 bucket containing the synthetic-only source documents."
  value       = var.enable_data ? aws_cloudformation_stack.rag_data[0].outputs["SourceBucketName"] : null
}

output "knowledge_base_data_source_id" {
  description = "Bedrock data source ID for the synthetic-only documents."
  value       = var.enable_data ? aws_cloudformation_stack.rag_data[0].outputs["DataSourceId"] : null
}

output "agent_runtime_name" {
  description = "The named AgentCore Runtime when runtime deployment is enabled."
  value       = var.enable_runtime ? aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_name : null
}

output "agent_runtime_arn" {
  description = "The AgentCore Runtime ARN when runtime deployment is enabled."
  value       = var.enable_runtime ? aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_arn : null
}

output "generation_model_arn" {
  description = "The approved foundation or system inference profile ARN used for Knowledge Base response generation."
  value       = var.enable_runtime ? var.model_arn : null
}

output "gateway_authorizer_type" {
  description = "Inbound authorizer type; IAM is required for this sandbox."
  value       = var.enable_runtime ? aws_bedrockagentcore_gateway.governed_rag[0].authorizer_type : null
}

output "gateway_url" {
  description = "IAM-authenticated gateway URL when runtime deployment is enabled."
  value       = var.enable_runtime ? aws_bedrockagentcore_gateway.governed_rag[0].gateway_url : null
}
