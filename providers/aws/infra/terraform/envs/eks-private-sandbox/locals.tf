locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Project          = var.project_name
    Environment      = var.environment
    DataScope        = "synthetic-only"
    ManagedBy        = "terraform"
    CostBoundary     = "private-eks-separate-budget"
    TeardownRequired = "true"
  })

  node_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.name_prefix}-node-role"

  private_ecr_repository_arns = [
    "arn:aws:ecr:${var.aws_region}:*:repository/${var.project_name}/*"
  ]

}
