mock_provider "aws" {}

run "plans_public_sandbox_network" {
  command = plan

  variables {
    name_prefix         = "cloudai-platform-eks-sandbox"
    vpc_cidr            = "10.42.0.0/16"
    public_subnet_cidrs = ["10.42.0.0/24", "10.42.1.0/24"]
    availability_zones  = ["ap-southeast-2a", "ap-southeast-2b"]
    tags = {
      Project     = "cloudai-platform"
      Environment = "eks-sandbox"
      DataScope   = "synthetic-only"
    }
  }

  assert {
    condition     = aws_vpc.this.cidr_block == "10.42.0.0/16"
    error_message = "The sandbox VPC must use the requested CIDR block."
  }

  assert {
    condition     = aws_vpc.this.enable_dns_hostnames && aws_vpc.this.enable_dns_support
    error_message = "The sandbox VPC must enable DNS support for EKS."
  }

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "The sandbox network must create one public subnet per requested CIDR."
  }

  assert {
    condition     = alltrue([for subnet in aws_subnet.public : subnet.map_public_ip_on_launch])
    error_message = "The first low-cost sandbox path expects public subnets to assign public IPs."
  }

  assert {
    condition     = alltrue([for subnet in aws_subnet.public : subnet.tags["kubernetes.io/role/elb"] == "1"])
    error_message = "Public subnets must be tagged for Kubernetes load balancers."
  }
}

run "rejects_missing_availability_zone" {
  command = plan

  variables {
    name_prefix         = "cloudai-platform-eks-sandbox"
    vpc_cidr            = "10.42.0.0/16"
    public_subnet_cidrs = ["10.42.0.0/24", "10.42.1.0/24"]
    availability_zones  = ["ap-southeast-2a"]
  }

  expect_failures = [
    var.availability_zones
  ]
}
