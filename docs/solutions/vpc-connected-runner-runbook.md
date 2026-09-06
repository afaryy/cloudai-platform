# VPC-connected CodeBuild runner lifecycle

## Purpose

This runbook covers the bootstrap runner used to create, recover, and inspect a
private EKS platform without depending on that EKS cluster. The runner is an
ephemeral GitHub Actions runner hosted by CodeBuild and attached to private
subnets. It is deliberately outside the Kubernetes failure domain.

The lifecycle workflow is
`.github/workflows/terraform-eks-private-runner.yml`. The dedicated OIDC role
has been applied and handed off to `aws-private-eks`, and credential-free source
validation has passed. Protected read-only GitHub source-auth discovery and all
infrastructure/runtime validation remain pending.

## Architecture boundary

```text
GitHub Actions workflow_dispatch
  -> GitHub-hosted lifecycle job
  -> dedicated runner-state OIDC role
  -> eks-private-runner Terraform state
  -> private-network remote state (read only)
  -> CodeBuild project + webhook + service role + CloudWatch logs

Later private delivery job
  -> codebuild-<project>-<run_id>-<run_attempt>
  -> ephemeral CodeBuild runner in private subnets
  -> private EKS API
```

Three identities remain separate:

1. The private-network Terraform role owns network state and network resources.
2. The runner-state Terraform role owns only runner state and its CodeBuild,
   IAM, webhook, and log-group lifecycle.
3. The CodeBuild service role is assumed only by CodeBuild during ephemeral
   runner execution and has no Terraform backend ownership.

The bootstrap stack now provides identity 2 with a reviewed state and service
lifecycle boundary, and `AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME` has been stored
in `aws-private-eks` from its CloudFormation output. Runner source-auth and
runtime validation remain pending. Reusing `AWS_ROLE_TO_ASSUME` would collapse
the state and identity boundaries and is not an approved workaround.

## Endpoint-principal handoff

Private endpoint policies are tightened in three stages:

| Phase | Allowed principals | Purpose |
| --- | --- | --- |
| `bootstrap` | Private-network Terraform role | Create and inspect the shared network without guessing future role ARNs |
| `runner` | Network role plus deployed CodeBuild service role | Allow the recovery runner to reach approved AWS endpoints before EKS bootstrap |
| `expanded` | Network role, CodeBuild service role, and EKS node role | Allow one private CPU worker to authenticate, pull its image, and publish logs |

The CodeBuild service-role ARN is a runner-state output and the node-role ARN
is a private-EKS-state output. Neither may be guessed, wildcarded, or copied to
public evidence. The EKS node role is created first with desired worker
capacity zero; only then can the endpoint policy move to `expanded` before one
worker is activated.

## State ownership

| State | Owns | Must not own |
| --- | --- | --- |
| `eks-private-network/terraform.tfstate` | VPC, private subnets, routes, endpoints, shared security groups | CodeBuild, IAM runner role, EKS |
| `eks-private-runner/terraform.tfstate` | CodeBuild project/webhook, CodeBuild service role/policy, runner log group | VPC, subnet, route, endpoint, EKS, ARC, GPU |
| `eks-private-sandbox/terraform.tfstate` | Private EKS control plane and bounded CPU worker baseline | Shared network, CodeBuild bootstrap runner, ARC, GPU |

The runner composition receives only the S3 backend location:

```text
TF_VAR_network_state_bucket
TF_VAR_network_state_key
TF_VAR_network_state_region
```

Terraform reads `vpc_id`, `private_subnet_ids`, and
`delivery_runner_security_group_id` from remote state. These values remain
sensitive at the network output boundary and are not copied into GitHub
variables, summaries, logs, or evidence artifacts.

## Protected environment inputs

Use the `aws-private-eks` GitHub Environment and configure only reviewed values.

| Name | Purpose |
| --- | --- |
| `AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME` | Dedicated runner-state Terraform OIDC role ARN |
| `AWS_REGION` | AWS region containing backend, network, and runner |
| `TF_BACKEND_BUCKET` | Existing private Terraform backend bucket |
| `TF_BACKEND_LOCK_TABLE` | Existing lock table |
| `TF_STATE_KEY_PREFIX` | Stable state prefix; workflow appends isolated suffixes |
| `PRIVATE_EKS_RUNNER_PROJECT_NAME` | Exact CodeBuild project name used in the runner label |
| `PRIVATE_EKS_RUNNER_GITHUB_REPOSITORY_URL` | Exact connected repository URL |
| `PRIVATE_EKS_RUNNER_SOURCE_AUTH_TYPE` | `NONE` for reviewed account-level auth, or approved connection type |
| `PRIVATE_EKS_RUNNER_SOURCE_AUTH_RESOURCE` | Optional connection/secret ARN, never a token |
| `PRIVATE_EKS_PRIVATE_ECR_REPOSITORY_ARNS_JSON` | Non-empty JSON array of explicit allowed ECR repository ARNs |
| `PRIVATE_EKS_ARTIFACT_BUCKET_ARNS_JSON` | Non-empty JSON array of explicit allowed S3 bucket ARNs |
| `PRIVATE_EKS_RUNNER_BUDGET_APPROVED` | Exactly `true` after cost review |
| `PRIVATE_EKS_RUNNER_MONTHLY_BUDGET_USD` | Positive bounded monthly amount |
| `PRIVATE_EKS_RUNNER_APPLY_READY` | Exactly `true` after plan and identity review |

