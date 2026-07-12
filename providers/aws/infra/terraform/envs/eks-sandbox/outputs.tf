output "vpc_id" {
  description = "Sandbox VPC ID. Do not commit live output values."
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "Sandbox public subnet IDs. Do not commit live output values."
  value       = module.network.public_subnet_ids
}

output "cluster_name" {
  description = "Sandbox EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Sandbox EKS cluster endpoint. Do not commit live output values."
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "node_group_name" {
  description = "Sandbox EKS managed node group name."
  value       = module.eks.node_group_name
}
