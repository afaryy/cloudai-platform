# Private EKS GitHub Environment Readiness

This document defines the GitHub-side readiness gate for the separate
`aws-private-eks` delivery path. It is intentionally a configuration runbook:
it does not create AWS resources, run Terraform, register a runner, or install
ARC.

## Current discovery

As of 5 September 2026, the `aws-private-eks` Environment exists. Read-only API
inspection confirms a required reviewer, disabled administrator bypass, and a
`main` deployment branch policy. The shared backend/OIDC names are present,
and the network bootstrap variables are configured. Workflow history contains
source validation and a network plan, but no successful network apply, runner
apply, or private-EKS apply. The dedicated runner-state OIDC role has been
applied and handed off; CodeBuild source-auth discovery and the remaining
runner/EKS variables are pending. The VPC, CodeBuild runner, private EKS, and
ARC paths therefore remain runtime-pending.

Runner runtime validation remains pending. Private EKS and ARC runtime
validation also remain pending.

Variable presence is configuration evidence only. It does not prove that a
value is correct, that the network state has the latest output contract, or
that any AWS resource or private Kubernetes path has passed runtime validation.

The existing public `aws-sandbox` values are not automatically suitable for the
private path. The private path must keep its own environment-level approvals,
state keys, runner project, endpoint-policy gates, and budget decision.

## Required protection model

Maintain the Environment named exactly `aws-private-eks` in the repository's
Settings → Environments page.

Configure the following before adding runtime values:

1. Retain at least one required reviewer who can approve private-EKS changes.
2. Retain the reviewed `main` deployment branch policy; add a reviewed PR path
   only when the change-control model explicitly requires it.
3. Keep environment secrets unavailable to pull requests from forks.
4. Do not add a bypass rule for the private-EKS environment.
5. Keep production credentials, personal access tokens, kubeconfigs, private
   keys, and raw Terraform state out of variables and repository files.

The environment is a control boundary, not just a namespace for values. A
workflow that references `environment: aws-private-eks` must stop when the
environment, reviewer rule, or required readiness flags are absent.

## Variables and secrets

Add only reviewed values. Never invent subnet IDs, cluster names, ARNs, chart
versions, or model/image digests. Confirm each value through a read-only CI
discovery step or an approved Terraform output before configuring it.

### Private network foundation variables

These are consumed by `.github/workflows/terraform-eks-private-network.yml`:

| Name | Classification | Purpose |
| --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | variable or secret | Dedicated GitHub OIDC role for the private network state |
| `AWS_REGION` | variable | Expected AWS region |
| `TF_BACKEND_BUCKET` | variable | Existing Terraform state bucket |
| `TF_BACKEND_LOCK_TABLE` | variable | Existing Terraform lock table |
| `TF_STATE_KEY_PREFIX` | variable | State namespace prefix |
| `PRIVATE_EKS_ENDPOINT_PRINCIPAL_ARNS_JSON` | variable | Explicit IAM role ARNs allowed to use private endpoints: one for `bootstrap`, exactly two for `runner`, and at least three for `expanded`; no wildcard principals |
| `PRIVATE_EKS_ENDPOINT_PRINCIPAL_PHASE` | variable | Must match the workflow input: `bootstrap`, `runner`, or `expanded` |
| `PRIVATE_EKS_PRIVATE_ECR_REPOSITORY_ARNS_JSON` | variable | Non-empty JSON list of approved private ECR repository ARNs |
| `PRIVATE_EKS_ARTIFACT_BUCKET_ARNS_JSON` | variable | Non-empty JSON list of approved S3 bucket ARNs |
| `PRIVATE_EKS_ENABLE_NAT_GATEWAY` | variable | `false` by default; `true` only after a separate cost and egress decision |
| `PRIVATE_EKS_NETWORK_BUDGET_APPROVED` | variable | Must be exactly `true` before plan/apply |
| `PRIVATE_EKS_NETWORK_MONTHLY_BUDGET_USD` | variable | Positive monthly budget value |
| `PRIVATE_EKS_NETWORK_APPLY_READY` | variable | Must be exactly `true` after review |

### Private runner and EKS variables

These are consumed by `.github/workflows/terraform-eks-private-runner.yml` and
`.github/workflows/terraform-eks-private-sandbox.yml`:

