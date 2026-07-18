variable "aws_region" {
  description = "AWS region for the Bedrock sandbox IAM boundary."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used for sandbox resource naming and tags."
  type        = string
  default     = "cloudai-platform"
}

variable "environment" {
  description = "Environment name for sandbox resource naming and tags."
  type        = string
  default     = "bedrock-sandbox"
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN for the sandbox account. Provide through the protected GitHub environment."
  type        = string
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository."
  type        = string
  default     = "afaryy"
}

variable "github_repo" {
  description = "GitHub repository name."
  type        = string
  default     = "cloudai-platform"
}

variable "github_environment" {
  description = "GitHub environment used as the manual approval boundary for Bedrock sandbox operations."
  type        = string
  default     = "aws-sandbox"
}

variable "allowed_model_arns" {
  description = "Approved Bedrock model ARNs for a future synthetic smoke test. Keep explicit and narrow."
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.allowed_model_arns) > 0
    error_message = "At least one explicit Bedrock model ARN is required before planning the Bedrock IAM boundary."
  }
}

variable "tags" {
  description = "Additional tags to apply to sandbox resources."
  type        = map(string)
  default     = {}
}
