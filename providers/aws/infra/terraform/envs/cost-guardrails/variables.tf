variable "aws_region" {
  description = "AWS Budgets endpoint region. AWS Budgets is managed through us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project tag value."
  type        = string
  default     = "cloudai-platform"
}

variable "environment" {
  description = "Environment tag value for the independent cost guardrail state."
  type        = string
  default     = "cost-guardrails"
}

variable "budget_alert_email" {
  description = "Protected recipient for AWS Budgets notifications."
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Optional additional public-safe tags."
  type        = map(string)
  default     = {}
}

variable "monthly_budget_usd" {
  description = "Monthly sandbox budget limit in USD; normally supplied by the GitHub Environment."
  type        = number
  default     = 50
}

variable "gpu_daily_budget_usd" {
  description = "Daily GPU demo budget limit in USD; normally supplied by the GitHub Environment."
  type        = number
  default     = 20
}

variable "monthly_alert_thresholds" {
  description = "Comma-separated monthly notification thresholds; normally supplied by the GitHub Environment."
  type        = string
  default     = "15,30,40,50"
}

variable "gpu_alert_thresholds" {
  description = "Comma-separated daily GPU notification thresholds; normally supplied by the GitHub Environment."
  type        = string
  default     = "10,15,20"
}
