require "minitest/autorun"

class GitHubOidcTerraformBackendTest < Minitest::Test
  TEMPLATE = File.expand_path("github-oidc-terraform-backend.yaml", __dir__)
  COST_GUARDRAILS_MODULE = File.expand_path("../terraform/modules/cost-guardrails/main.tf", __dir__)
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

  def test_includes_dedicated_budget_guardrails_role
    assert_includes template, "GitHubActionsBudgetGuardrailsRole:"
    assert_includes budget_role, "DependsOn: GitHubActionsBootstrapRole"
    assert_includes budget_role, 'RoleName: !Sub "${GitHubRepo}-${GitHubEnvironment}-budget-guardrails"'
    assert_includes budget_role, 'token.actions.githubusercontent.com:sub: !Sub "repo:${GitHubOrg}/${GitHubRepo}:environment:${GitHubEnvironment}"'
    assert_includes template, "BudgetGuardrailsRoleArn:"
  end

  def test_includes_dedicated_private_eks_network_role
    assert_includes template, "GitHubActionsPrivateEKSNetworkRole:"
    assert_includes private_network_role, 'RoleName: !Sub "${GitHubRepo}-aws-private-eks-terraform"'
    assert_includes private_network_role, 'token.actions.githubusercontent.com:sub: !Sub "repo:${GitHubOrg}/${GitHubRepo}:environment:aws-private-eks"'
    assert_includes private_network_role, "PrivateEKSNetworkStateKey"
    assert_includes private_network_role, "ec2:CreateVpc"
    assert_includes private_network_role, "ec2:CreateVpcEndpoint"
    assert_includes private_network_role, "ec2:CreateNatGateway"
    refute_includes private_network_role, "eks:CreateCluster"
    refute_includes private_network_role, "iam:PassRole"
    assert_includes template, "PrivateEKSNetworkRoleArn:"
    assert_includes template, "PrivateEKSNetworkStateKey:"
  end

  def test_bootstrap_role_can_inspect_only_the_recovery_contract
    assert_includes bootstrap_stack_statement, "cloudformation:DescribeStackResources"
    assert_includes bootstrap_role_management_statement, "iam:ListAttachedRolePolicies"
    assert_includes bootstrap_role_management_statement, "iam:ListRoleTags"
    assert_includes bootstrap_role_management_statement, "iam:DeleteRole"
    assert_includes bootstrap_role_management_statement, "iam:DeleteRolePolicy"
    assert_includes bootstrap_role_management_statement, 'role/${GitHubRepo}-${GitHubEnvironment}-budget-guardrails'
    assert_includes bootstrap_role_management_statement, 'role/${GitHubRepo}-aws-private-eks-terraform'
    refute_includes bootstrap_role_management_statement, "iam:DeleteUser"
    refute_includes bootstrap_role_management_statement, "iam:DeletePolicy"
  end

  def test_budget_guardrails_role_allows_only_required_budgets_and_billing_actions
    %w[
      budgets:ModifyBudget budgets:ViewBudget budgets:TagResource
      budgets:UntagResource budgets:ListTagsForResource
      aws-portal:ModifyBilling aws-portal:ViewBilling
    ].each { |action| assert_includes budget_role, action }

    assert_includes budget_role, "budget/cloudai-platform-*"
    assert_includes budget_role, "aws:RequestTag/Project"
    assert_includes budget_role, "aws:RequestTag/CloudAISlice"
    assert_includes budget_role, '"Null":'
    assert_includes budget_role, "aws:ResourceTag/Project"
    assert_includes budget_role, "BudgetGuardrailsStateKey"
    assert_includes budget_role, "s3:prefix"
    assert_includes budget_role, "TerraformLockfileAccess"
    refute_includes budget_role, 'Resource: !Sub "${TerraformStateBucket.Arn}/*"'
    refute_includes budget_role, "dynamodb:"
    refute_includes budget_role, "ec2:RunInstances"
    refute_includes budget_role, "eks:CreateCluster"
    refute_includes budget_role, "bedrock:InvokeModel"
    refute_includes budget_role, "iam:PassRole"
    refute_includes budget_role, "budgets:CreateBudgetAction"
  end

  def test_general_terraform_role_receives_no_billing_portal_permission
    refute_includes terraform_role, "aws-portal:ModifyBilling"
    refute_includes terraform_role, "aws-portal:ViewBilling"
    assert_includes terraform_role, "servicequotas:ListServiceQuotas"
    assert_includes terraform_role, '- !Sub "${TerraformStateBucket.Arn}"'
    assert_includes terraform_role, '- !Sub "${TerraformStateBucket.Arn}/*"'
  end

  def test_cost_guardrails_module_defines_only_reviewed_budget_boundaries
    assert File.exist?(COST_GUARDRAILS_MODULE), "Cost Guardrails module must exist."
    return unless File.exist?(COST_GUARDRAILS_MODULE)

    source = File.read(COST_GUARDRAILS_MODULE)

    assert_match(/name\s+=\s+"cloudai-platform-sandbox-monthly-cost"/, source)
    assert_match(/name\s+=\s+"cloudai-platform-gpu-poc-daily-cost"/, source)
    assert_match(/limit_amount\s+=\s+tostring\(var\.monthly_budget_usd\)/, source)
    assert_match(/limit_amount\s+=\s+tostring\(var\.gpu_daily_budget_usd\)/, source)
    variables = File.read(File.expand_path("../terraform/modules/cost-guardrails/variables.tf", __dir__))
    assert_match(/default\s+=\s+50/, variables)
    assert_match(/default\s+=\s+20/, variables)
    assert_match(/notification_type\s+=\s+"ACTUAL"/, source)
    assert_equal 2, source.scan('resource "aws_budgets_budget"').length
    assert_includes variables, 'default     = "15,30,40,50"'
    assert_includes variables, 'default     = "10,15,20"'
    refute_includes source, 'formatdate("YYYY-MM-DD_hh:mm"'
    refute_includes source, 'time_unit         = "CUSTOM"'
    refute_includes source, "offset_days  = 7"
    refute_includes source, "aws_budgets_budget_action"
  end

  private

  def bedrock_statement
    template.split("Sid: BedrockSandboxIamApply", 2).fetch(1, "").split(/\n\s+- Sid:/, 2).first.to_s
  end

  def terraform_role
    template.split("GitHubActionsTerraformRole:", 2).fetch(1, "").split("AgentCoreRagTerraformPolicy:", 2).first.to_s
  end

  def budget_role
    template.split("GitHubActionsBudgetGuardrailsRole:", 2).fetch(1, "").split("AgentCoreRagTerraformPolicy:", 2).first.to_s
  end

  def private_network_role
    template.split("GitHubActionsPrivateEKSNetworkRole:", 2).fetch(1, "").split("AgentCoreRagTerraformPolicy:", 2).first.to_s
  end

  def bootstrap_role
    template.split("GitHubActionsBootstrapRole:", 2).fetch(1, "").split("Outputs:", 2).first.to_s
  end

  def bootstrap_stack_statement
    bootstrap_role.split("Sid: ManageOnlyThisBootstrapStack", 2).fetch(1, "").split(/\n\s+- Sid:/, 2).first.to_s
  end

  def bootstrap_role_management_statement
    bootstrap_role.split("Sid: ManageOnlyTerraformBootstrapAndBudgetRoles", 2).fetch(1, "").split(/\n\s+- Sid:/, 2).first.to_s
  end
end
