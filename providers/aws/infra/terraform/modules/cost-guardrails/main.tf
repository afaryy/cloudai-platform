resource "aws_budgets_budget" "sandbox_monthly_cost" {
  name         = "cloudai-platform-sandbox-monthly-cost"
  budget_type  = "COST"
  limit_amount = "50"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  tags         = var.tags

  dynamic "notification" {
    for_each = toset(["15", "30", "40", "50"])

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}

resource "aws_budgets_budget" "gpu_poc_daily_cost" {
  name         = "cloudai-platform-gpu-poc-daily-cost"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "DAILY"
  tags         = var.tags

  dynamic "notification" {
    for_each = toset(["10", "15", "20"])

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}
