variable "aws_region" {
  description = "AWS region for the private EKS reference environment."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used for private environment resource naming and tags."
  type        = string
  default     = "cloudai-platform"
}

variable "environment" {
  description = "Isolated environment name; must not collide with eks-sandbox."
  type        = string
  default     = "eks-private-sandbox"

  validation {
    condition     = var.environment == "eks-private-sandbox"
    error_message = "The private reference environment must remain isolated as eks-private-sandbox."
  }
}

variable "network_state_bucket" {
  description = "S3 bucket containing the reviewed private-network Terraform state."
  type        = string
}

variable "network_state_key" {
  description = "State key owned by the private-network environment."
  type        = string
  default     = "cloudai-platform/eks-private-network/terraform.tfstate"
}

variable "network_state_region" {
  description = "AWS region containing the private-network state bucket."
  type        = string
  default     = "ap-southeast-2"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the private EKS reference cluster."
  type        = string
  default     = "1.31"
}

variable "node_instance_types" {
  description = "Small non-GPU instance type for the first private-worker validation."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_desired_size" {
  description = "Desired private worker count; keep bounded until the apply gate is approved."
  type        = number
  default     = 1
}

variable "node_min_size" {
  description = "Minimum private worker count."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum private worker count."
  type        = number
  default     = 1
}

variable "github_actions_principal_arn" {
  description = "IAM principal ARN for the VPC-connected GitHub Actions delivery identity."
  type        = string
}

variable "local_operator_principal_arn" {
  description = "Optional local operator principal for controlled inspection."
  type        = string
  default     = ""
}

variable "enable_eks_access_entries" {
  description = "Whether Terraform manages EKS access entries for this isolated environment."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags applied to the private environment."
  type        = map(string)
  default     = {}
}
