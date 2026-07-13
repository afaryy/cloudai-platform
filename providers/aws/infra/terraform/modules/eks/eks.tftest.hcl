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
    endpoint_private_access      = true
    endpoint_public_access       = true
    endpoint_public_access_cidrs = ["203.0.113.10/32"]
    github_actions_principal_arn = "arn:aws:iam::123456789012:role/cloudai-platform-aws-sandbox-terraform"
    local_operator_principal_arn = "arn:aws:iam::123456789012:user/yvonne-eks-sandbox"
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
    condition     = aws_eks_cluster.this.access_config[0].authentication_mode == "API_AND_CONFIG_MAP"
    error_message = "The EKS cluster must enable API authentication mode before Terraform can manage access entries."
  }

  assert {
    condition     = aws_eks_cluster.this.vpc_config[0].endpoint_public_access && aws_eks_cluster.this.vpc_config[0].endpoint_private_access
    error_message = "The sandbox EKS API must enable private access and restrict public access."
  }

  assert {
    condition     = length(aws_eks_cluster.this.vpc_config[0].public_access_cidrs) == 1 && contains(aws_eks_cluster.this.vpc_config[0].public_access_cidrs, "203.0.113.10/32")
    error_message = "The EKS API public access CIDRs must match the provided sandbox boundary."
  }

  assert {
    condition     = !contains(aws_eks_cluster.this.vpc_config[0].public_access_cidrs, "0.0.0.0/0")
    error_message = "The sandbox EKS API must not allow public access from 0.0.0.0/0."
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

  assert {
    condition     = aws_eks_access_entry.github_actions.principal_arn == "arn:aws:iam::123456789012:role/cloudai-platform-aws-sandbox-terraform"
    error_message = "The EKS module must grant access to the GitHub Actions identity."
  }

  assert {
    condition     = aws_eks_access_entry.local_operator[0].principal_arn == "arn:aws:iam::123456789012:user/yvonne-eks-sandbox"
    error_message = "The EKS module must grant optional access to the local operator identity."
  }

  assert {
    condition     = aws_eks_access_policy_association.github_actions.policy_arn == "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
    error_message = "The GitHub Actions identity must use the sandbox cluster-admin access policy."
  }
}

run "defaults_restrict_eks_api_endpoint" {
  command = plan

  variables {
    cluster_name                 = "cloudai-platform-eks-sandbox"
    subnet_ids                   = ["subnet-synthetic-a", "subnet-synthetic-b"]
    github_actions_principal_arn = "arn:aws:iam::123456789012:role/cloudai-platform-aws-sandbox-terraform"
    node_instance_types          = ["t3.small"]
  }

  assert {
    condition     = aws_eks_cluster.this.vpc_config[0].endpoint_public_access && aws_eks_cluster.this.vpc_config[0].endpoint_private_access
    error_message = "The default sandbox EKS API posture must enable private access while keeping restricted public access."
  }

  assert {
    condition     = !contains(aws_eks_cluster.this.vpc_config[0].public_access_cidrs, "0.0.0.0/0") && alltrue([for cidr in aws_eks_cluster.this.vpc_config[0].public_access_cidrs : endswith(cidr, "/32")])
    error_message = "The default sandbox EKS API public boundary must use explicit /32 CIDRs and must not use 0.0.0.0/0."
  }
}

run "rejects_open_eks_api_endpoint" {
  command = plan

  variables {
    cluster_name                 = "cloudai-platform-eks-sandbox"
    subnet_ids                   = ["subnet-synthetic-a", "subnet-synthetic-b"]
    github_actions_principal_arn = "arn:aws:iam::123456789012:role/cloudai-platform-aws-sandbox-terraform"
    endpoint_public_access_cidrs = ["0.0.0.0/0"]
  }

  expect_failures = [
    var.endpoint_public_access_cidrs
  ]
}
