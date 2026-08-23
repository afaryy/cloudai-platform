mock_provider "aws" {}

run "applies_cost_guardrails_tags_and_budget_boundaries" {
  command = plan

  variables {
    budget_alert_email = "synthetic-alert@example.invalid"
  }

  assert {
    condition     = output.monthly_budget_name == "cloudai-platform-sandbox-monthly-cost"
    error_message = "The environment must expose the reviewed monthly budget boundary."
  }

  assert {
    condition     = output.gpu_poc_budget_name == "cloudai-platform-gpu-poc-daily-cost"
    error_message = "The environment must expose the reviewed daily GPU POC budget boundary."
  }
}