Do not set `PRIVATE_EKS_RUNNER_FOUNDATION_READY` or
`PRIVATE_EKS_RUNNER_READY` merely because source tests pass. Those flags belong
to downstream private-EKS delivery and require protected runtime evidence.

## Workflow modes

### `source-validate`

Runs on `ubuntu-latest` with `contents: read` only. It performs backend-free
Terraform init, formatting, validation, and tests. It does not obtain AWS
credentials.

### `auth-discover`

Uses only the dedicated runner-state OIDC role to call
`codebuild:ListSourceCredentials`. It does not initialise Terraform, read
network state, create a connection, import a token, or mutate AWS resources. It
fails closed unless exactly one approved account-level GitHub source credential
is present. The retained evidence contains only booleans for presence,
uniqueness, acceptable auth category, and identifier suppression; credential
ARNs and connection resources are never uploaded.

### `plan`

Uses the dedicated runner-state OIDC role, isolated runner backend, and
private-network remote state. Review the plan for only the expected CodeBuild,
IAM, webhook, and CloudWatch resources. Stop if it includes network, EKS, ARC,
GPU, Kueue, HyperPod, Slurm, deletion, or replacement outside the runner state.

### `apply`

Requires the exact confirmation:

```text
I_UNDERSTAND_PRIVATE_EKS_RUNNER_APPLY
```

The workflow creates a fresh same-run plan, rejects delete actions and network
or EKS ownership, then applies that exact saved plan. There is no destroy mode.

### `runtime-validate`

Reads the deployed project through `aws codebuild batch-get-projects`. It checks
that exactly one project exists, the VPC is attached, at least two private
subnets and a security group are configured, and CloudWatch logging is enabled.
The public evidence contains only:

```json
{"runner_project_present":true,"vpc_attached":true,"private_subnets_configured":true,"logs_configured":true}
```

This metadata check does not prove that a GitHub workflow job started and
terminated successfully. A later protected smoke must demonstrate the exact
run-scoped label contract:

```text
codebuild-<project>-<github.run_id>-<github.run_attempt>
```

Only after both metadata validation and an ephemeral execution smoke may
`PRIVATE_EKS_RUNNER_FOUNDATION_READY` and `PRIVATE_EKS_RUNNER_READY` be reviewed
for downstream use.

## Outbound GitHub connectivity

A VPC-attached CodeBuild runner still needs outbound access to GitHub for job
registration, source and action downloads, OIDC exchange, and result upload.
AWS service endpoints cover the private AWS path but do not provide GitHub
connectivity. Without an approved NAT, proxy, or equivalent egress path, the
job can wait or fail before repository steps run.

For this bounded POC, a NAT gateway is the currently proposed path. It remains
a separately reviewed cost and egress choice: the network plan must show it
explicitly, the exercise duration and stop owner must be recorded, and no
runtime readiness flag is set merely because NAT was enabled. A reusable
technical target may instead use a central egress proxy or firewall with
domain policy and telemetry.

## Failure rules

- Missing dedicated runner-state role: stop; do not reuse the network role.
- Missing source connection: stop; do not place a GitHub token in Terraform.
- Remote-state read failure: stop; do not copy VPC or subnet IDs into variables.
- Plan contains deletion, VPC, subnet, route, endpoint, or EKS ownership: stop.
- Runtime metadata contains no VPC, fewer than two subnets, no security group, or
  disabled logs: fail closed and keep downstream readiness flags false.
- Waiting GitHub job: verify the CodeBuild project name, webhook event filter,
  repository connection, and exact run-scoped label before changing networking.
- Teardown remains a separate layered plan with a separate exact confirmation;
  this workflow contains no deletion path.

## Safe next gate

Apply the reviewed read-only `codebuild:ListSourceCredentials` permission to the
dedicated runner-state role, then run `auth-discover`. If it proves one approved
account-level GitHub source credential, configure the version-controlled runner
defaults and reviewed cost/readiness values before runner plan. If discovery
fails, stop and review a CodeConnections-based setup separately; do not import a
PAT, guess an ARN, or proceed to paid network deployment. No runtime claim is
valid before that prerequisite is complete.
