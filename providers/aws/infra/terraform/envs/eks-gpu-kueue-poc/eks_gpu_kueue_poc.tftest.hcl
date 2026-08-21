mock_provider "aws" {
  mock_data "aws_eks_cluster" {
    defaults = {
      name     = "cloudai-platform-eks-sandbox"
      endpoint = "https://eks-sandbox.synthetic.invalid"
      certificate_authority = [
        { data = "Y2Etc2FuZGJveA==" },
      ]
      vpc_config = [
        { vpc_id = "vpc-synthetic" },
      ]
    }
  }

  mock_data "aws_eks_cluster_auth" {
    defaults = {
      token = "synthetic-eks-token"
    }
  }

  mock_data "aws_subnets" {
    defaults = {
      ids = ["subnet-synthetic-a", "subnet-synthetic-b"]
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = "sts:AssumeRole"
            Principal = {
              Service = "ec2.amazonaws.com"
            }
          },
        ]
      })
    }
  }
}

mock_provider "helm" {}

mock_provider "kubernetes" {}

run "attaches_to_existing_cluster_with_one_node_boundary" {
  command = plan

  variables {
    gpu_instance_type   = "g5.xlarge"
    gpu_poc_subnet_ids  = ["subnet-synthetic-a"]
    cuda_smoke_image    = "public.ecr.aws/nvidia/cuda@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    kueue_chart_version = "0.11.0"
  }

  assert {
    condition     = var.eks_cluster_name == "cloudai-platform-eks-sandbox"
    error_message = "The POC must attach to the existing EKS sandbox."
  }

  assert {
    condition     = var.gpu_min_size == 0 && var.gpu_desired_size == 0 && var.gpu_max_size == 1
    error_message = "The POC environment must retain the one-node boundary."
  }

  assert {
    condition     = length(var.gpu_poc_subnet_ids) == 1 && var.gpu_poc_subnet_ids[0] == "subnet-synthetic-a"
    error_message = "The environment must retain the explicitly approved GPU subnet boundary."
  }
}
