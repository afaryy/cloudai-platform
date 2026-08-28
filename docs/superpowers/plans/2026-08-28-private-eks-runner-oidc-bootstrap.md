# Private EKS Runner OIDC Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision a dedicated GitHub OIDC Terraform role for the VPC-connected CodeBuild runner state without widening the private-network role or granting runner lifecycle permissions to ARC.

**Architecture:** CloudFormation owns the GitHub OIDC trust and the Terraform deployment role. The new role may write only the runner state, read the private-network state, acquire the shared lock, and manage the six resources in the reviewed runner Terraform plan. The CodeBuild service role created by Terraform remains a separate runtime identity.

**Tech Stack:** AWS CloudFormation, IAM, GitHub Actions OIDC, Terraform, IAM Policy Autopilot, S3 state, DynamoDB locking, CodeBuild, CloudWatch Logs

**Spec:** `docs/superpowers/plans/2026-08-28-private-eks-runner-arc-implementation-plan.md`

## Global Constraints

- Use a non-`codex/` branch name.
- Do not mutate AWS while implementing or validating this source change.
- Bind GitHub OIDC trust to `repo:${GitHubOrg}/${GitHubRepo}:environment:aws-private-eks`.
- Keep the private-network role, runner-state Terraform role, and CodeBuild runtime role separate.
- Permit runner-state write access only to `cloudai-platform/eks-private-runner/terraform.tfstate` and its lock object.
- Permit private-network state access as read-only; never grant `s3:PutObject` or `s3:DeleteObject` to its key.
- Scope `iam:PassRole` to the exact CodeBuild runtime role and require `iam:PassedToService=codebuild.amazonaws.com`.
- Use the reviewed six-resource Terraform plan and official AWS Service Authorization Reference as the IAM baseline.
- Do not execute a CloudFormation change set without a separate exact confirmation.

---

### Task 1: Add fail-closed bootstrap role contract tests

**Files:**
- Modify: `.github/workflows/terraform-tests.yaml`

**Interfaces:**
- Consumes: `github-oidc-terraform-backend.yaml` and the runner Terraform naming contract.
- Produces: static CI assertions for role separation, state access, OIDC trust, scoped `iam:PassRole`, outputs, and toolkit attribution.

- [x] **Step 1: Add the failing boundary test**

Add a `bootstrap_private_eks_runner_role_boundary` job that loads the template with Ruby YAML while preserving CloudFormation tags as strings, then asserts:

```text
PrivateEKSRunnerStateKey exists
GitHubActionsPrivateEKSRunnerRole exists
the role trust subject ends with environment:aws-private-eks
runner state has GetObject/PutObject/DeleteObject
network state has GetObject only
iam:PassRole uses the exact CodeBuild runtime role ARN and PassedToService condition
PrivateEKSRunnerRoleArn and PrivateEKSRunnerStateKey outputs exist
Metadata.AWSToolsMetrics.AWSAgentToolkit equals aws-cloudformation@2
```

- [x] **Step 2: Run the new boundary job locally and verify failure**

Run the extracted Ruby assertion script against the current template.

Expected: FAIL because `PrivateEKSRunnerStateKey` and `GitHubActionsPrivateEKSRunnerRole` do not yet exist.

- [x] **Step 3: Commit the red test**

```bash
git add .github/workflows/terraform-tests.yaml
git commit -m "test: require private runner OIDC role"
```

### Task 2: Implement the dedicated CloudFormation role

**Files:**
- Modify: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml`

**Interfaces:**
- Consumes: `BackendBucketName`, `LockTableName`, `PrivateEKSNetworkStateKey`, GitHub OIDC provider, repository identity, and the runner Terraform resource names.
- Produces: `GitHubActionsPrivateEKSRunnerRole`, `PrivateEKSRunnerRoleArn`, and `PrivateEKSRunnerStateKey`.

- [x] **Step 1: Add the runner-state parameter and toolkit metadata**

Add:

```yaml
Metadata:
  AWSToolsMetrics:
    AWSAgentToolkit: aws-cloudformation@2

Parameters:
  PrivateEKSRunnerStateKey:
    Type: String
    Default: cloudai-platform/eks-private-runner/terraform.tfstate
    Description: Exact private Terraform state key permitted to the dedicated runner-state role.
```

- [x] **Step 2: Add the OIDC trust and state boundary**

Create `GitHubActionsPrivateEKSRunnerRole` with the existing GitHub OIDC provider and this exact subject pattern:

```yaml
token.actions.githubusercontent.com:sub: !Sub "repo:${GitHubOrg}/${GitHubRepo}:environment:aws-private-eks"
```

Add separate statements for:

```text
runner state: GetObject, PutObject, DeleteObject
network state: GetObject only
bucket list: only the two state keys and their .tflock objects
lock table: GetItem, PutItem, DeleteItem, DescribeTable
```

- [x] **Step 3: Add the six-resource Terraform lifecycle boundary**

Use the reviewed plan baseline to scope:

```text
CodeBuild project and webhook actions -> arn:${Partition}:codebuild:${Region}:${Account}:project/cloudai-platform-private-eks-runner
IAM role lifecycle -> role/cloudai-platform-eks-private-runner-private-runner
IAM policy lifecycle -> policy/cloudai-platform-eks-private-runner-private-runner
iam:PassRole -> exact runtime role with iam:PassedToService=codebuild.amazonaws.com
CloudWatch Logs lifecycle -> log-group:/aws/codebuild/cloudai-platform-private-eks-runner*
```

Do not copy IAM Policy Autopilot's unrelated instance-profile, MFA, OIDC-provider, SAML-provider, server-certificate, or user tagging suggestions.

- [x] **Step 4: Extend the bootstrap self-management boundary**

Allow `GitHubActionsBootstrapRole` to manage only:

```yaml
!Sub "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${GitHubRepo}-aws-private-eks-runner-terraform"
```

- [x] **Step 5: Add outputs**

Add:

```yaml
PrivateEKSRunnerRoleArn:
  Description: Store privately as AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME in the aws-private-eks GitHub environment.
  Value: !GetAtt GitHubActionsPrivateEKSRunnerRole.Arn
