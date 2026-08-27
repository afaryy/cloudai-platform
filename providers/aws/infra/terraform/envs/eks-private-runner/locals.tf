locals {
  name_prefix = "${var.project_name}-eks-private-runner"

  common_tags = merge(var.tags, {
    ManagedBy        = "terraform"
    Component        = "vpc-connected-delivery-runner"
    Environment      = "eks-private-runner"
    DataScope        = "synthetic-only"
    CostBoundary     = "private-eks-separate-budget"
    TeardownRequired = "true"
  })
}
