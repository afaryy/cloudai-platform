mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = "sts:AssumeRole"
            Principal = {
              Service = "eks.amazonaws.com"
            }
          }
        ]
      })
    }
  }
}

run "plans_minimal_sandbox_eks_cluster" {
  command = plan

  variables {
    cluster_name                 = "cloudai-platform-eks-sandbox"
    subnet_ids                   = ["subnet-synthetic-a", "subnet-synthetic-b"]
    kubernetes_version           = "1.31"
    endpoint_private_access      = false
    endpoint_public_access       = true
    endpoint_public_access_cidrs = ["203.0.113.10/32"]
    node_instance_types          = ["t3.small"]
    node_desired_size            = 1
    node_min_size                = 1
    node_max_size                = 1
    tags = {
      Project     = "cloudai-platform"
      Environment = "eks-sandbox"
      DataScope   = "synthetic-only"
    }
  }

  assert {
    condition     = aws_eks_cluster.this.name == "cloudai-platform-eks-sandbox"
    error_message = "The EKS cluster must use the expected sandbox name."
  }

  assert {
    condition     = aws_eks_cluster.this.version == "1.31"
    error_message = "The EKS cluster must use the requested Kubernetes version."
  }

  assert {
    condition     = aws_eks_cluster.this.vpc_config[0].endpoint_public_access && !aws_eks_cluster.this.vpc_config[0].endpoint_private_access
    error_message = "The first sandbox path expects a public endpoint and no private endpoint."
  }

  assert {
    condition     = length(aws_eks_cluster.this.vpc_config[0].public_access_cidrs) == 1 && contains(aws_eks_cluster.this.vpc_config[0].public_access_cidrs, "203.0.113.10/32")
    error_message = "The EKS API public access CIDRs must match the provided sandbox boundary."
  }

  assert {
    condition     = aws_eks_node_group.this.node_group_name == "cloudai-platform-eks-sandbox-default"
    error_message = "The managed node group must use the expected default name."
  }

  assert {
    condition     = aws_eks_node_group.this.scaling_config[0].desired_size == 1 && aws_eks_node_group.this.scaling_config[0].min_size == 1 && aws_eks_node_group.this.scaling_config[0].max_size == 1
    error_message = "The first sandbox node group must stay at one node by default."
  }

  assert {
    condition     = length(aws_eks_node_group.this.instance_types) == 1 && contains(aws_eks_node_group.this.instance_types, "t3.small")
    error_message = "The first sandbox node group must use the expected small instance type."
  }
}
