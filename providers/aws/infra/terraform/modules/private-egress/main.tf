locals {
  interface_services = {
    "ecr.api" = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:DescribeRepositories",
      "ecr:GetDownloadUrlForLayer",
    ]
    "ecr.dkr" = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    "sts" = ["sts:GetCallerIdentity", "sts:AssumeRoleWithWebIdentity"]
    "eks" = ["eks:DescribeCluster", "eks:ListClusters"]
    "ec2" = [
      "ec2:DescribeInstances",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribeRouteTables",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeSubnets",
      "ec2:DescribeTags",
    ]
    "logs" = [
      "logs:CreateLogStream",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:PutLogEvents",
    ]
  }

  non_ecr_interface_services = {
    for service, actions in local.interface_services : service => actions
    if service != "ecr.api" && service != "ecr.dkr"
  }

  ecr_api_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = ["ecr:GetAuthorizationToken"]
        Resource  = ["*"]
        Principal = { AWS = var.allowed_principal_arns }
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:DescribeRepositories",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource  = var.private_ecr_repository_arns
        Principal = { AWS = var.allowed_principal_arns }
      },
    ]
  })

  ecr_dkr_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = local.interface_services["ecr.dkr"]
      Resource  = var.private_ecr_repository_arns
      Principal = { AWS = var.allowed_principal_arns }
    }]
  })

  service_endpoint_policies = {
    for service, actions in local.non_ecr_interface_services : service => jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect    = "Allow"
        Action    = actions
        Resource  = ["*"]
        Principal = { AWS = var.allowed_principal_arns }
      }]
    })
  }

  s3_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:ListBucket"]
      Resource = concat(
        var.s3_bucket_arns,
        [for arn in var.s3_bucket_arns : "${arn}/*"]
      )
      Principal = { AWS = var.allowed_principal_arns }
    }]
  })
}

resource "aws_security_group" "endpoints" {
  name        = "${var.name_prefix}-endpoint-sg"
  description = "Private AWS endpoint access for EKS workers and VPC runner"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.consumer_security_group_ids

    content {
      description     = "HTTPS from an approved private workload or runner"
      protocol        = "tcp"
      from_port       = 443
      to_port         = 443
      security_groups = [ingress.value]
    }
  }

  egress {
    description = "Endpoint response path"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-endpoint-sg"
  })
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_services

  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.${each.key}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.endpoints.id]
  policy = each.key == "ecr.api" ? local.ecr_api_policy : (
    each.key == "ecr.dkr" ? local.ecr_dkr_policy : local.service_endpoint_policies[each.key]
  )

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-${each.key}-endpoint"
  })
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids
  policy            = local.s3_policy

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-s3-endpoint"
  })
}

resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-nat-eip"
  })
}

resource "aws_nat_gateway" "this" {
  count = var.enable_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = var.public_subnet_ids[0]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-nat"
  })
}

resource "aws_route" "private_nat" {
  count = var.enable_nat_gateway ? length(var.private_route_table_ids) : 0

  route_table_id         = var.private_route_table_ids[count.index]
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

data "aws_region" "current" {}
