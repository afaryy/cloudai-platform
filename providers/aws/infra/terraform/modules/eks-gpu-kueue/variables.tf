variable "cluster_name" {
  description = "Name of an existing, ACTIVE EKS sandbox cluster. This module never creates a cluster."
  type        = string
}

variable "subnet_ids" {
  description = "Private or approved subnets in which the single GPU node may run."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) > 0
    error_message = "At least one approved subnet ID is required for the GPU node group."
  }
}

variable "gpu_node_role_arn" {
  description = "Dedicated, least-privilege EKS GPU node IAM role ARN managed outside this module."
  type        = string

  validation {
    condition     = can(regex("^arn:aws:iam::[0-9]{12}:role/.+", var.gpu_node_role_arn))
    error_message = "gpu_node_role_arn must be a valid IAM role ARN."
  }
}

variable "gpu_instance_type" {
  description = "One approved on-demand GPU instance type for the bounded POC."
  type        = string

  validation {
    condition     = length(trimspace(var.gpu_instance_type)) > 0
    error_message = "gpu_instance_type must be explicitly set; there is no instance-type fallback."
  }
}

variable "gpu_min_size" {
  description = "Minimum GPU node count. It must remain zero for the bounded POC."
  type        = number
  default     = 0

  validation {
    condition     = var.gpu_min_size == 0
    error_message = "The GPU POC must scale to zero when no approved run is active."
  }
}

variable "gpu_desired_size" {
  description = "Desired GPU node count. It is set to one only during an approved run."
  type        = number
  default     = 0

  validation {
    condition     = var.gpu_desired_size >= 0 && var.gpu_desired_size <= 1
    error_message = "The GPU POC desired capacity must be either zero or one."
  }
}

variable "gpu_max_size" {
  description = "Maximum GPU node count. It must remain one for the bounded POC."
  type        = number
  default     = 1

  validation {
    condition     = var.gpu_max_size == 1
    error_message = "The GPU POC may never scale beyond one node."
  }
}

variable "cuda_smoke_image" {
  description = "Immutable OCI image digest for the synthetic CUDA smoke Job. Tags are not accepted."
  type        = string

  validation {
    condition     = can(regex("@sha256:[a-f0-9]{64}$", var.cuda_smoke_image))
    error_message = "cuda_smoke_image must use an immutable sha256 image digest."
  }
}

variable "nvidia_device_plugin_chart_version" {
  description = "Pinned NVIDIA Kubernetes device plugin Helm chart version."
  type        = string

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.nvidia_device_plugin_chart_version))
    error_message = "nvidia_device_plugin_chart_version must be an exact semantic version."
  }
}

variable "kueue_chart_version" {
  description = "Pinned Kueue Helm chart version."
  type        = string

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.kueue_chart_version))
    error_message = "kueue_chart_version must be an exact semantic version."
  }
}

variable "tags" {
  description = "Tags applied to the GPU node group only."
  type        = map(string)
  default     = {}
}
