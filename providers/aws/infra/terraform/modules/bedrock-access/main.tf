locals {
  model_resources = concat(var.allowed_model_arns, var.allowed_model_resources)

  invoke_actions = [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",
  ]

  guardrail_invoke_actions = ["bedrock:InvokeModel"]

  guardrail_identifier_with_version = "${aws_bedrock_guardrail.sandbox.guardrail_arn}:${aws_bedrock_guardrail_version.sandbox.version}"

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

resource "aws_bedrock_guardrail" "sandbox" {
  name                      = "${var.name_prefix}-guardrail"
  description               = "Synthetic-only Bedrock Guardrail for one guarded Converse smoke test."
  blocked_input_messaging   = "The synthetic request was blocked by the sandbox Guardrail."
  blocked_outputs_messaging = "The synthetic response was blocked by the sandbox Guardrail."
  tags                      = var.tags

  content_policy_config {
    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = var.guardrail_prompt_attack_input_strength
      output_strength = var.guardrail_prompt_attack_output_strength
    }
  }

  sensitive_information_policy_config {
    pii_entities_config {
      type   = var.guardrail_pii_entity_type
      action = var.guardrail_pii_action
    }
  }
}

resource "aws_bedrock_guardrail_version" "sandbox" {
  guardrail_arn = aws_bedrock_guardrail.sandbox.guardrail_arn
  description   = "P8f synthetic guarded Converse smoke-test version."
}

data "aws_iam_policy_document" "bedrock_guardrail_smoke_test" {
  statement {
    sid     = "InvokeApprovedModelsOnlyWithSandboxGuardrail"
    effect  = "Allow"
    actions = local.guardrail_invoke_actions

    resources = local.model_resources

    condition {
      test     = "StringEquals"
      variable = "bedrock:GuardrailIdentifier"
      values   = [local.guardrail_identifier_with_version]
    }
  }
}

resource "aws_iam_role" "github_actions_bedrock_guardrail" {
  name               = "${var.name_prefix}-${var.github_actions_guardrail_role_name}"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json
  tags               = var.tags
}

resource "aws_iam_policy" "bedrock_guardrail_smoke_test" {
  name        = "${var.name_prefix}-bedrock-guardrail-smoke-test"
  description = "Least-privilege Bedrock guarded Converse boundary for one future synthetic smoke test."
  policy      = data.aws_iam_policy_document.bedrock_guardrail_smoke_test.json
  tags        = var.tags
}

resource "aws_iam_role_policy_attachment" "bedrock_guardrail_smoke_test" {
  role       = aws_iam_role.github_actions_bedrock_guardrail.name
  policy_arn = aws_iam_policy.bedrock_guardrail_smoke_test.arn
}
