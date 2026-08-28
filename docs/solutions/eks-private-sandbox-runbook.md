# Private EKS Sandbox Delivery Runbook

This runbook describes the protected CI path for the separate
`eks-private-sandbox` Terraform environment. It does not change the existing
public-subnet EKS sandbox. The earlier public-subnet sandbox was a low-cost
development profile and has been destroyed; it is not the private target and
is not used as evidence of private-worker or private-GPU validation.

## Operating boundary

- Source validation runs on a GitHub-hosted runner with no AWS credentials.
- Remote `plan`, `preflight`, `apply`, and `stop` run only on the run-scoped
  CodeBuild-hosted ephemeral runner label
  `codebuild-${PRIVATE_EKS_RUNNER_PROJECT_NAME}-${github.run_id}-${github.run_attempt}`.
- The runner must have VPC reachability to the private EKS Kubernetes API and
  approved VPC endpoints. GitHub-hosted runners are not assumed to reach the
  private API.
- The protected GitHub Environment is `aws-private-eks`; its reviewer rule is
  separate from `aws-sandbox`.
- The state key suffix is `eks-private-sandbox/terraform.tfstate`.
- No destroy mode exists in this workflow. `stop` scales worker capacity to
  zero but intentionally leaves the control plane, endpoints, and state in
  place for later review.

## Runner roles and delivery phases

This runbook uses two distinct delivery phases. They are complementary rather
than competing alternatives.

| Phase | Runner | Responsibility | Required state |
| --- | --- | --- | --- |
| Bootstrap/recovery | VPC-connected ephemeral GitHub Actions-compatible runner | Terraform backend, private network and EKS lifecycle, endpoint preflight, stop and recovery | May run before the target cluster exists or when it is unhealthy |
| Steady state | ARC controller with ephemeral runner scale sets inside private EKS | Helm, Argo CD, Kueue, GPU smoke workloads and cluster-local delivery | Requires a healthy private EKS cluster and validated worker baseline |

ARC cannot be the only runner for this workflow because its controller and
runner pods depend on the EKS cluster they would be asked to create. The
VPC-connected path also remains necessary for recovery if EKS or ARC becomes
unavailable. Once the private worker baseline is validated, ARC can be added
as the preferred workload-delivery path with a separate namespace, workload
identity, Kubernetes RBAC, restricted egress, and narrower permissions than
the bootstrap role.

The VPC-connected requirement is a network boundary, not a requirement for a
long-lived EC2 host. A CodeBuild-hosted ephemeral runner is the preferred
implementation for this project; an equivalent private build runner is
acceptable if it provides the same outbound GitHub, private AWS endpoint, and
private Kubernetes API reachability.

```text
GitHub Actions validation
  -> VPC-connected runner
  -> private EKS bootstrap / preflight / recovery
  -> validated private EKS
  -> ARC ephemeral scale sets
  -> Helm / Argo CD / Kueue / GPU delivery
```

Do not report ARC as deployed or runtime-validated until the private-EKS
runner and worker prerequisites have passed the protected workflow. The
current repository documents the source contract; runtime validation remains
pending.

## Required protected variables

Configure these only in the protected `aws-private-eks` environment; do not
commit their values:

