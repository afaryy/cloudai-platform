data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = var.network_state_bucket
    key    = var.network_state_key
    region = var.network_state_region
  }
}

module "runner" {
  source = "../../modules/private-runner"

  project_name                = local.name_prefix
  runner_project_name         = var.runner_project_name
  vpc_id                      = data.terraform_remote_state.network.outputs.vpc_id
  private_subnet_ids          = data.terraform_remote_state.network.outputs.private_subnet_ids
  security_group_ids          = [data.terraform_remote_state.network.outputs.delivery_runner_security_group_id]
  github_repository_url       = var.github_repository_url
  github_source_auth_type     = var.github_source_auth_type
  github_source_auth_resource = var.github_source_auth_resource
  codebuild_compute_type      = var.codebuild_compute_type
  codebuild_image             = var.codebuild_image
  log_retention_days          = var.log_retention_days
  private_ecr_repository_arns = var.private_ecr_repository_arns
  artifact_bucket_arns        = var.artifact_bucket_arns
  tags                        = local.common_tags
}
