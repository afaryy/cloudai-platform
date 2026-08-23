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

  budget_alert_email       = var.budget_alert_email
  gpu_daily_budget_usd     = var.gpu_daily_budget_usd
  gpu_alert_thresholds     = var.gpu_alert_thresholds
  monthly_alert_thresholds = var.monthly_alert_thresholds
  monthly_budget_usd       = var.monthly_budget_usd
  tags                     = local.common_tags
}
