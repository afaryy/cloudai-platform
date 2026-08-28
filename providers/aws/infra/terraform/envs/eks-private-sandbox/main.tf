data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = var.network_state_bucket
    key    = var.network_state_key
    region = var.network_state_region
  }
}

resource "aws_security_group" "cluster" {
  name        = "${local.name_prefix}-cluster-sg"
  description = "Private EKS control-plane API security group"
  vpc_id      = data.terraform_remote_state.network.outputs.vpc_id

  ingress {
    description     = "Kubernetes API from the VPC-connected delivery runner"
    protocol        = "tcp"
    from_port       = 443
    to_port         = 443
    security_groups = [data.terraform_remote_state.network.outputs.delivery_runner_security_group_id]
  }

  egress {
    description = "EKS control-plane response path"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = [data.terraform_remote_state.network.outputs.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cluster-sg"
  })
}

module "eks" {
  source = "../../modules/eks"

  cluster_name                 = local.name_prefix
  subnet_ids                   = data.terraform_remote_state.network.outputs.private_subnet_ids
  cluster_security_group_ids   = [aws_security_group.cluster.id]
  node_security_group_ids      = [data.terraform_remote_state.network.outputs.worker_security_group_id]
  endpoint_private_access      = true
  endpoint_public_access       = false
  endpoint_public_access_cidrs = []
  kubernetes_version           = var.kubernetes_version
  node_instance_types          = var.node_instance_types
  node_desired_size            = var.node_desired_size
  node_min_size                = var.node_min_size
  node_max_size                = var.node_max_size
  github_actions_principal_arn = var.github_actions_principal_arn
  local_operator_principal_arn = var.local_operator_principal_arn
  enable_eks_access_entries    = var.enable_eks_access_entries
  tags                         = local.common_tags
}
