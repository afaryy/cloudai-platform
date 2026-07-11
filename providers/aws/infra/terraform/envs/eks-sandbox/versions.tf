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
  region = "ap-southeast-2"

  default_tags {
    tags = {
      Project     = "cloudai-platform"
      Environment = "eks-sandbox"
      DataScope   = "synthetic-only"
      ManagedBy   = "terraform"
    }
  }
}
