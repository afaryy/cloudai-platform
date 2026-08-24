resource "aws_budgets_budget" "sandbox_monthly_cost" {
  name         = "cloudai-platform-sandbox-monthly-cost"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  tags         = var.tags

  dynamic "notification" {
    for_each = toset([for threshold in split(",", var.monthly_alert_thresholds) : trimspace(threshold)])

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = tonumber(notification.value)
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}

resource "aws_budgets_budget" "gpu_poc_daily_cost" {
  name         = "cloudai-platform-gpu-poc-daily-cost"
  budget_type  = "COST"
  limit_amount = tostring(var.gpu_daily_budget_usd)
  limit_unit   = "USD"
  time_unit    = "DAILY"
  tags         = var.tags

  dynamic "notification" {
    for_each = toset([for threshold in split(",", var.gpu_alert_thresholds) : trimspace(threshold)])

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = tonumber(notification.value)
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}
