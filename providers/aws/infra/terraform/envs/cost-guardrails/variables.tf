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
