require "minitest/autorun"

class GitHubOidcTerraformBackendTest < Minitest::Test
  TEMPLATE = File.expand_path("github-oidc-terraform-backend.yaml", __dir__)
  REQUIRED_ACTIONS = %w[
    iam:AttachRolePolicy iam:CreatePolicy iam:CreatePolicyVersion
    iam:CreateRole iam:DeletePolicy iam:DeletePolicyVersion iam:DeleteRole
    iam:DetachRolePolicy iam:GetPolicy iam:GetPolicyVersion iam:GetRole
    iam:ListAttachedRolePolicies iam:ListPolicyTags iam:ListRoleTags
    iam:SetDefaultPolicyVersion iam:TagPolicy iam:TagRole iam:UntagPolicy
    iam:UntagRole iam:UpdateAssumeRolePolicy
  ].freeze

  def template
    @template ||= File.read(TEMPLATE)
  end

  def test_includes_bounded_bedrock_iam_lifecycle_statement
    assert_includes template, "Sid: BedrockSandboxIamApply"
    REQUIRED_ACTIONS.each { |action| assert_includes bedrock_statement, action }
    assert_includes template, "role/cloudai-platform-bedrock-sandbox-*"
    assert_includes template, "policy/cloudai-platform-bedrock-sandbox-*"
  end

  def test_bedrock_statement_excludes_runtime_and_pass_role_permissions
    refute_includes bedrock_statement, "bedrock:InvokeModel"
    refute_includes bedrock_statement, "iam:PassRole"
  end

  private

  def bedrock_statement
    template.split("Sid: BedrockSandboxIamApply", 2).fetch(1, "").split(/\n\s+- Sid:/, 2).first.to_s
  end
end