| Name | Classification | Purpose |
| --- | --- | --- |
| `AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME` | variable or secret | Dedicated OIDC role for runner-state Terraform; must not reuse the private-network role |
| `PRIVATE_EKS_RUNNER_GITHUB_REPOSITORY_URL` | variable | Exact repository URL connected to the CodeBuild GitHub source |
| `PRIVATE_EKS_RUNNER_SOURCE_AUTH_TYPE` | variable | `NONE` for a reviewed account-level connection, or an explicitly approved CodeBuild source-auth type |
| `PRIVATE_EKS_RUNNER_SOURCE_AUTH_RESOURCE` | variable | Optional approved connection or secret ARN; never a raw token |
| `PRIVATE_EKS_RUNNER_APPLY_READY` | variable | Must be exactly `true` after the runner plan and identity boundary are reviewed |
| `PRIVATE_EKS_RUNNER_BUDGET_APPROVED` | variable | Must be exactly `true` before protected runner operations |
| `PRIVATE_EKS_RUNNER_MONTHLY_BUDGET_USD` | variable | Positive monthly budget allocated to the CodeBuild runner foundation |
| `PRIVATE_EKS_RUNNER_PROJECT_NAME` | variable | Exact CodeBuild project name used in the run-scoped runner label |
| `PRIVATE_EKS_RUNNER_FOUNDATION_READY` | variable | Must be exactly `true` after runner foundation validation |
| `PRIVATE_EKS_RUNNER_READY` | variable | Must be exactly `true` after runner reachability validation |
| `PRIVATE_EKS_ENDPOINT_POLICY_READY` | variable | Must be exactly `true` after endpoint-policy review |
| `PRIVATE_EKS_BACKEND_READY` | variable | Must be exactly `true` after backend/lock review |
| `PRIVATE_EKS_BOOTSTRAP_ROLE_READY` | variable | Must be exactly `true` for the separately reviewed bootstrap exception |
| `PRIVATE_EKS_GITHUB_ACTIONS_PRINCIPAL_ARN` | variable | Approved OIDC principal ARN passed to the private EKS Terraform state |
| `PRIVATE_EKS_BUDGET_APPROVED` | variable | Must be exactly `true` before remote delivery |
| `PRIVATE_EKS_MONTHLY_BUDGET_USD` | variable | Positive monthly budget value |
| `PRIVATE_EKS_CPU_SMOKE_IMAGE` | variable | Immutable private ECR image URI pinned by digest and verified as `linux/amd64` |

### ARC handoff variables and secrets

These are consumed only by `.github/workflows/arc-private-eks-handoff.yml`:

| Name | Classification | Purpose |
| --- | --- | --- |
| `PRIVATE_EKS_CLUSTER_NAME` | variable | Existing private EKS cluster name |
| `PRIVATE_EKS_ARC_RUNNER_SCALE_SET_NAME` | variable | Reviewed bounded scale-set name |
| `PRIVATE_EKS_ARC_CHART_VERSION` | variable | Immutable, reviewed official ARC chart version |
| `PRIVATE_EKS_ARC_GITHUB_CONFIG_URL` | variable | Repository or organisation URL for runner registration |
| `PRIVATE_EKS_ARC_APPLY_READY` | variable | Must be exactly `true` after ARC-specific review |
| `PRIVATE_EKS_ARC_GITHUB_APP_ID` | secret | GitHub App ID |
| `PRIVATE_EKS_ARC_GITHUB_APP_INSTALLATION_ID` | secret | GitHub App installation ID |
| `PRIVATE_EKS_ARC_GITHUB_APP_PRIVATE_KEY` | secret | GitHub App private key |

The ARC private key must never be placed in a variable, workflow input, issue,
PR comment, Terraform value, or artifact. The CodeBuild lifecycle role and ARC
runner identity are separate trust domains.

## Safe setup sequence

Follow this order so a missing prerequisite fails before any AWS API call:

1. Create or confirm `aws-private-eks`, its required reviewer, and its branch
   policy.
2. Add only the shared backend and OIDC values that have already been reviewed.
3. Run the private-network workflow in `validate` mode. This mode uses no AWS
   credentials and confirms formatting, validation, tests, and input shape.
4. Perform read-only discovery for approved endpoint principals, ECR/S3 ARNs,
   CodeBuild project naming, and the selected egress mode. Do not guess values.
   At the first network phase, use only one verified existing role ARN;
   future runner and node-role ARNs are not valid bootstrap inputs.
