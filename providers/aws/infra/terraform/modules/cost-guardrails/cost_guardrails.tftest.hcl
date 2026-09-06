mock_provider "aws" {}

run "defines_the_two_bounded_notification_budgets" {
  command = plan

  variables {
    budget_alert_email = "synthetic-alert@example.invalid"
    tags = {
      Test = "synthetic"
    }
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

run "accepts_environment_budget_overrides" {
  command = plan

  variables {
    budget_alert_email       = "synthetic-alert@example.invalid"
    tags                     = { Test = "synthetic" }
    monthly_budget_usd       = 100
    gpu_daily_budget_usd     = 30
    monthly_alert_thresholds = "25,50,75,100"
    gpu_alert_thresholds     = "10,20,30"
  }

  assert {
    condition     = output.monthly_budget_limit_usd == "100"
    error_message = "The monthly budget must accept the protected Environment override."
  }

  assert {
    condition     = output.gpu_poc_budget_limit_usd == "30"
    error_message = "The daily GPU budget must accept the protected Environment override."
  }
}
