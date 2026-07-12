output "vpc_id" {
  description = "Sandbox VPC ID."
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for the sandbox EKS cluster."
  value       = values(aws_subnet.public)[*].id
}
