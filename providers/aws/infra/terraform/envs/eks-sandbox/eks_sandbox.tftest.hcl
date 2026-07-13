mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]
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
              Service = "eks.amazonaws.com"
            }
          }
        ]
      })
    }
  }
}

run "plans_eks_sandbox_environment_defaults" {
  command = plan

  variables {
    github_actions_principal_arn = "arn:aws:iam::123456789012:role/cloudai-platform-aws-sandbox-terraform"
    local_operator_principal_arn = "arn:aws:iam::123456789012:user/yvonne-eks-sandbox"
  }

  assert {
    condition     = var.project_name == "cloudai-platform"
    error_message = "The sandbox project name must remain aligned to the repository name."
  }

  assert {
    condition     = var.environment == "eks-sandbox"
    error_message = "The sandbox environment must remain eks-sandbox."
  }

  assert {
    condition     = module.eks.cluster_name == "cloudai-platform-eks-sandbox"
    error_message = "The environment must create the expected EKS cluster name."
  }

  assert {
    condition     = length(module.network.public_subnet_ids) == length(var.public_subnet_cidrs)
    error_message = "The environment must create one public subnet per configured CIDR."
  }

  assert {
    condition     = var.vpc_cidr == "10.42.0.0/24" && alltrue([for cidr in var.public_subnet_cidrs : endswith(cidr, "/26")])
    error_message = "The default sandbox network must use a small VPC and /26 subnets."
  }

  assert {
    condition     = !contains(var.endpoint_public_access_cidrs, "0.0.0.0/0") && alltrue([for cidr in var.endpoint_public_access_cidrs : endswith(cidr, "/32")])
    error_message = "The default sandbox endpoint boundary must use explicit /32 public access CIDRs only."
  }

  assert {
    condition     = var.node_desired_size == 1 && var.node_min_size == 1 && var.node_max_size == 1
    error_message = "The default sandbox node group must remain bounded to one node."
  }

  assert {
    condition     = local.common_tags.DataScope == "synthetic-only" && local.common_tags.CostBoundary == "personal-sandbox" && local.common_tags.TeardownRequired == "true"
    error_message = "The sandbox must keep synthetic data, personal cost, and teardown tags."
  }

  assert {
    condition     = module.eks.github_actions_principal_arn == "arn:aws:iam::123456789012:role/cloudai-platform-aws-sandbox-terraform"
    error_message = "The environment must pass the GitHub Actions identity into the EKS module."
  }
}
