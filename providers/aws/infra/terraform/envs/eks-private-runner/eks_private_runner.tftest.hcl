mock_provider "aws" {}

override_data {
  target = data.terraform_remote_state.network
  values = {
    outputs = {
      vpc_id                            = "vpc-0123456789abcdef0"
      private_subnet_ids                = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
      delivery_runner_security_group_id = "sg-0123456789abcdef0"
      network_foundation_ready          = true
    }
  }
}

run "composes_reviewed_private_network_outputs" {
  command = plan

  variables {
    network_state_bucket  = "cloudai-platform-test-state"
    runner_project_name   = "cloudai-platform-private-eks-runner"
    github_repository_url = "https://github.com/afaryy/cloudai-platform"
  }

  assert {
    condition     = module.runner.runner_project_name == "cloudai-platform-private-eks-runner"
    error_message = "The environment must preserve the CodeBuild/GitHub runner name contract."
  }

  assert {
    condition     = output.network_state_consumed
    error_message = "The runner must consume the reviewed private-network state."
  }

  assert {
    condition     = tolist(data.terraform_remote_state.network.outputs.private_subnet_ids) == tolist(["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"])
    error_message = "The runner must consume private subnet outputs from the network foundation."
  }

  assert {
    condition     = tolist(module.runner.runner_security_group_ids) == tolist(["sg-0123456789abcdef0"])
    error_message = "The runner must consume the reviewed network security group output."
  }

  assert {
    condition     = module.runner.runner_ready == true
    error_message = "The runner foundation must publish a source-level readiness category."
  }
}
