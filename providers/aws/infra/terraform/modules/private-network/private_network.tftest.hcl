mock_provider "aws" {}

run "plans_private_subnets_without_public_ip_or_igw_default" {
  command = apply

  variables {
    name_prefix          = "cloudai-platform-eks-private-sandbox"
    vpc_cidr             = "10.43.0.0/20"
    public_subnet_cidrs  = ["10.43.0.0/24", "10.43.1.0/24"]
    private_subnet_cidrs = ["10.43.4.0/24", "10.43.5.0/24"]
    availability_zones   = ["ap-southeast-2a", "ap-southeast-2b"]
  }

  assert {
    condition     = alltrue([for subnet in aws_subnet.private : subnet.map_public_ip_on_launch == false])
    error_message = "Private subnets must never assign public IP addresses on launch."
  }

  assert {
    condition     = alltrue([for route_table in aws_route_table.private : length(route_table.route) == 0])
    error_message = "Private route tables must not contain an implicit Internet Gateway default route."
  }

  assert {
    condition     = length(aws_route_table_association.private) == 2 && length(aws_route_table_association.public) == 2
    error_message = "Both public and private subnet route associations must be explicit."
  }
}
