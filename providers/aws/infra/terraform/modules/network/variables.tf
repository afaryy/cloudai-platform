variable "name_prefix" {
  description = "Prefix used for sandbox network resource names."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the sandbox VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public sandbox subnets."
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_cidrs) > 0
    error_message = "At least one public subnet CIDR is required."
  }
}

variable "availability_zones" {
  description = "Availability zones for public sandbox subnets."
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= length(var.public_subnet_cidrs)
    error_message = "Provide at least as many availability zones as public subnet CIDRs."
  }
}

variable "tags" {
  description = "Tags applied to all sandbox network resources."
  type        = map(string)
  default     = {}
}
