variable "aws_region" {
  description = "AWS region for the personal EKS sandbox."
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
  default     = "eks-sandbox"
}

variable "vpc_cidr" {
  description = "CIDR block for the sandbox VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks for the no-NAT sandbox."
  type        = list(string)
  default     = ["10.42.0.0/24", "10.42.1.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version for the sandbox EKS cluster."
  type        = string
  default     = "1.31"
}

variable "endpoint_public_access_cidrs" {
  description = "CIDR blocks allowed to reach the public EKS API endpoint. Override privately before real apply."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_instance_types" {
  description = "Instance types for the sandbox EKS managed node group."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_desired_size" {
  description = "Desired node count for the sandbox managed node group."
  type        = number
  default     = 1
}

variable "node_min_size" {
  description = "Minimum node count for the sandbox managed node group."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum node count for the sandbox managed node group."
  type        = number
  default     = 1
}

variable "tags" {
  description = "Additional tags to apply to sandbox resources."
  type        = map(string)
  default     = {}
}
