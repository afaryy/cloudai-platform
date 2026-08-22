resource "time_static" "gpu_poc_budget_start" {}

resource "time_offset" "gpu_poc_budget_end" {
  base_rfc3339 = time_static.gpu_poc_budget_start.rfc3339
  offset_days  = 7
}

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

resource "aws_budgets_budget" "gpu_poc_seven_day_cost" {
  name              = "cloudai-platform-gpu-poc-seven-day-cost"
  budget_type       = "COST"
  limit_amount      = "20"
  limit_unit        = "USD"
  time_unit         = "CUSTOM"
  time_period_start = time_static.gpu_poc_budget_start.rfc3339
  time_period_end   = time_offset.gpu_poc_budget_end.rfc3339
  tags              = var.tags

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
