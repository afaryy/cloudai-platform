output "cluster_name" {
  description = "Sandbox EKS cluster name."
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "Sandbox EKS cluster endpoint. Do not commit live output values."
  value       = aws_eks_cluster.this.endpoint
  sensitive   = true
}

output "cluster_certificate_authority_data" {
  description = "Sandbox EKS cluster certificate authority data. Do not commit live output values."
  value       = aws_eks_cluster.this.certificate_authority[0].data
  sensitive   = true
}

output "node_group_name" {
  description = "Sandbox EKS managed node group name."
  value       = aws_eks_node_group.this.node_group_name
}

output "cluster_security_group_id" {
  description = "Primary EKS cluster security group ID."
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "endpoint_private_access" {
  description = "Whether the EKS Kubernetes API private endpoint is enabled."
  value       = var.endpoint_private_access
}

output "endpoint_public_access" {
  description = "Whether the EKS Kubernetes API public endpoint is enabled."
  value       = var.endpoint_public_access
}

output "cluster_security_group_ids" {
  description = "Additional control-plane security groups configured for the cluster."
  value       = var.cluster_security_group_ids
}

output "github_actions_principal_arn" {
  description = "GitHub Actions principal ARN configured for sandbox Kubernetes API access."
  value       = var.github_actions_principal_arn
  sensitive   = true
}
