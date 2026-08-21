output "existing_cluster_name" {
  description = "Name of the existing EKS sandbox this POC attaches to."
  value       = data.aws_eks_cluster.existing.name
}

output "existing_cluster_endpoint" {
  description = "Existing EKS endpoint; treat as private operational data."
  value       = data.aws_eks_cluster.existing.endpoint
  sensitive   = true
}

output "existing_cluster_certificate_authority" {
  description = "Existing EKS certificate authority data; treat as private operational data."
  value       = data.aws_eks_cluster.existing.certificate_authority[0].data
  sensitive   = true
}

output "gpu_node_group_name" {
  description = "Name of the bounded GPU managed node group."
  value       = module.gpu_kueue.gpu_node_group_name
}

output "gpu_namespace" {
  description = "Synthetic-only GPU POC namespace."
  value       = module.gpu_kueue.gpu_namespace
}
