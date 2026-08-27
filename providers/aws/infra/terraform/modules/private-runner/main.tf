locals {
  common_tags = merge(var.tags, {
    ManagedBy        = "terraform"
    Component        = "vpc-connected-delivery-runner"
    DataScope        = "synthetic-only"
    CostBoundary     = "private-eks-separate-budget"
    TeardownRequired = "true"
  })
}

locals {
  runner_assume_role = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = ["sts:AssumeRole"]
    }]
  })

  runner_permission_statements = concat(
    [{
      Sid      = "CloudWatchRunnerLogs"
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:DescribeLogGroups", "logs:DescribeLogStreams", "logs:PutLogEvents"]
      Resource = [aws_cloudwatch_log_group.runner.arn, "${aws_cloudwatch_log_group.runner.arn}:*"]
    }],
    [{
      Sid    = "CodeBuildVpcNetworking"
      Effect = "Allow"
      Action = [
        "ec2:CreateNetworkInterface",
        "ec2:CreateNetworkInterfacePermission",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeVpcs",
      ]
      Resource = ["*"]
    }],
    [{
      Sid      = "PrivateImagePull"
      Effect   = "Allow"
      Action   = ["ecr:GetAuthorizationToken"]
      Resource = ["*"]
    }],
    length(var.private_ecr_repository_arns) > 0 ? [{
      Sid      = "PrivateRepositoryPull"
      Effect   = "Allow"
      Action   = ["ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
      Resource = var.private_ecr_repository_arns
    }] : [],
    length(var.artifact_bucket_arns) > 0 ? [{
      Sid      = "ApprovedArtifactRead"
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = flatten([for arn in var.artifact_bucket_arns : [arn, "${arn}/*"]])
    }] : [],
  )

  runner_permissions = jsonencode({
    Version   = "2012-10-17"
    Statement = local.runner_permission_statements
  })
}

resource "aws_iam_role" "runner" {
  name               = "${var.project_name}-private-runner"
  assume_role_policy = local.runner_assume_role
  tags               = local.common_tags
}

resource "aws_iam_policy" "runner" {
  name        = "${var.project_name}-private-runner"
  description = "Least-privilege CodeBuild VPC runner permissions"
  policy      = local.runner_permissions
  tags        = local.common_tags
}

resource "aws_iam_role_policy_attachment" "runner" {
  role       = aws_iam_role.runner.name
  policy_arn = aws_iam_policy.runner.arn
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/aws/codebuild/${var.runner_project_name}"
  retention_in_days = var.log_retention_days
  tags              = local.common_tags
}

resource "aws_codebuild_project" "runner" {
  name          = var.runner_project_name
  description   = "Ephemeral VPC-connected GitHub Actions runner for private EKS lifecycle operations"
  service_role  = aws_iam_role.runner.arn
  build_timeout = 60

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = var.codebuild_compute_type
    image                       = var.codebuild_image
    type                        = var.codebuild_environment_type
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "CODEBUILD_CONFIG_GITHUB_ACTIONS_RUNNER_GROUP_ID"
      value = "1"
      type  = "PLAINTEXT"
    }
  }

  source {
    type     = "GITHUB"
    location = var.github_repository_url

    dynamic "auth" {
      for_each = var.github_source_auth_type == "NONE" ? [] : [1]

      content {
        type     = var.github_source_auth_type
        resource = var.github_source_auth_resource
      }
    }
  }

  lifecycle {
    precondition {
      condition     = var.github_source_auth_type == "NONE" || var.github_source_auth_resource != ""
      error_message = "A CodeConnections or Secrets Manager ARN is required when source auth is enabled."
    }
  }

  vpc_config {
    vpc_id             = var.vpc_id
    subnets            = var.private_subnet_ids
    security_group_ids = var.security_group_ids
  }

  logs_config {
    cloudwatch_logs {
      group_name  = aws_cloudwatch_log_group.runner.name
      stream_name = "runner"
      status      = "ENABLED"
    }
  }

  tags = local.common_tags
}

resource "aws_codebuild_webhook" "runner" {
  project_name = aws_codebuild_project.runner.name
  build_type   = "BUILD"

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "WORKFLOW_JOB_QUEUED"
    }
  }
}
