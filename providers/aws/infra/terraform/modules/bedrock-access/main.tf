locals {
  model_resources = concat(var.allowed_model_arns, var.allowed_model_resources)

  invoke_actions = [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",
  ]

  trust_conditions = {
    audience = var.github_audience
    subject  = var.github_subject
  }
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = [local.trust_conditions.audience]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.trust_conditions.subject]
    }
  }
}

data "aws_iam_policy_document" "bedrock_smoke_test" {
  statement {
    sid     = "InvokeApprovedModels"
    effect  = "Allow"
    actions = local.invoke_actions

    resources = local.model_resources
  }
}

resource "aws_iam_role" "github_actions_bedrock" {
  name               = "${var.name_prefix}-${var.github_actions_role_name}"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json
  tags               = var.tags
}

resource "aws_iam_policy" "bedrock_smoke_test" {
  name        = "${var.name_prefix}-bedrock-smoke-test"
  description = "Least-privilege Bedrock invoke boundary for one future synthetic smoke test."
  policy      = data.aws_iam_policy_document.bedrock_smoke_test.json
  tags        = var.tags
}

resource "aws_iam_role_policy_attachment" "bedrock_smoke_test" {
  role       = aws_iam_role.github_actions_bedrock.name
  policy_arn = aws_iam_policy.bedrock_smoke_test.arn
}
