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

variable "monthly_budget_usd" {
  description = "Monthly sandbox budget limit in USD."
  type        = number
  default     = 50

  validation {
    condition     = var.monthly_budget_usd > 0
    error_message = "monthly_budget_usd must be greater than zero."
  }
}

variable "gpu_daily_budget_usd" {
  description = "Daily GPU demo budget limit in USD."
  type        = number
  default     = 20

  validation {
    condition     = var.gpu_daily_budget_usd > 0
    error_message = "gpu_daily_budget_usd must be greater than zero."
  }
}

variable "monthly_alert_thresholds" {
  description = "Comma-separated monthly actual-spend notification thresholds in USD."
  type        = string
  default     = "15,30,40,50"
}

variable "gpu_alert_thresholds" {
  description = "Comma-separated daily GPU actual-spend notification thresholds in USD."
  type        = string
  default     = "10,15,20"
}
