variable "aws_region" {
  description = "AWS Region for the isolated AgentCore sandbox."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used for resource names and tags."
  type        = string
  default     = "cloudai-platform"
}

variable "environment" {
  description = "Environment name used for resource names and tags."
  type        = string
  default     = "agentcore-rag-sandbox"
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN supplied only through the protected GitHub environment."
  type        = string
}

variable "github_org" {
  description = "GitHub owner that is permitted to deploy this sandbox through the protected environment."
  type        = string
  default     = "afaryy"
}

variable "github_repo" {
  description = "GitHub repository permitted to deploy this sandbox."
  type        = string
  default     = "cloudai-platform"
}

variable "github_environment" {
  description = "GitHub Environment that supplies approval for deploy and teardown."
  type        = string
  default     = "aws-sandbox"
}

variable "enable_runtime" {
  description = "Create the runtime, gateway, and target. False creates only the ECR and IAM foundation."
  type        = bool
  default     = true
}

variable "container_image_uri" {
  description = "Immutable ECR image digest built and pushed only by GitHub Actions."
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_runtime || can(regex("^.+@sha256:[a-f0-9]{64}$", var.container_image_uri))
    error_message = "enable_runtime requires an immutable image URI ending in @sha256:<64 lowercase hex characters>."
  }
}

variable "knowledge_base_id" {
  description = "Approved Bedrock Knowledge Base ID; set only in the protected GitHub environment."
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_runtime || length(trimspace(var.knowledge_base_id)) > 0
    error_message = "enable_runtime requires a Knowledge Base ID."
  }
}

variable "knowledge_base_arn" {
  description = "Approved Bedrock Knowledge Base ARN for least-privilege runtime access."
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_runtime || can(regex("^arn:aws:bedrock:", var.knowledge_base_arn))
    error_message = "enable_runtime requires a Bedrock Knowledge Base ARN."
  }
}

variable "model_arn" {
  description = "One approved Bedrock model ARN used for retrieval and generation."
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_runtime || can(regex("^arn:aws:bedrock:", var.model_arn))
    error_message = "enable_runtime requires an approved Bedrock model ARN."
  }
}

variable "tags" {
  description = "Additional non-sensitive tags for the sandbox resources."
  type        = map(string)
  default     = {}
}