5. Add the network variables and set the network readiness flags only after
   the values and monthly budget have been reviewed.
6. Run private-network `plan`; inspect the plan for unexpected resources,
   public subnets, wildcard endpoint principals, NAT, or delete actions.
7. Obtain the separate exact confirmation
   `I_UNDERSTAND_PRIVATE_EKS_NETWORK_APPLY` only when the network plan is
   approved. The protected workflow performs its own fresh no-delete plan.
8. Ensure the applied network state contains the current remote-output
   contract, including `vpc_cidr`, before any consumer state is planned.
9. The dedicated runner-state OIDC role has been applied and
   `AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME` has been handed off from the
   `PrivateEKSRunnerRoleArn` output. Do not reuse or expand the network-state
   role. Before configuring the remaining private-runner values, run the
   protected read-only `auth-discover` mode and require sanitised evidence of
   one approved account-level GitHub source credential. No GitHub token is
   stored in Terraform or published in workflow evidence.
10. Apply and metadata-validate the runner foundation. Discover its actual
    CodeBuild service-role ARN, update the endpoint list to exactly the network
    role plus runner role, select `runner`, and apply the reviewed endpoint
    policy before asking CodeBuild to reach private services.
11. Run EKS `bootstrap-plan`, then obtain
    `I_UNDERSTAND_PRIVATE_EKS_BOOTSTRAP_APPLY` for `bootstrap-apply`. This
    creates the control plane and node role while keeping worker capacity at
    zero.
12. Read the sensitive node-role output only in protected CI. Update the
    endpoint principal list to include the network, runner, and node roles,
    select `expanded`, and apply the reviewed endpoint-policy change.
13. Run `build-private-eks-cpu-smoke-image` with
    `I_UNDERSTAND_PRIVATE_EKS_CPU_IMAGE_PUSH`; configure the verified immutable
    amd64 URI as `PRIVATE_EKS_CPU_SMOKE_IMAGE`.
14. Review EKS `plan`, obtain `I_UNDERSTAND_PRIVATE_EKS_APPLY`, and activate one
    bounded CPU worker. Then obtain
    `I_UNDERSTAND_PRIVATE_EKS_CPU_RUNTIME_VALIDATE` for the CPU Job validation.
    Use standalone `preflight` only when an existing cluster can be revalidated.
15. Only after the private worker baseline is healthy should ARC variables and
    secrets be added. ARC `install` and `smoke` require the separate exact
    confirmation `I_UNDERSTAND_PRIVATE_EKS_ARC_APPLY`.

There is deliberately no automatic `destroy` path in these workflows. A
future teardown or uninstall must be designed, reviewed, cost-checked, and
confirmed separately.

The CodeBuild-hosted GitHub runner must reach GitHub to receive work, download
actions, exchange OIDC, and publish logs or artifacts. Interface endpoints do
not replace that outbound path. For this time-boxed POC, enabling the NAT
gateway is the current likely implementation, but it must appear explicitly in
the reviewed network plan and cost-duration decision. Do not silently change
`PRIVATE_EKS_ENABLE_NAT_GATEWAY` or treat the monthly budget as a hard cap.

## Read-only verification commands

The following commands inspect metadata only; values of secrets are never
printed:

```bash
gh api repos/OWNER/REPOSITORY/environments
gh variable list --env aws-private-eks
gh secret list --env aws-private-eks
gh workflow list
```

The expected result before runtime work is an existing `aws-private-eks`
environment, a reviewer rule, and the required names above. Do not treat the
presence of a variable name as proof that its value is correct or that the
underlying AWS resource exists.

## Failure and recovery rules

- Missing environment: stop; do not fall back to `aws-sandbox`.
- Missing reviewer or budget flag: stop; do not bypass the protected workflow.
- Missing CodeBuild project or account-level source connection: stop; do not
  substitute a public GitHub-hosted runner for private Kubernetes API work.
- Missing endpoint, route, or private API evidence: stop; do not add broad NAT
  or public access as an ad-hoc workaround.
- Missing ARC client tools in the reviewed runner image: stop; the workflow
  does not download tools from the public internet inside the private path.
- Any plan with delete actions or unexpected GPU/Kueue/ARC resources: stop and
  review the state boundary.

The goal is a repeatable, auditable handoff from source validation to runtime
validation. Environment configuration is complete only when the values,
reviewer controls, budget decision, and protected workflow evidence all agree.
