output "endpoint_security_group_id" {
  description = "Security group ID attached to private interface endpoints."
  value       = aws_security_group.endpoints.id
}

output "interface_endpoint_ids" {
  description = "Interface endpoint IDs by AWS service suffix."
  value       = { for service, endpoint in aws_vpc_endpoint.interface : service => endpoint.id }
}

output "s3_endpoint_id" {
  description = "S3 gateway endpoint ID."
  value       = aws_vpc_endpoint.s3.id
}

output "nat_enabled" {
  description = "Whether the optional NAT fallback is enabled."
  value       = var.enable_nat_gateway
}
