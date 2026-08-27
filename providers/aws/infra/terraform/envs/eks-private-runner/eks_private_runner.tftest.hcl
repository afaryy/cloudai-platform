mock_provider "aws" {}

run "composes_reviewed_private_network_outputs" {
  command = plan

  variables {
    network_foundation_vpc_id                   = "vpc-0123456789abcdef0"
    network_foundation_private_subnet_ids       = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
    network_foundation_runner_security_group_id = "sg-0123456789abcdef0"
    runner_project_name                         = "cloudai-platform-private-eks-runner"
    github_repository_url                       = "https://github.com/afaryy/cloudai-platform"
  }

  assert {
    condition     = module.runner.runner_project_name == "cloudai-platform-private-eks-runner"
    error_message = "The environment must preserve the CodeBuild/GitHub runner name contract."
  }

  assert {
    condition     = var.network_foundation_private_subnet_ids != []
    error_message = "The runner must consume private subnet outputs from the network foundation."
  }

  assert {
    condition     = var.network_foundation_runner_security_group_id != ""
    error_message = "The runner must consume the reviewed network security group output."
  }

  assert {
    condition     = module.runner.runner_ready == true
    error_message = "The runner foundation must publish a source-level readiness category."
  }
}