| Variable | Purpose |
| --- | --- |
| `AWS_ROLE_TO_ASSUME` | Dedicated OIDC role for private-EKS delivery |
| `AWS_REGION` | Expected `ap-southeast-2` region |
| `TF_BACKEND_BUCKET` | Terraform state bucket |
| `TF_BACKEND_LOCK_TABLE` | Terraform state lock table |
| `TF_STATE_KEY_PREFIX` | State namespace prefix |
| `PRIVATE_EKS_GITHUB_ACTIONS_PRINCIPAL_ARN` | Approved OIDC principal ARN passed to Terraform |
| `PRIVATE_EKS_BUDGET_APPROVED` | Must be exactly `true` |
| `PRIVATE_EKS_MONTHLY_BUDGET_USD` | Positive monthly budget value |
| `PRIVATE_EKS_RUNNER_READY` | Must be exactly `true` after runner verification |
| `PRIVATE_EKS_RUNNER_PROJECT_NAME` | Exact CodeBuild project name used by the run-scoped label |
| `PRIVATE_EKS_RUNNER_FOUNDATION_READY` | Must be exactly `true` after CodeBuild runner verification |
| `PRIVATE_EKS_ENDPOINT_POLICY_READY` | Must be exactly `true` after endpoint review |
| `PRIVATE_EKS_BACKEND_READY` | Must be exactly `true` after state backend review |
| `PRIVATE_EKS_BOOTSTRAP_ROLE_READY` | Must be exactly `true` for the temporary bootstrap exception |

## Modes

1. `validate`: runs Terraform init without backend, formatting, validation, and
   native tests. No AWS credentials are configured.
2. `plan`: initializes the isolated backend and creates a plan only. The raw
   plan is kept on the runner and never uploaded.
3. `preflight`: verifies existing private-EKS state, private-only API access,
   no public IPs on worker subnets, and the exact approved endpoint set
   (ECR API/DKR, S3 gateway, STS, EKS, EC2, and CloudWatch Logs).
4. `apply`: requires `I_UNDERSTAND_PRIVATE_EKS_APPLY`, a same-run plan
   preflight with no delete actions, and the protected environment reviewer. It
   creates only the private worker baseline; it does not add GPU capacity.
5. `stop`: requires `I_UNDERSTAND_PRIVATE_EKS_STOP`, an existing state/cluster
   guard, and then scales workers to zero. It is not a destroy operation and
   fails closed when no prior private environment exists.

## Evidence contract

Uploaded artifacts contain only status categories and booleans. They must not
contain account IDs, ARNs, cluster endpoints, subnet IDs, kubeconfig, state,
Terraform plans, or raw command output.

The temporary shared-module cluster-admin access entry is a bootstrap
exception. Runtime validation remains incomplete until provisioning,
cluster-bootstrap, and namespace-scoped workload identities are separated.

## Current source implementation

The source-only foundation is split into three independently managed states:

1. `eks-private-network` creates the VPC, private subnets, endpoint policy,
   route, and security-group boundary. It never calls the Kubernetes API.
2. `eks-private-runner` creates the CodeBuild project, webhook, CloudWatch log
   group, and least-privilege CodeBuild service role. Its current source accepts
   reviewed network-output inputs and does not store GitHub tokens in Terraform.
   Direct remote-state consumption and the protected runner lifecycle workflow
   remain the next implementation gate.
3. `eks-private-sandbox` consumes the network state's VPC, VPC CIDR, private
   subnets, worker security group, and delivery-runner security group. It
   creates only the EKS/CPU-worker boundary and is routed to the run-scoped
   CodeBuild label after the runner readiness gate.

The ARC handoff is a separate post-bootstrap workflow. It is not a replacement
for the network or recovery path and remains runtime-pending until the private
worker baseline has been validated.

Do not add GPU, Kueue, HyperPod, Slurm, or real data-centre capacity until the
ordinary private-worker validation is independently approved.

## Remote-state migration gate

The private-network state must be refreshed through its protected plan/apply
path after the `vpc_cidr` output is introduced. A source-only code change does
not populate that output in an already existing remote state. Before the first
private-EKS remote plan:

1. run and review the private-network protected plan;
2. confirm it contains no unexpected resource or delete action;
3. apply the reviewed network-state update through its exact confirmation;
4. verify the sanitised network evidence; and
5. only then let `eks-private-sandbox` read the remote outputs.

For a first private-EKS deployment, run `plan` and then `apply`; the `apply`
mode creates and checks a fresh same-run plan preflight before mutation. The
standalone `preflight` mode requires an existing state and cluster and is for
post-deployment revalidation, not a prerequisite that can run before the first
apply.
