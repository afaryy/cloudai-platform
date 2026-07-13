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

output "github_actions_principal_arn" {
  description = "GitHub Actions principal ARN configured for sandbox Kubernetes API access."
  value       = var.github_actions_principal_arn
  sensitive   = true
}
