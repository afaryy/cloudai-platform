variable "name_prefix" {
  description = "Prefix used for private EKS network resource names."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the isolated private EKS VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs reserved for ingress and controlled egress."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "Private worker subnet CIDRs."
  type        = list(string)
}

variable "availability_zones" {
  description = "Availability zones used by public and private subnet pairs."
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= max(length(var.public_subnet_cidrs), length(var.private_subnet_cidrs))
    error_message = "Provide at least as many availability zones as the largest subnet CIDR list."
  }
}

variable "tags" {
  description = "Tags applied to private EKS network resources."
  type        = map(string)
  default     = {}
}
