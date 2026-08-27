data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

resource "aws_security_group" "delivery_runner" {
  name        = "${local.name_prefix}-delivery-runner-sg"
  description = "Private delivery runner access for network and EKS lifecycle operations"
  vpc_id      = module.network.vpc_id

  egress {
    description = "Approved private VPC egress"
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
    Name = "${local.name_prefix}-delivery-runner-sg"
  })
}

resource "aws_security_group" "worker" {
  name        = "${local.name_prefix}-worker-sg"
  description = "Private worker access for the private EKS baseline"
  vpc_id      = module.network.vpc_id

  egress {
    description = "Approved private VPC egress"
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
    aws_security_group.delivery_runner.id,
    aws_security_group.worker.id,
  ]
  allowed_principal_arns      = var.endpoint_principal_arns
  private_ecr_repository_arns = var.private_ecr_repository_arns
  s3_bucket_arns              = var.private_artifact_bucket_arns
  enable_nat_gateway          = var.enable_nat_gateway
  tags                        = local.common_tags
}
