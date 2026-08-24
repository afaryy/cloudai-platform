mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]
    }
  }

  mock_data "aws_region" {
    defaults = {
      name = "ap-southeast-2"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = jsonencode({
        Version   = "2012-10-17"
        Statement = [{ Effect = "Allow", Action = ["*"], Resource = ["*"] }]
      })
    }
  }
}

run "plans_isolated_private_worker_environment" {
  command = plan

  variables {
    github_actions_principal_arn      = "arn:aws:iam::123456789012:role/private-eks-runner"
    delivery_runner_security_group_id = "sg-0123456789abcdef0"
    private_artifact_bucket_arns      = ["arn:aws:s3:::cloudai-platform-private-artifacts", "arn:aws:s3:::prod-ap-southeast-2-starport-layer-bucket"]
    local_operator_principal_arn      = "arn:aws:iam::123456789012:user/private-operator"
  }

  assert {
    condition     = var.environment == "eks-private-sandbox"
    error_message = "The private environment must have an isolated name."
  }

  assert {
    condition     = length(var.public_subnet_cidrs) == 2 && length(var.private_subnet_cidrs) == 2
    error_message = "The reference environment must model two public and two private subnets."
  }

  assert {
    condition     = length(module.network.private_subnet_ids) == 2 && alltrue([for flag in values(module.network.private_subnet_public_ip_on_launch) : flag == false])
    error_message = "Every private worker subnet must prohibit public IP assignment."
  }

  assert {
    condition     = alltrue([for cidr in var.private_subnet_cidrs : cidr != "10.43.0.0/24" && cidr != "10.43.1.0/24"])
    error_message = "Private worker CIDRs must not reuse public subnet CIDRs."
  }

  assert {
    condition     = var.enable_nat_gateway == false
    error_message = "NAT must remain disabled until the separate cost gate is approved."
  }

  assert {
    condition     = module.egress.nat_enabled == false && module.eks.cluster_name == "cloudai-platform-eks-private-sandbox"
    error_message = "The default private reference plan must be no-NAT and uniquely named."
  }

  assert {
    condition     = length(module.egress.interface_endpoint_ids) == 6
    error_message = "The endpoint-first baseline must include ECR API/DKR, STS, EKS, EC2, and Logs interface endpoints."
  }

  assert {
    condition     = length(var.delivery_runner_security_group_id) > 0
    error_message = "The private cluster must have a dedicated control-plane SG path from the VPC runner."
  }

  assert {
    condition     = module.eks.endpoint_private_access && !module.eks.endpoint_public_access && length(module.eks.cluster_security_group_ids) == 1
    error_message = "The private environment must disable the public Kubernetes API and attach the dedicated control-plane SG."
  }

  assert {
    condition     = contains(flatten([for rule in aws_security_group.cluster.ingress : coalesce(rule.security_groups, [])]), var.delivery_runner_security_group_id)
    error_message = "The private Kubernetes API must allow TCP/443 only from the declared VPC runner security group."
  }

  assert {
    condition     = contains(flatten([for rule in aws_security_group.worker.egress : coalesce(rule.cidr_blocks, [])]), "10.43.0.0/20")
    error_message = "Endpoint-only worker egress must remain limited to the private VPC CIDR."
  }

  assert {
    condition     = local.common_tags.CostBoundary == "private-eks-separate-budget" && local.common_tags.TeardownRequired == "true"
    error_message = "The private environment must carry a separate cost boundary and teardown tag."
  }
}

run "plans_nat_only_as_explicit_egress_exception" {
  command = plan

  variables {
    enable_nat_gateway                = true
    github_actions_principal_arn      = "arn:aws:iam::123456789012:role/private-eks-runner"
    delivery_runner_security_group_id = "sg-0123456789abcdef0"
    private_artifact_bucket_arns      = ["arn:aws:s3:::cloudai-platform-private-artifacts", "arn:aws:s3:::prod-ap-southeast-2-starport-layer-bucket"]
  }

  assert {
    condition     = var.enable_nat_gateway && contains(flatten([for rule in aws_security_group.worker.egress : coalesce(rule.cidr_blocks, [])]), "0.0.0.0/0")
    error_message = "Enabling the explicit NAT exception must add the corresponding worker egress path."
  }
}
