# P4 EKS Sandbox Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the synthetic-only P4 release-engineering path for an optional personal AWS EKS sandbox without deploying cloud resources or committing account-specific data.

**Architecture:** Keep the repository mock-first while documenting a clean progression from local Helm/Kubernetes examples to an optional Terraform-managed EKS sandbox. Use CloudFormation only as a bootstrap pattern for Terraform backend and GitHub Actions OIDC role/policy, reusing an existing account-level GitHub OIDC provider.

**Tech Stack:** Markdown, CloudFormation YAML example, Terraform backend example, GitHub Actions workflow example, Helm/Kubernetes/Argo CD documentation.

## Global Constraints

- No real AWS account IDs, bucket names, role ARNs, credentials, kubeconfig, Terraform state, or tfvars are committed.
- Mock mode remains the default.
- Real AWS apply is deferred until the user explicitly confirms account, budget, environment, and teardown plan.
- P4 uses EKS as the Kubernetes release-engineering target; ECS remains only an optional separate runtime architecture pattern.
- Bedrock Guardrails and AgentCore-aligned patterns are later optional extensions, not part of this PR's runtime deployment.

---

### Task 1: Roadmap And Status Refresh

**Files:**
- Modify: `README.md`
- Modify: `docs/current-status.md`
- Modify: `docs/ai-release-engineering-on-eks.md`
- Modify: `docs/aws-reference-architecture.md`

**Interfaces:**
- Consumes: current P4 placeholder wording.
- Produces: public roadmap language distinguishing P4a, P4b, P4c, and optional later Bedrock/AgentCore extension.

- [ ] **Step 1: Update public roadmap language**

Edit the P4 sections so they describe:

```text
P4a: portfolio-ready Helm/Kubernetes release-engineering examples.
P4b: optional personal AWS EKS sandbox POC with budget, teardown, and synthetic workload boundaries.
P4c: Argo CD / GitOps promotion pattern.
P4d/P5 later: optional Bedrock Guardrails / AgentCore-aligned extension.
```

- [ ] **Step 2: Verify no sensitive wording**

Run:

```bash
rg -n "ACCOUNT_ID|arn:aws:iam::[0-9]|AKIA|SECRET|kubeconfig|tfstate" README.md docs
```

Expected: only placeholder-safe references such as `ACCOUNT_ID` if they are explicitly marked as replacements.

### Task 2: Bootstrap And Terraform Examples

**Files:**
- Create: `providers/aws/infra/bootstrap/README.md`
- Create: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/README.md`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/backend.tf.example`
- Create: `providers/aws/infra/terraform/envs/eks-sandbox/versions.tf`

**Interfaces:**
- Consumes: existing empty Terraform placeholder structure.
- Produces: portfolio-ready bootstrap and backend examples for a future EKS sandbox.

- [ ] **Step 1: Add CloudFormation bootstrap template**

Create a template with parameters for `GitHubOrg`, `GitHubRepo`, `GitHubEnvironment`, `ExistingGitHubOidcProviderArn`, backend bucket name, and lock table name. It must create S3 backend bucket, DynamoDB lock table, GitHub Actions role, and scoped policy only.

- [ ] **Step 2: Add Terraform backend example**

Create a placeholder backend example using:

```hcl
bucket         = "REPLACE_WITH_BACKEND_BUCKET"
key            = "cloudai-platform/eks-sandbox/terraform.tfstate"
region         = "ap-southeast-2"
dynamodb_table = "REPLACE_WITH_LOCK_TABLE"
encrypt        = true
```

- [ ] **Step 3: Verify Terraform examples do not require live init**

Run:

```bash
rg -n "REPLACE_WITH|terraform.tfstate|token.actions.githubusercontent.com" providers/aws/infra
```

Expected: placeholders only, no real account identifiers.

### Task 3: GitHub Actions And Release Engineering Skeleton

**Files:**
- Create: `.github/workflows/terraform-eks-sandbox.yml`
- Create: `helm/ai-api-service/README.md`
- Create: `argocd/applications/README.md`

**Interfaces:**
- Consumes: bootstrap role and Terraform backend placeholders.
- Produces: manual-only workflow and release-engineering documentation for future P4.

- [ ] **Step 1: Add manual GitHub Actions workflow**

Create a workflow that uses `workflow_dispatch`, requires `AWS_ROLE_TO_ASSUME` as an environment-level variable or secret, and defaults to validate/plan-only commands. Apply remains documented as a future environment-approved step, not enabled by default.

- [ ] **Step 2: Add Helm and Argo CD notes**

Document expected future chart and Argo CD boundaries: probes, rollback, resource requests, policy gates, audit metadata, and synthetic workload only.

- [ ] **Step 3: Verify workflow is manual-only**

Run:

```bash
rg -n "on:|workflow_dispatch|apply|AWS_ROLE_TO_ASSUME" .github/workflows/terraform-eks-sandbox.yml
```

Expected: `workflow_dispatch` exists; automatic push/PR triggers do not.

### Task 4: Final Verification

**Files:**
- All changed files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: tested, reviewable P4 readiness PR.

- [ ] **Step 1: Run docs and contract checks**

Run:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m unittest discover -s examples/rag-pattern/python/tests
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH pnpm test
```

Expected:

```text
Ran 29 tests
OK
tests 67
pass 67
fail 0
```

- [ ] **Step 2: Review git diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: no whitespace errors; only synthetic-only docs and examples changed.
