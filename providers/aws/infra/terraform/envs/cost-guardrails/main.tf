locals {
  common_tags = merge(var.tags, {
    Project      = var.project_name
    Environment  = var.environment
    DataScope    = "synthetic-only"
    ManagedBy    = "terraform"
    CostBoundary = "pre-gpu-poc"
    CloudAISlice = "YY-44"
  })
}

module "cost_guardrails" {
  source = "../../modules/cost-guardrails"

  budget_alert_email = var.budget_alert_email
  tags               = local.common_tags
}
