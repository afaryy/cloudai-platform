variable "aws_region" {
  description = "AWS region for the private network foundation."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used for private network resource naming and tags."
  type        = string
  default     = "cloudai-platform"
}

variable "environment" {
  description = "Isolated network environment name."
  type        = string
  default     = "eks-private-network"

  validation {
    condition     = var.environment == "eks-private-network"
    error_message = "The network foundation environment must remain eks-private-network."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the isolated private EKS VPC."
  type        = string
  default     = "10.43.0.0/20"
}

variable "public_subnet_cidrs" {
  description = "Public subnets reserved for controlled egress only."
  type        = list(string)
  default     = ["10.43.0.0/24", "10.43.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private worker and runner subnet CIDRs."
  type        = list(string)
  default     = ["10.43.4.0/24", "10.43.5.0/24"]
}

variable "endpoint_principal_arns" {
  description = "Explicit IAM principals allowed by private endpoint policies, including the deterministic EKS node-role ARN contract."
  type        = list(string)

  validation {
    condition = length(var.endpoint_principal_arns) > 0 && alltrue([
      for arn in var.endpoint_principal_arns : startswith(arn, "arn:aws:iam::") && can(regex(":role/", arn)) && !can(regex("\\*", arn))
    ])
    error_message = "Endpoint policies require explicit IAM principal ARNs; wildcard principals are not allowed."
  }
}

variable "private_ecr_repository_arns" {
  description = "Private ECR repository ARNs allowed for image access."
  type        = list(string)

  validation {
    condition     = length(var.private_ecr_repository_arns) > 0 && alltrue([for arn in var.private_ecr_repository_arns : startswith(arn, "arn:aws:ecr:")])
    error_message = "Provide at least one explicit private ECR repository ARN or scoped ARN pattern."
  }
}

variable "private_artifact_bucket_arns" {
  description = "Explicit private S3 bucket ARNs used for approved artifacts."
  type        = list(string)

  validation {
    condition     = length(var.private_artifact_bucket_arns) > 0 && alltrue([for arn in var.private_artifact_bucket_arns : startswith(arn, "arn:aws:s3:::") && arn != "arn:aws:s3:::*"])
    error_message = "Provide explicit private S3 bucket ARNs; unrestricted arn:aws:s3:::* is not allowed."
  }
}

variable "enable_nat_gateway" {
  description = "Optional single-AZ NAT fallback; default false until separately approved."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags applied to the private network foundation."
  type        = map(string)
  default     = {}
}
