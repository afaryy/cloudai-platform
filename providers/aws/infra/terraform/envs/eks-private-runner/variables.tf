variable "aws_region" {
  description = "AWS region for the VPC-connected runner."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Stable project name used for resource naming."
  type        = string
  default     = "cloudai-platform"
}

variable "runner_project_name" {
  description = "Exact CodeBuild project name used by the run-scoped GitHub label."
  type        = string
  default     = "cloudai-platform-private-eks-runner"
}

variable "network_foundation_vpc_id" {
  description = "VPC ID output from the independently managed private network state."
  type        = string
}

variable "network_foundation_private_subnet_ids" {
  description = "Private subnet IDs output from the independently managed private network state."
  type        = list(string)
}

variable "network_foundation_runner_security_group_id" {
  description = "Delivery-runner security group ID output from the private network state."
  type        = string
}

variable "github_repository_url" {
  description = "Repository whose workflow-job events create ephemeral CodeBuild runners."
  type        = string
  default     = "https://github.com/afaryy/cloudai-platform"
}

variable "github_source_auth_type" {
  description = "Optional existing CodeBuild source auth type; NONE uses an account-level GitHub connection."
  type        = string
  default     = "NONE"
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
  description = "CodeBuild-managed Linux image used by the ephemeral runner."
  type        = string
  default     = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
}

variable "log_retention_days" {
  description = "Runner log retention in days."
  type        = number
  default     = 7
}

variable "private_ecr_repository_arns" {
  description = "Optional private ECR repository ARNs needed by lifecycle jobs."
  type        = list(string)
  default     = []
}

variable "artifact_bucket_arns" {
  description = "Optional approved artifact bucket ARNs."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional resource tags."
  type        = map(string)
  default     = {}
}
