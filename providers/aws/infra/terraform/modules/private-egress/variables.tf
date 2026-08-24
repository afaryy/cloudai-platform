variable "name_prefix" {
  description = "Prefix used for private egress resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC receiving private service endpoints."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs used only when the optional NAT fallback is enabled."
  type        = list(string)
}

variable "consumer_security_group_ids" {
  description = "Worker and VPC-runner security groups allowed to reach interface endpoints."
  type        = list(string)

  validation {
    condition     = length(var.consumer_security_group_ids) > 0
    error_message = "At least one worker or VPC-runner security group is required for endpoint ingress."
  }
}

variable "allowed_principal_arns" {
  description = "Node and runner IAM principals allowed by endpoint policies."
  type        = list(string)

  validation {
    condition     = length(var.allowed_principal_arns) > 0
    error_message = "Endpoint policies require explicit node and runner principals."
  }
}

variable "private_ecr_repository_arns" {
  description = "Private ECR repository ARNs allowed for image access."
  type        = list(string)

  validation {
    condition     = length(var.private_ecr_repository_arns) > 0
    error_message = "At least one private ECR repository ARN pattern is required."
  }
}

variable "s3_bucket_arns" {
  description = "S3 bucket ARN patterns allowed by the gateway endpoint policy."
  type        = list(string)

  validation {
    condition     = length(var.s3_bucket_arns) > 0
    error_message = "At least one S3 bucket ARN pattern is required."
  }
}

variable "private_subnet_ids" {
  description = "Private subnet IDs whose workloads consume the endpoints."
  type        = list(string)
}

variable "private_route_table_ids" {
  description = "Private route table IDs for the S3 gateway endpoint and optional NAT route."
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable a bounded single-AZ NAT fallback. Keep false until the cost gate is approved."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to endpoint and optional NAT resources."
  type        = map(string)
  default     = {}
}
