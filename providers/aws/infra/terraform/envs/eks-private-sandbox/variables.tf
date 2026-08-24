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

variable "vpc_cidr" {
  description = "CIDR block for the isolated private EKS VPC."
  type        = string
  default     = "10.43.0.0/20"
}

variable "public_subnet_cidrs" {
  description = "Public subnets for ingress and controlled egress only."
  type        = list(string)
  default     = ["10.43.0.0/24", "10.43.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private worker subnet CIDRs; workers receive no public IP addresses."
  type        = list(string)
  default     = ["10.43.4.0/24", "10.43.5.0/24"]
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

variable "enable_nat_gateway" {
  description = "Optional single-AZ NAT fallback; default false until the separate cost gate is approved."
  type        = bool
  default     = false
}

variable "github_actions_principal_arn" {
  description = "IAM principal ARN for the VPC-connected GitHub Actions delivery identity."
  type        = string
}

variable "delivery_runner_security_group_id" {
  description = "Existing VPC-connected runner security group allowed to reach private EKS and AWS endpoints."
  type        = string
}

variable "private_artifact_bucket_arns" {
  description = "Explicit private S3 bucket ARNs used for approved artifacts and ECR layer access."
  type        = list(string)

  validation {
    condition     = length(var.private_artifact_bucket_arns) > 0 && alltrue([for arn in var.private_artifact_bucket_arns : startswith(arn, "arn:aws:s3:::") && arn != "arn:aws:s3:::*"])
    error_message = "Provide explicit private S3 bucket ARNs; unrestricted arn:aws:s3:::* is not allowed."
  }
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