PrivateEKSRunnerStateKey:
  Description: Fixed state key used only by the dedicated runner Terraform workflow.
  Value: !Ref PrivateEKSRunnerStateKey
```

- [x] **Step 6: Run the boundary test and CloudFormation lint**

Run:

```bash
cfn-lint providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml
```

Expected: PASS, along with the Task 1 boundary script.

- [x] **Step 7: Commit the role implementation**

```bash
git add providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml
git commit -m "feat: add private runner OIDC role"
```

### Task 3: Wire the protected handoff and documentation

**Files:**
- Modify: `.github/workflows/update-aws-bootstrap.yml`
- Modify: `providers/aws/infra/bootstrap/README.md`
- Modify: `docs/solutions/vpc-connected-runner-runbook.md`
- Modify: `docs/solutions/private-eks-github-environment-readiness.md`
- Modify: `docs/practices/current-status.md`
- Modify: `providers/aws/app/api/tests/privateEksReferenceArchitectureDocumentation.test.ts`

**Interfaces:**
- Consumes: `PrivateEKSRunnerRoleArn` and `PrivateEKSRunnerStateKey` CloudFormation outputs.
- Produces: protected-CI handoff instructions and accurate source-versus-runtime status.

- [x] **Step 1: Add a failing documentation contract**

Assert that the runbook and readiness guide name all three identities and state that the runner role is provisioned by bootstrap but runtime validation remains pending.

- [x] **Step 2: Run the targeted Node test and verify failure**

Run:

```bash
cd providers/aws/app/api
pnpm test -- privateEksReferenceArchitectureDocumentation.test.ts
```

Expected: FAIL on the new runner-role handoff wording.

- [x] **Step 3: Pass the runner state key to change-set planning**

Add this parameter to `.github/workflows/update-aws-bootstrap.yml`:

```text
ParameterKey=PrivateEKSRunnerStateKey,ParameterValue=${TF_STATE_KEY_PREFIX}/eks-private-runner/terraform.tfstate,UsePreviousValue=false
```

- [x] **Step 4: Publish a sanitized runner-role handoff**

After a successful bootstrap apply, query `PrivateEKSRunnerRoleArn`, mask it, and write instructions to the step summary for setting `AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME` in `aws-private-eks`. Do not upload the ARN as a public artifact.

- [x] **Step 5: Update operator documentation**

Record:

```text
source role contract implemented
CloudFormation apply pending
GitHub Environment variable pending
runner Terraform plan/apply/runtime validation pending
no AWS runner resources created by this source task
```

- [x] **Step 6: Run targeted and full tests**

Run:

```bash
cd providers/aws/app/api
pnpm test
```

Expected: all tests pass.

- [x] **Step 7: Commit the workflow and documentation**

```bash
git add .github/workflows/update-aws-bootstrap.yml providers/aws/infra/bootstrap/README.md docs/solutions/vpc-connected-runner-runbook.md docs/solutions/private-eks-github-environment-readiness.md docs/practices/current-status.md providers/aws/app/api/tests/privateEksReferenceArchitectureDocumentation.test.ts
git commit -m "docs: document private runner role handoff"
```

### Task 4: Verify and prepare review

**Files:**
- Modify: `docs/superpowers/plans/2026-08-28-private-eks-runner-oidc-bootstrap.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a reviewable, source-only PR with no runtime claims.

- [x] **Step 1: Re-run deterministic IAM review**

Confirm the Terraform plan contains six create actions and compare the final CloudFormation actions to IAM Policy Autopilot and the official AWS Service Authorization Reference. Keep raw plan JSON outside the repository and owner-readable only.

- [x] **Step 2: Run complete source verification**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
cd providers/aws/app/api && pnpm test
```

Run the local equivalent of every changed `terraform-tests.yaml` boundary job.

- [x] **Step 3: Scan for secrets and account-specific values**

Run:

```bash
git diff --check
git diff origin/main...HEAD -- . ':!docs/superpowers/plans/*'
```

Verify no session credentials, real subnet IDs, raw Terraform state, plan JSON, or account-specific role ARN was added.

- [x] **Step 4: Clean the private temporary plan directory**

Remove `/private/tmp/cloudai-runner-policy.dtipw4` after the action comparison is complete. This directory is disposable and contains owner-only plan artifacts.

- [x] **Step 5: Update this checklist and commit**

Mark completed steps, then commit:

```bash
git add docs/superpowers/plans/2026-08-28-private-eks-runner-oidc-bootstrap.md
git commit -m "docs: record runner OIDC bootstrap verification"
```

- [ ] **Step 6: Push and open a PR**

Push `feature/yy-52-runner-oidc-bootstrap` and open a PR that states explicitly: source implemented, AWS apply pending, runner runtime validation pending.
