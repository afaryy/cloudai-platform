# P8b.5 Bootstrap Bedrock IAM Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit the existing GitHub Actions OIDC Terraform role to create and manage only the P8b Bedrock sandbox IAM role and policy.

**Architecture:** Extend the existing CloudFormation inline policy on `GitHubActionsTerraformRole` with a separately named, resource-bounded Bedrock statement. Keep P8b execution permissions separate from EKS permissions and verify the boundary with a dependency-free template test.

**Tech Stack:** AWS CloudFormation YAML, IAM policy documents, Ruby standard-library Minitest.

## Global Constraints

- Modify only the bootstrap template, its README, and a focused template test.
- Restrict Bedrock-path IAM role and policy resources to `cloudai-platform-bedrock-sandbox-*`.
- Do not grant `bedrock:*`, `iam:PassRole`, static credentials, workflow changes, or Terraform module changes.
- Do not apply CloudFormation or Terraform as part of this code change.

---

### Task 1: Add a regression test for the bootstrap permission boundary

**Files:**
- Create: `providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

**Interfaces:**
- Consumes: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` as a UTF-8 text file.
- Produces: a zero-exit test result when the bounded Bedrock statement and exclusions are present.

- [x] **Step 1: Write the failing test**

```ruby
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
```

- [x] **Step 2: Run the test to verify it fails**

Run: `ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

Expected: failure because `BedrockSandboxIamApply` is not yet present.

### Task 2: Add the bounded Bedrock IAM lifecycle statement

**Files:**
- Modify: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` in `GitHubActionsTerraformRole.Properties.Policies[0].PolicyDocument.Statement`

**Interfaces:**
- Consumes: the test in Task 1 and the P8b lifecycle checklist in `docs/p8b1-bedrock-iam-apply-readiness.md`.
- Produces: the permissions needed for P8b role, policy, tag, and attachment lifecycle operations.

- [x] **Step 1: Add the minimal `BedrockSandboxIamApply` statement**

```yaml
- Sid: BedrockSandboxIamApply
  Effect: Allow
  Action:
    - iam:AttachRolePolicy
    - iam:CreatePolicy
    - iam:CreatePolicyVersion
    - iam:CreateRole
    - iam:DeletePolicy
    - iam:DeletePolicyVersion
    - iam:DeleteRole
    - iam:DetachRolePolicy
    - iam:GetPolicy
    - iam:GetPolicyVersion
    - iam:GetRole
    - iam:ListAttachedRolePolicies
    - iam:ListPolicyTags
    - iam:ListRoleTags
    - iam:SetDefaultPolicyVersion
    - iam:TagPolicy
    - iam:TagRole
    - iam:UntagPolicy
    - iam:UntagRole
    - iam:UpdateAssumeRolePolicy
  Resource:
    - !Sub "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/cloudai-platform-bedrock-sandbox-*"
    - !Sub "arn:${AWS::Partition}:iam::${AWS::AccountId}:policy/cloudai-platform-bedrock-sandbox-*"
```

- [x] **Step 2: Run the focused test to verify it passes**

Run: `ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

Expected: `2 runs, 0 failures, 0 errors`.

- [x] **Step 3: Parse the template**

Run: `ruby -ryaml -e 'YAML.load_file("providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml"); puts "template parse passed"'`

Expected: `template parse passed`.

### Task 3: Document the bootstrap-stack update path

**Files:**
- Modify: `providers/aws/infra/bootstrap/README.md` in `Updating The Bootstrap Stack`

**Interfaces:**
- Consumes: the bounded P8b permission statement from Task 2.
- Produces: operator guidance to update CloudFormation first, then run the workflow validate/plan/apply sequence.

- [x] **Step 1: Add Bedrock-specific update guidance**

Add text stating that a Bedrock `iam:CreatePolicy` or similar P8b lifecycle denial must be remediated by updating this bootstrap CloudFormation stack. State that the new permissions are restricted to the Bedrock sandbox naming boundary and do not permit Bedrock model invocation.

- [x] **Step 2: Run the complete focused verification**

Run:

```bash
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
ruby -ryaml -e 'YAML.load_file("providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml"); puts "template parse passed"'
git diff --check
```

Expected: the Minitest command reports `2 runs, 0 failures, 0 errors`; the parser prints `template parse passed`; and `git diff --check` emits no output.

- [x] **Step 3: Commit the implementation**

```bash
git add providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml \
  providers/aws/infra/bootstrap/README.md \
  providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb \
  docs/superpowers/plans/2026-07-18-p8b5-bootstrap-bedrock-iam-permissions.md
git commit -m "feat: allow bounded Bedrock IAM bootstrap apply"
```
