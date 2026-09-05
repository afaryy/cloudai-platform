output "environment_name" {
  description = "Isolated private EKS environment name."
  value       = var.environment
}

output "vpc_id" {
  description = "Private EKS VPC ID; do not publish live output values."
  value       = data.terraform_remote_state.network.outputs.vpc_id
  sensitive   = true
}

output "private_subnet_ids" {
  description = "Private worker subnet IDs; do not publish live output values."
  value       = data.terraform_remote_state.network.outputs.private_subnet_ids
  sensitive   = true
}

output "cluster_name" {
  description = "Private EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Private Kubernetes API endpoint; do not publish live output values."
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "node_group_name" {
  description = "Private non-GPU worker node group name."
  value       = module.eks.node_group_name
}

output "node_role_arn" {
  description = "Private worker node role ARN used only for endpoint-policy expansion after zero-worker bootstrap."
  value       = module.eks.node_role_arn
  sensitive   = true
}

output "network_state_consumed" {
  description = "Sanitised category confirming the reviewed private-network state is the source of network inputs."
  value       = data.terraform_remote_state.network.outputs.network_foundation_ready == true
}
