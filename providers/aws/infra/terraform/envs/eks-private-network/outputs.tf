output "environment_name" {
  description = "Isolated private network environment name."
  value       = var.environment
}

output "vpc_id" {
  description = "Private EKS VPC ID; do not publish live output values."
  value       = module.network.vpc_id
  sensitive   = true
}

output "vpc_cidr" {
  description = "CIDR owned by the private network foundation."
  value       = var.vpc_cidr
}

output "private_subnet_ids" {
  description = "Private worker and runner subnet IDs; do not publish live output values."
  value       = module.network.private_subnet_ids
  sensitive   = true
}

output "private_route_table_ids" {
  description = "Private route table IDs used by endpoint and egress controls."
  value       = module.network.private_route_table_ids
  sensitive   = true
}

output "delivery_runner_security_group_id" {
  description = "Dedicated VPC-connected delivery runner security group ID."
  value       = aws_security_group.delivery_runner.id
  sensitive   = true
}

output "worker_security_group_id" {
  description = "Dedicated private worker security group ID."
  value       = aws_security_group.worker.id
  sensitive   = true
}

output "endpoint_security_group_id" {
  description = "Security group attached to private interface endpoints."
  value       = module.egress.endpoint_security_group_id
  sensitive   = true
}

output "interface_endpoint_ids" {
  description = "Private interface endpoint IDs by AWS service suffix."
  value       = module.egress.interface_endpoint_ids
  sensitive   = true
}

output "s3_endpoint_id" {
  description = "Private S3 gateway endpoint ID."
  value       = module.egress.s3_endpoint_id
  sensitive   = true
}

output "nat_enabled" {
  description = "Whether the optional NAT fallback is enabled."
  value       = module.egress.nat_enabled
}

output "network_foundation_ready" {
  description = "Sanitised readiness category for the network foundation."
  value       = true
}
