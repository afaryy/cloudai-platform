mock_provider "aws" {}

mock_provider "helm" {}

mock_provider "kubernetes" {}

run "keeps_gpu_capacity_and_image_immutable" {
  command = plan

  variables {
    cluster_name                       = "cloudai-eks-sandbox"
    subnet_ids                         = ["subnet-0123456789abcdef0"]
    gpu_node_role_arn                  = "arn:aws:iam::123456789012:role/cloudai-eks-gpu-poc-node"
    gpu_instance_type                  = "g5.xlarge"
    cuda_smoke_image                   = "public.ecr.aws/nvidia/cuda@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    nvidia_device_plugin_chart_version = "0.17.0"
    kueue_chart_version                = "0.11.0"
  }

  assert {
    condition     = var.gpu_min_size == 0 && var.gpu_desired_size == 0 && var.gpu_max_size == 1
    error_message = "GPU POC capacity must be 0/0/1 before an approved run."
  }

  assert {
    condition     = can(regex("@sha256:[a-f0-9]{64}$", var.cuda_smoke_image))
    error_message = "The CUDA smoke image must be immutable by digest."
  }

  assert {
    condition = (aws_eks_node_group.gpu_poc.capacity_type == "ON_DEMAND" &&
      aws_eks_node_group.gpu_poc.scaling_config[0].min_size == 0 &&
    aws_eks_node_group.gpu_poc.scaling_config[0].max_size == 1)
    error_message = "The GPU node group must be on-demand and limited to a single, scale-to-zero node."
  }

  assert {
    condition = (kubernetes_manifest.cuda_smoke_job.manifest.spec.suspend == true &&
      kubernetes_manifest.cuda_smoke_job.manifest.spec.backoffLimit == 0 &&
      kubernetes_manifest.cuda_smoke_job.manifest.spec.activeDeadlineSeconds == 300 &&
    kubernetes_manifest.cuda_smoke_job.manifest.spec.ttlSecondsAfterFinished == 900)
    error_message = "The CUDA smoke Job must be Kueue-managed, short-lived, and non-retrying."
  }
}
