variable "project_name" {
  description = "Stable project name used for CodeBuild and IAM resources."
  type        = string
}

variable "runner_project_name" {
  description = "Exact CodeBuild runner project name used by the GitHub runs-on label."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{1,254}$", var.runner_project_name))
    error_message = "runner_project_name must be a valid CodeBuild project name."
  }
}

variable "vpc_id" {
  description = "VPC ID produced by the private network foundation."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for VPC-connected ephemeral builds."
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2 && alltrue([for id in var.private_subnet_ids : can(regex("^subnet-[a-z0-9]+$", id))])
    error_message = "Provide at least two reviewed private subnet IDs."
  }
}

variable "security_group_ids" {
  description = "Reviewed runner security groups; no public ingress is added by this module."
  type        = list(string)

  validation {
    condition     = length(var.security_group_ids) > 0 && alltrue([for id in var.security_group_ids : can(regex("^sg-[a-z0-9]+$", id))])
    error_message = "Provide one or more reviewed security group IDs."
  }
}

variable "github_repository_url" {
  description = "Repository URL whose WORKFLOW_JOB_QUEUED events create CodeBuild runners."
  type        = string

  validation {
    condition     = can(regex("^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository_url))
    error_message = "github_repository_url must be an HTTPS GitHub repository URL."
  }
}

variable "github_source_auth_type" {
  description = "Optional CodeBuild source auth type. NONE relies on an existing account-level GitHub connection."
  type        = string
  default     = "NONE"

  validation {
    condition     = contains(["NONE", "CODECONNECTIONS", "SECRETS_MANAGER"], var.github_source_auth_type)
    error_message = "github_source_auth_type must be NONE, CODECONNECTIONS, or SECRETS_MANAGER."
  }
}

variable "github_source_auth_resource" {
  description = "Optional CodeConnections or Secrets Manager ARN; never a token."
  type        = string
  default     = ""
}

variable "codebuild_compute_type" {
  description = "CodeBuild compute size for the ephemeral runner."
  type        = string
  default     = "BUILD_GENERAL1_MEDIUM"
}

variable "codebuild_image" {
  description = "CodeBuild-managed Linux image used by the runner."
  type        = string
  default     = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
}

variable "codebuild_environment_type" {
  description = "CodeBuild environment type."
  type        = string
  default     = "LINUX_CONTAINER"
}

variable "log_retention_days" {
  description = "Short retention for runner logs; workflow evidence remains metadata-only."
  type        = number
  default     = 7

  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 30
    error_message = "Runner log retention must be between 1 and 30 days."
  }
}

variable "private_ecr_repository_arns" {
  description = "Optional private ECR repositories needed by runner bootstrap."
  type        = list(string)
  default     = []
}

variable "artifact_bucket_arns" {
  description = "Optional approved artifact bucket ARNs for runner cache or evidence."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to runner resources."
  type        = map(string)
  default     = {}
}
