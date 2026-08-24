mock_provider "aws" {
  mock_data "aws_region" {
    defaults = {
      name = "ap-southeast-2"
    }
  }

}

run "plans_scoped_private_endpoints" {
  command = plan

  variables {
    name_prefix                 = "cloudai-platform-eks-private-sandbox"
    vpc_id                      = "vpc-0123456789abcdef0"
    public_subnet_ids           = ["subnet-public-a", "subnet-public-b"]
    private_subnet_ids          = ["subnet-private-a", "subnet-private-b"]
    private_route_table_ids     = ["rtb-private-a", "rtb-private-b"]
    consumer_security_group_ids = ["sg-worker", "sg-runner"]
    allowed_principal_arns      = ["arn:aws:iam::123456789012:role/private-node", "arn:aws:iam::123456789012:role/private-runner"]
    private_ecr_repository_arns = ["arn:aws:ecr:ap-southeast-2:*:repository/cloudai-platform/*"]
    s3_bucket_arns              = ["arn:aws:s3:::private-artifacts"]
  }

  assert {
    condition     = length(aws_security_group.endpoints.ingress) == 2 && alltrue([for rule in aws_security_group.endpoints.ingress : length(rule.security_groups) == 1 && length(coalesce(rule.cidr_blocks, [])) == 0])
    error_message = "Endpoint ingress must be restricted to the worker and runner security groups, not CIDR-wide access."
  }

  assert {
    condition     = aws_vpc_endpoint.interface["ecr.api"].private_dns_enabled && aws_vpc_endpoint.interface["logs"].private_dns_enabled
    error_message = "Interface endpoints must use private DNS."
  }

  assert {
    condition     = aws_vpc_endpoint.interface["ecr.api"].policy != "" && aws_vpc_endpoint.s3.policy != ""
    error_message = "ECR and S3 endpoints must have explicit policies."
  }

  assert {
    condition     = strcontains(aws_vpc_endpoint.interface["ecr.api"].policy, "arn:aws:ecr:ap-southeast-2:*:repository/cloudai-platform/*") && strcontains(aws_vpc_endpoint.interface["ecr.dkr"].policy, "arn:aws:ecr:ap-southeast-2:*:repository/cloudai-platform/*")
    error_message = "ECR endpoint policies must scope image operations to the approved private repositories."
  }

  assert {
    condition     = strcontains(aws_vpc_endpoint.interface["ecr.api"].policy, "arn:aws:iam::123456789012:role/private-node") && strcontains(aws_vpc_endpoint.interface["logs"].policy, "arn:aws:iam::123456789012:role/private-runner")
    error_message = "Endpoint policies must identify the approved node and runner principals."
  }

  assert {
    condition     = strcontains(aws_vpc_endpoint.s3.policy, "arn:aws:s3:::private-artifacts") && !strcontains(aws_vpc_endpoint.s3.policy, "arn:aws:s3:::*")
    error_message = "S3 endpoint policy must use explicit artifact bucket ARNs, never a wildcard bucket resource."
  }

  assert {
    condition     = var.enable_nat_gateway == false
    error_message = "The private egress module must default to no NAT."
  }
}
