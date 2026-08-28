output "runner_project_name" {
  description = "CodeBuild project name used to construct the run-scoped runner label."
  value       = module.runner.runner_project_name
}

output "runner_project_arn" {
  description = "CodeBuild project ARN."
  value       = module.runner.runner_project_arn
}

output "runner_service_role_arn" {
  description = "CodeBuild runner service role ARN."
  value       = module.runner.runner_service_role_arn
}

output "runner_log_group_name" {
  description = "CloudWatch log group name for ephemeral runner builds."
  value       = module.runner.runner_log_group_name
}

output "runner_ready" {
  description = "Source-level runner foundation readiness; protected workflow runtime checks remain required."
  value       = module.runner.runner_ready
}

output "runner_network_configured" {
  description = "The runner is explicitly attached to the reviewed private network outputs."
  value       = module.runner.runner_network_configured
}

output "runner_ephemeral" {
  description = "The CodeBuild runner is short-lived per workflow job."
  value       = module.runner.runner_ephemeral
}

output "runner_security_group_ids" {
  description = "Security groups attached to CodeBuild builds."
  value       = module.runner.runner_security_group_ids
  sensitive   = true
}

output "network_state_consumed" {
  description = "Boolean category confirming that the runner consumes the reviewed private-network state."
  value       = true
}
