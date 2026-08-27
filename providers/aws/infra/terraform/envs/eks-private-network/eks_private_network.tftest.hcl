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
}

run "plans_endpoint_first_network_without_nat" {
  command = plan

  variables {
    endpoint_principal_arns      = ["arn:aws:iam::123456789012:role/cloudai-platform-network-bootstrap", "arn:aws:iam::123456789012:role/cloudai-platform-private-runner", "arn:aws:iam::123456789012:role/cloudai-platform-eks-private-sandbox-node-role"]
    private_ecr_repository_arns  = ["arn:aws:ecr:ap-southeast-2:123456789012:repository/cloudai-platform/*"]
    private_artifact_bucket_arns = ["arn:aws:s3:::cloudai-platform-private-artifacts"]
  }

  assert {
    condition     = var.environment == "eks-private-network"
    error_message = "The network foundation must have an isolated environment name."
  }

  assert {
    condition     = length(module.network.private_subnet_ids) == 2 && alltrue([for flag in values(module.network.private_subnet_public_ip_on_launch) : flag == false])
    error_message = "Every private network subnet must prohibit public IP assignment."
  }

  assert {
    condition     = module.egress.nat_enabled == false
    error_message = "NAT must remain disabled by default."
  }

  assert {
    condition     = length(module.egress.interface_endpoint_ids) == 6
    error_message = "The endpoint-first baseline must include six interface endpoints."
  }

  assert {
    condition     = length(var.endpoint_principal_arns) >= 3 && length(var.private_subnet_cidrs) == 2
    error_message = "The network foundation must receive explicit runner, lifecycle, and node-role principals and two private subnets."
  }

  assert {
    condition     = var.enable_nat_gateway == false && var.vpc_cidr != "0.0.0.0/0"
    error_message = "The default delivery runner path must not enable unrestricted Internet egress."
  }
}

run "plans_nat_only_as_explicit_exception" {
  command = plan

  variables {
    enable_nat_gateway           = true
    endpoint_principal_arns      = ["arn:aws:iam::123456789012:role/cloudai-platform-network-bootstrap", "arn:aws:iam::123456789012:role/cloudai-platform-private-runner", "arn:aws:iam::123456789012:role/cloudai-platform-eks-private-sandbox-node-role"]
    private_ecr_repository_arns  = ["arn:aws:ecr:ap-southeast-2:123456789012:repository/cloudai-platform/*"]
    private_artifact_bucket_arns = ["arn:aws:s3:::cloudai-platform-private-artifacts"]
  }

  assert {
    condition     = var.enable_nat_gateway && module.egress.nat_enabled
    error_message = "NAT must appear only when explicitly enabled."
  }
}
