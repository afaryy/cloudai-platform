variable "cluster_name" {
  description = "Name of the sandbox EKS cluster."
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the sandbox EKS cluster and managed node group."
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version for the sandbox EKS cluster."
  type        = string
  default     = "1.31"
}

variable "endpoint_private_access" {
  description = "Whether the EKS API endpoint is reachable privately."
  type        = bool
  default     = false
}

variable "endpoint_public_access" {
  description = "Whether the EKS API endpoint is reachable publicly."
  type        = bool
  default     = true
}

variable "endpoint_public_access_cidrs" {
  description = "CIDR blocks allowed to reach the public EKS API endpoint. Override in private settings before real apply."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_ami_type" {
  description = "AMI type for the sandbox managed node group."
  type        = string
  default     = "AL2023_x86_64_STANDARD"
}

variable "node_capacity_type" {
  description = "Capacity type for the sandbox managed node group."
  type        = string
  default     = "ON_DEMAND"
}

variable "node_disk_size" {
  description = "Disk size in GiB for sandbox worker nodes."
  type        = number
  default     = 20
}

variable "node_instance_types" {
  description = "Instance types for the sandbox managed node group."
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
  description = "Tags applied to all sandbox EKS resources."
  type        = map(string)
  default     = {}
}
