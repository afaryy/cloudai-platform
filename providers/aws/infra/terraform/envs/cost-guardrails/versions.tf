terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project      = "cloudai-platform"
      Environment  = "cost-guardrails"
      DataScope    = "synthetic-only"
      ManagedBy    = "terraform"
      CostBoundary = "pre-gpu-poc"
      CloudAISlice = "YY-44"
    }
  }
}
