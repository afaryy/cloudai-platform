output "monthly_budget_name" {
  description = "Reviewed name of the monthly sandbox-cost budget."
  value       = module.cost_guardrails.monthly_budget_name
}

output "gpu_poc_budget_name" {
  description = "Reviewed name of the bounded seven-day GPU POC budget."
  value       = module.cost_guardrails.gpu_poc_budget_name
}
