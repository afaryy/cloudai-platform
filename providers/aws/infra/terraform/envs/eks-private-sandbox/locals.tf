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

}
