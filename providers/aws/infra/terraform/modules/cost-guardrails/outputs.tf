output "monthly_budget_name" {
  description = "Reviewed name of the monthly sandbox-cost budget."
  value       = aws_budgets_budget.sandbox_monthly_cost.name
}

output "gpu_poc_budget_name" {
  description = "Reviewed name of the bounded seven-day GPU POC budget."
  value       = aws_budgets_budget.gpu_poc_seven_day_cost.name
}

output "monthly_budget_limit_usd" {
  description = "Monthly sandbox-cost guardrail limit in USD."
  value       = aws_budgets_budget.sandbox_monthly_cost.limit_amount
}

output "gpu_poc_budget_limit_usd" {
  description = "Seven-day GPU POC guardrail limit in USD."
  value       = aws_budgets_budget.gpu_poc_seven_day_cost.limit_amount
}
