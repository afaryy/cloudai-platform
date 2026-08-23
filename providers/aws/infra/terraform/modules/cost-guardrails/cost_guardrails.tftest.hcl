mock_provider "aws" {}

run "defines_the_two_bounded_notification_budgets" {
  command = plan

  variables {
    budget_alert_email = "synthetic-alert@example.invalid"
  }

  assert {
    condition     = output.monthly_budget_name == "cloudai-platform-sandbox-monthly-cost"
    error_message = "The monthly sandbox budget must retain its reviewed name."
  }

  assert {
    condition     = output.gpu_poc_budget_name == "cloudai-platform-gpu-poc-daily-cost"
    error_message = "The GPU POC budget must retain its daily guardrail name."
  }

  assert {
    condition     = output.monthly_budget_limit_usd == "50"
    error_message = "The monthly sandbox budget must remain capped at USD 50."
  }

  assert {
    condition     = output.gpu_poc_budget_limit_usd == "20"
    error_message = "The daily GPU POC budget must remain capped at USD 20."
  }
}
