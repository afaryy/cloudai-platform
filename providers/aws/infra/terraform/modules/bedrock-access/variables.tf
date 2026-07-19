variable "name_prefix" {
  description = "Name prefix for Bedrock sandbox IAM resources."
  type        = string
}

variable "github_actions_role_name" {
  description = "IAM role name for the GitHub Actions Bedrock sandbox role."
  type        = string
  default     = "bedrock-smoke-test"
}

variable "github_actions_guardrail_role_name" {
  description = "IAM role name for the GitHub Actions Bedrock Guardrail smoke test."
  type        = string
  default     = "bedrock-guardrail-smoke-test"
}

variable "guardrail_prompt_attack_input_strength" {
  description = "Prompt Attack input filter strength for the synthetic sandbox Guardrail."
  type        = string
  default     = "HIGH"
}

variable "guardrail_prompt_attack_output_strength" {
  description = "Prompt Attack output filter strength for the synthetic sandbox Guardrail."
  type        = string
  default     = "HIGH"
}

variable "guardrail_pii_entity_type" {
  description = "One standard PII entity type for the synthetic sandbox Guardrail."
  type        = string
  default     = "EMAIL"
}

variable "guardrail_pii_action" {
  description = "Action for the one synthetic sandbox PII entity policy."
  type        = string
  default     = "BLOCK"
}

variable "allowed_model_arns" {
  description = "Bedrock model ARNs allowed for the future synthetic smoke test. Use explicit model ARNs where AWS supports model-level scoping."
  type        = list(string)
}

variable "allowed_model_resources" {
  description = "Fallback Bedrock resource scope for providers/models that cannot be cleanly represented as ARNs in the sandbox. Keep this narrow where possible."
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.allowed_model_resources) == 0 || !contains(var.allowed_model_resources, "*")
    error_message = "Do not use '*' in allowed_model_resources. Use explicit model ARNs in allowed_model_arns or document the limitation before changing this boundary."
  }
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN for the sandbox account."
  type        = string
}

variable "github_subject" {
  description = "GitHub OIDC subject allowed to assume the Bedrock sandbox role."
  type        = string
}

variable "github_audience" {
  description = "GitHub OIDC audience expected by AWS STS."
  type        = string
  default     = "sts.amazonaws.com"
}

variable "tags" {
  description = "Tags to apply to Bedrock sandbox IAM resources."
  type        = map(string)
  default     = {}
}
