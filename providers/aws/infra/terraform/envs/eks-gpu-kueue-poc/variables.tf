variable "aws_region" {
  description = "AWS region containing the existing personal EKS sandbox."
  type        = string
  default     = "ap-southeast-2"
}

variable "eks_cluster_name" {
  description = "Name of the existing EKS sandbox to which the POC attaches."
  type        = string
  default     = "cloudai-platform-eks-sandbox"

  validation {
    condition     = var.eks_cluster_name == "cloudai-platform-eks-sandbox"
    error_message = "This bounded POC attaches only to cloudai-platform-eks-sandbox. A different cluster requires a separate reviewed design."
  }
}

variable "gpu_instance_type" {
  description = "Approved on-demand GPU instance type, supplied by protected GitHub environment variable TF_VAR_gpu_instance_type."
  type        = string
}

variable "cuda_smoke_image" {
  description = "Digest-pinned synthetic CUDA smoke image, supplied by protected GitHub environment variable TF_VAR_cuda_smoke_image."
  type        = string

  validation {
    condition     = can(regex("@sha256:[a-f0-9]{64}$", var.cuda_smoke_image))
    error_message = "cuda_smoke_image must use an immutable sha256 image digest."
  }
}

variable "nvidia_device_plugin_chart_version" {
  description = "Pinned NVIDIA device plugin chart version."
  type        = string
  default     = "0.17.0"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.nvidia_device_plugin_chart_version))
    error_message = "nvidia_device_plugin_chart_version must be an exact semantic version."
  }
}

variable "kueue_chart_version" {
  description = "Pinned Kueue chart version, supplied by protected GitHub environment variable TF_VAR_kueue_chart_version."
  type        = string

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.kueue_chart_version))
    error_message = "kueue_chart_version must be an exact semantic version."
  }
}

variable "gpu_min_size" {
  description = "Minimum GPU node count."
  type        = number
  default     = 0

  validation {
    condition     = var.gpu_min_size == 0
    error_message = "The GPU POC must have a minimum node count of zero."
  }
}

variable "gpu_desired_size" {
  description = "Desired GPU node count, changed to one only for an approved POC run."
  type        = number
  default     = 0

  validation {
    condition     = var.gpu_desired_size >= 0 && var.gpu_desired_size <= 1
    error_message = "The GPU POC desired count must remain between zero and one."
  }
}

variable "gpu_max_size" {
  description = "Maximum GPU node count."
  type        = number
  default     = 1

  validation {
    condition     = var.gpu_max_size == 1
    error_message = "The GPU POC maximum node count must remain one."
  }
}

variable "tags" {
  description = "Additional public-safe tags for the POC resources."
  type        = map(string)
  default     = {}
}
