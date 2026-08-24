output "vpc_id" {
  description = "Private EKS VPC ID."
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs reserved for ingress and controlled egress."
  value       = values(aws_subnet.public)[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs for EKS workers and future GPU capacity."
  value       = values(aws_subnet.private)[*].id
}

output "private_route_table_ids" {
  description = "Private route table IDs used by endpoint and egress controls."
  value       = values(aws_route_table.private)[*].id
}

output "private_subnet_public_ip_on_launch" {
  description = "Public-IP launch flags for private subnets; every value must remain false."
  value       = { for key, subnet in aws_subnet.private : key => subnet.map_public_ip_on_launch }
}
