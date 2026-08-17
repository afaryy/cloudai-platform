locals {
  name_prefix = replace("${var.project_name}-${var.environment}", "-", "")
  ecr_name    = "${var.project_name}-${var.environment}"

  github_subject = "repo:${var.github_org}/${var.github_repo}:environment:${var.github_environment}"

  agentcore_assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "bedrock-agentcore.amazonaws.com" }
    }]
  })

  common_tags = merge(var.tags, {
    Project          = var.project_name
    Environment      = var.environment
    DataScope        = "synthetic-only"
    ManagedBy        = "terraform"
    CostBoundary     = "personal-sandbox"
    TeardownRequired = "true"
    CloudAISlice     = "P8i"
  })
}

resource "aws_ecr_repository" "runtime" {
  name                 = local.ecr_name
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.common_tags
}

resource "aws_ecr_lifecycle_policy" "runtime" {
  repository = aws_ecr_repository.runtime.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain only five immutable sandbox images."
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_iam_role" "image_publisher" {
  name = "${local.name_prefix}-image-publisher"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = var.github_oidc_provider_arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = local.github_subject
        }
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "image_publisher_ecr_push" {
  name = "${local.name_prefix}-image-publisher-ecr-push"
  role = aws_iam_role.image_publisher.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = aws_ecr_repository.runtime.arn
      }
    ]
  })
}

resource "aws_iam_role" "runtime" {
  name               = "${local.name_prefix}-runtime"
  assume_role_policy = local.agentcore_assume_role_policy
  tags               = local.common_tags
}

resource "aws_iam_role_policy" "runtime_ecr_pull" {
  name = "${local.name_prefix}-runtime-ecr-pull"
  role = aws_iam_role.runtime.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = aws_ecr_repository.runtime.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "runtime_bedrock_retrieval" {
  count = var.enable_runtime ? 1 : 0

  name = "${local.name_prefix}-runtime-bedrock-retrieval"
  role = aws_iam_role.runtime.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate"]
        Resource = var.knowledge_base_arn
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = var.model_arn
      }
    ]
  })
}

resource "aws_iam_role" "gateway" {
  name               = "${local.name_prefix}-gateway"
  assume_role_policy = local.agentcore_assume_role_policy
  tags               = local.common_tags
}

resource "aws_bedrockagentcore_agent_runtime" "governed_rag" {
  count = var.enable_runtime ? 1 : 0

  agent_runtime_name = local.name_prefix
  description        = "Synthetic-only governed RAG runtime. It has no write tools, memory, browser, or direct production access."
  role_arn           = aws_iam_role.runtime.arn

  agent_runtime_artifact {
    container_configuration {
      container_uri = var.container_image_uri
    }
  }

  environment_variables = {
    AGENTCORE_RAG_KNOWLEDGE_BASE_ID = var.knowledge_base_id
    AGENTCORE_RAG_MODEL_ARN         = var.model_arn
  }

  network_configuration {
    network_mode = "PUBLIC"
  }

  protocol_configuration {
    server_protocol = "HTTP"
  }

  tags = local.common_tags

  depends_on = [aws_iam_role_policy.runtime_bedrock_retrieval]
}

resource "aws_iam_role_policy" "gateway_invoke_runtime" {
  count = var.enable_runtime ? 1 : 0

  name = "${local.name_prefix}-gateway-invoke-runtime"
  role = aws_iam_role.gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["bedrock-agentcore:InvokeAgentRuntime"]
      Resource = aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_arn
    }]
  })
}

resource "aws_bedrockagentcore_gateway" "governed_rag" {
  count = var.enable_runtime ? 1 : 0

  name            = "${var.project_name}-agentcore-rag"
  description     = "IAM-authenticated gateway for the governed synthetic-only RAG runtime."
  authorizer_type = "AWS_IAM"
  role_arn        = aws_iam_role.gateway.arn
  tags            = local.common_tags

  depends_on = [aws_iam_role_policy.gateway_invoke_runtime]
}

resource "aws_bedrockagentcore_gateway_target" "runtime" {
  count = var.enable_runtime ? 1 : 0

  gateway_identifier = aws_bedrockagentcore_gateway.governed_rag[0].gateway_id
  name               = "governed-rag-runtime"
  description        = "The single allowed runtime target for this sandbox gateway."

  target_configuration {
    http {
      agentcore_runtime {
        arn       = aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_arn
        qualifier = aws_bedrockagentcore_agent_runtime.governed_rag[0].agent_runtime_version
      }
    }
  }

  credential_provider_configuration {
    gateway_iam_role {
      service = "bedrock-agentcore"
      region  = var.aws_region
    }
  }
}
