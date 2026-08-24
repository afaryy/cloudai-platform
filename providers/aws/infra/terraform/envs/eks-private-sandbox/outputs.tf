output "environment_name" {
  description = "Isolated private EKS environment name."
  value       = var.environment
}

output "vpc_id" {
  description = "Private EKS VPC ID; do not publish live output values."
  value       = module.network.vpc_id
  sensitive   = true
}

output "private_subnet_ids" {
  description = "Private worker subnet IDs; do not publish live output values."
  value       = module.network.private_subnet_ids
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

output "nat_enabled" {
  description = "Whether the optional NAT fallback is enabled."
  value       = module.egress.nat_enabled
}
