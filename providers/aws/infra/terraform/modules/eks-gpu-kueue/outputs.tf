output "gpu_node_group_name" {
  description = "Name of the bounded GPU EKS managed node group."
  value       = aws_eks_node_group.gpu_poc.node_group_name
}

output "gpu_namespace" {
  description = "Namespace containing synthetic-only GPU POC resources."
  value       = local.gpu_namespace
}

output "cuda_smoke_job_name" {
  description = "Name of the Kueue-managed synthetic CUDA smoke Job."
  value       = kubernetes_manifest.cuda_smoke_job.manifest.metadata.name
}
