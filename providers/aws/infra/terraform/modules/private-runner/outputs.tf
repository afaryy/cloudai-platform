output "runner_project_name" {
  description = "CodeBuild project name used in the run-scoped GitHub label."
  value       = aws_codebuild_project.runner.name
}

output "runner_project_arn" {
  description = "CodeBuild project ARN."
  value       = aws_codebuild_project.runner.arn
}

output "runner_service_role_arn" {
  description = "CodeBuild service role ARN; no credentials are output."
  value       = aws_iam_role.runner.arn
}

output "runner_log_group_name" {
  description = "CloudWatch log group for ephemeral runner builds."
  value       = aws_cloudwatch_log_group.runner.name
}

output "runner_ready" {
  description = "Source-level readiness category; runtime readiness still requires the protected workflow."
  value       = true
}

output "runner_network_configured" {
  description = "The project has an explicit VPC, private subnet, and security-group configuration."
  value       = true
}

output "runner_ephemeral" {
  description = "CodeBuild creates a short-lived runner per workflow job."
  value       = true
}

output "runner_security_group_ids" {
  description = "Security groups attached to CodeBuild builds."
  value       = var.security_group_ids
}
