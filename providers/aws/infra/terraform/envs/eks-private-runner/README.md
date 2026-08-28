# Private EKS VPC-connected runner state

This state creates the CodeBuild-hosted ephemeral GitHub Actions runner that is
attached to the private subnets produced by the separate
`eks-private-network` state. It is the bootstrap bridge between a GitHub-hosted
network workflow and the private EKS lifecycle workflow.

## Scope

- CodeBuild project configured as a GitHub Actions runner project.
- `WORKFLOW_JOB_QUEUED` webhook filter.
- VPC configuration using reviewed private subnet and security-group IDs.
- Dedicated CodeBuild service role with CloudWatch, VPC build, and optional
  private artifact permissions.
- Seven-day CloudWatch log retention by default.
- No public ingress, no Kubernetes API call, and no EKS or GPU resources.

## GitHub runner contract

The lifecycle workflow must use the exact run-scoped CodeBuild label:

```yaml
runs-on:
  - codebuild-${{ vars.PRIVATE_EKS_RUNNER_PROJECT_NAME }}-${{ github.run_id }}-${{ github.run_attempt }}
```

The CodeBuild project name must match the label. A mismatch leaves the GitHub
job waiting for a runner.

The source credential is deliberately not created by this state. Connect the
repository to CodeBuild through an approved account-level GitHub App,
CodeConnections connection, OAuth integration, or Secrets Manager-backed source
credential before applying this state. No token or credential is committed or
passed as a Terraform variable.

## State boundary and order

Use the dedicated remote-state key
`cloudai-platform/eks-private-runner/terraform.tfstate`, after the network
foundation is ready and before private EKS lifecycle operations. The protected
workflow supplies only the private-network backend location; Terraform reads the
VPC, private subnet, and delivery-runner security-group outputs directly from
that state. Operators must not copy those identifiers into GitHub variables.
Runtime readiness still requires protected validation; `runner_ready` is not
proof that the CodeBuild webhook has executed a job.

The Terraform execution identity is the dedicated runner-state OIDC role named
by `AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME`. It is not the private-network role
and is not the CodeBuild runtime service role. Until that dedicated role has
been provisioned and reviewed, only `source-validate` is runnable.

## Evidence

Publish only metadata such as workflow name, readiness categories, test result,
and sanitized project status. Do not publish account IDs, role ARNs, subnet IDs,
private endpoints, runner tokens, logs, or Terraform state.
