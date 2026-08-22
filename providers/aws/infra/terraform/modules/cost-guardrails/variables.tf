variable "budget_alert_email" {
  description = "Protected recipient for AWS Budgets notifications. Never commit a real address."
  type        = string
  sensitive   = true

  validation {
    condition     = trimspace(var.budget_alert_email) != ""
    error_message = "budget_alert_email must be supplied through the protected GitHub Environment secret."
  }
}

variable "tags" {
  description = "Required CloudAI Cost Guardrails tags."
  type        = map(string)
}
