mock_provider "aws" {}

run "plans_vpc_connected_ephemeral_runner" {
  command = plan

  variables {
    project_name            = "cloudai-platform"
    runner_project_name     = "cloudai-platform-private-eks-runner"
    vpc_id                  = "vpc-0123456789abcdef0"
    private_subnet_ids      = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
    security_group_ids      = ["sg-0123456789abcdef0"]
    github_repository_url   = "https://github.com/afaryy/cloudai-platform"
    github_source_auth_type = "NONE"
  }

  assert {
    condition     = var.private_subnet_ids != []
    error_message = "The runner must be attached to reviewed private subnets."
  }

  assert {
    condition     = var.security_group_ids != []
    error_message = "The runner must use a reviewed security group."
  }

  assert {
    condition     = aws_cloudwatch_log_group.runner.retention_in_days == 7
    error_message = "Runner logs must use the short seven-day default retention."
  }

  assert {
    condition     = aws_codebuild_project.runner.vpc_config[0].vpc_id != ""
    error_message = "The CodeBuild runner must be VPC connected."
  }

  assert {
    condition     = aws_codebuild_project.runner.vpc_config[0].subnets != []
    error_message = "The CodeBuild runner must use private subnets."
  }

  assert {
    condition     = aws_codebuild_project.runner.vpc_config[0].security_group_ids != []
    error_message = "The CodeBuild runner must use an explicit security group."
  }

  assert {
    condition     = length(aws_codebuild_webhook.runner.filter_group) > 0
    error_message = "The runner project must trigger only from a GitHub workflow-job webhook."
  }

  assert {
    condition     = var.runner_project_name != ""
    error_message = "The runner project name is part of the workflow contract."
  }
}
