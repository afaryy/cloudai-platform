data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

resource "aws_security_group" "worker" {
  name        = "${local.name_prefix}-worker-sg"
  description = "Dedicated worker security group for private EKS nodes"
  vpc_id      = module.network.vpc_id

  egress {
    description = "Approved private worker egress"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = [var.vpc_cidr]
  }

  dynamic "egress" {
    for_each = var.enable_nat_gateway ? [1] : []

    content {
      description = "Approved NAT fallback egress"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-worker-sg"
  })
}

resource "aws_security_group" "cluster" {
  name        = "${local.name_prefix}-cluster-sg"
  description = "Private EKS control-plane API security group"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "Kubernetes API from the VPC-connected delivery runner"
    protocol        = "tcp"
    from_port       = 443
    to_port         = 443
    security_groups = [var.delivery_runner_security_group_id]
  }

  egress {
    description = "EKS control-plane response path"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cluster-sg"
  })
}

module "network" {
  source = "../../modules/private-network"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = slice(data.aws_availability_zones.available.names, 0, max(length(var.public_subnet_cidrs), length(var.private_subnet_cidrs)))
  tags                 = local.common_tags
}

module "egress" {
  source = "../../modules/private-egress"

  name_prefix             = local.name_prefix
  vpc_id                  = module.network.vpc_id
  public_subnet_ids       = module.network.public_subnet_ids
  private_subnet_ids      = module.network.private_subnet_ids
  private_route_table_ids = module.network.private_route_table_ids
  consumer_security_group_ids = [
    aws_security_group.worker.id,
    var.delivery_runner_security_group_id,
  ]
  allowed_principal_arns = [
    local.node_role_arn,
    var.github_actions_principal_arn,
  ]
  private_ecr_repository_arns = local.private_ecr_repository_arns
  s3_bucket_arns              = var.private_artifact_bucket_arns
  enable_nat_gateway          = var.enable_nat_gateway
  tags                        = local.common_tags
}

module "eks" {
  source = "../../modules/eks"

  cluster_name                 = local.name_prefix
  subnet_ids                   = module.network.private_subnet_ids
  cluster_security_group_ids   = [aws_security_group.cluster.id]
  node_security_group_ids      = [aws_security_group.worker.id]
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

  depends_on = [module.egress]
}
