data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Project          = var.project_name
    Environment      = var.environment
    DataScope        = "synthetic-only"
    ManagedBy        = "terraform"
    CostBoundary     = "personal-sandbox"
    TeardownRequired = "true"
  })
}

module "network" {
  source = "../../modules/network"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, length(var.public_subnet_cidrs))
  tags                = local.common_tags
}

module "eks" {
  source = "../../modules/eks"

  cluster_name                 = local.name_prefix
  subnet_ids                   = module.network.public_subnet_ids
  kubernetes_version           = var.kubernetes_version
  endpoint_public_access_cidrs = var.endpoint_public_access_cidrs
  node_instance_types          = var.node_instance_types
  node_desired_size            = var.node_desired_size
  node_min_size                = var.node_min_size
  node_max_size                = var.node_max_size
  tags                         = local.common_tags
}
