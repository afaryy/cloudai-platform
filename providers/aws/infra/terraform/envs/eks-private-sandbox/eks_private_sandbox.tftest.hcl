mock_provider "aws" {
  mock_data "aws_region" {
    defaults = {
      name = "ap-southeast-2"
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

override_data {
  target = data.terraform_remote_state.network
  values = {
    outputs = {
      vpc_id                            = "vpc-0123456789abcdef0"
      vpc_cidr                          = "10.99.0.0/20"
      private_subnet_ids                = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
      delivery_runner_security_group_id = "sg-0123456789abcdef0"
      worker_security_group_id          = "sg-0123456789abcdef1"
      network_foundation_ready          = true
    }
  }
}

run "plans_single_network_state_consumer" {
  command = plan

  variables {
    network_state_bucket         = "cloudai-platform-test-state"
    github_actions_principal_arn = "arn:aws:iam::123456789012:role/private-eks-runner"
    local_operator_principal_arn = "arn:aws:iam::123456789012:user/private-operator"
  }

  assert {
    condition     = var.environment == "eks-private-sandbox"
    error_message = "The private environment must have an isolated name."
  }

  assert {
    condition     = output.network_state_consumed
    error_message = "Private EKS must consume the reviewed network state."
  }

  assert {
    condition     = tolist(module.eks.subnet_ids) == tolist(["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"])
    error_message = "Private EKS must use the two private subnets from network state."
  }

  assert {
    condition     = tolist(module.eks.node_security_group_ids) == tolist(["sg-0123456789abcdef1"])
    error_message = "Private workers must use the security group owned by network state."
  }

  assert {
    condition     = module.eks.cluster_name == "cloudai-platform-eks-private-sandbox"
    error_message = "The private EKS state must keep its isolated cluster name."
  }

  assert {
    condition     = module.eks.endpoint_private_access && !module.eks.endpoint_public_access && length(module.eks.cluster_security_group_ids) == 1
    error_message = "The private environment must disable the public Kubernetes API and attach the dedicated control-plane SG."
  }

  assert {
    condition     = contains(flatten([for rule in aws_security_group.cluster.ingress : coalesce(rule.security_groups, [])]), "sg-0123456789abcdef0")
    error_message = "The private Kubernetes API must allow TCP/443 only from the runner security group in network state."
  }

  assert {
    condition     = contains(flatten([for rule in aws_security_group.cluster.egress : coalesce(rule.cidr_blocks, [])]), "10.99.0.0/20")
    error_message = "The control-plane response rule must use the VPC CIDR owned by network state."
  }

  assert {
    condition     = local.common_tags.CostBoundary == "private-eks-separate-budget" && local.common_tags.TeardownRequired == "true"
    error_message = "The private environment must carry a separate cost boundary and teardown tag."
  }
}
