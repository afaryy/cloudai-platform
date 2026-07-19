locals {
  name_prefix = "${var.project_name}-${var.environment}"

  github_subject = "repo:${var.github_org}/${var.github_repo}:environment:${var.github_environment}"

  common_tags = merge(var.tags, {
    Project          = var.project_name
    Environment      = var.environment
    DataScope        = "synthetic-only"
    ManagedBy        = "terraform"
    CostBoundary     = "personal-sandbox"
    TeardownRequired = "true"
    CloudAISlice     = "P8b"
  })
}

module "bedrock_access" {
  source = "../../modules/bedrock-access"

  name_prefix                             = local.name_prefix
  github_oidc_provider_arn                = var.github_oidc_provider_arn
  github_subject                          = local.github_subject
  allowed_model_arns                      = var.allowed_model_arns
  github_actions_guardrail_role_name      = var.github_actions_guardrail_role_name
  guardrail_prompt_attack_input_strength  = var.guardrail_prompt_attack_input_strength
  guardrail_prompt_attack_output_strength = var.guardrail_prompt_attack_output_strength
  guardrail_pii_entity_type               = var.guardrail_pii_entity_type
  guardrail_pii_action                    = var.guardrail_pii_action
  tags                                    = local.common_tags
}
