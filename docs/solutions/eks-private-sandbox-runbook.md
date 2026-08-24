# Private EKS Sandbox Delivery Runbook

This runbook describes the protected CI path for the separate
`eks-private-sandbox` Terraform environment. It does not change the existing
public-subnet EKS sandbox.

## Operating boundary

- Source validation runs on a GitHub-hosted runner with no AWS credentials.
- Remote `plan`, `preflight`, `apply`, and `stop` run only on the
  `self-hosted`, `private-eks`, `ap-southeast-2` runner labels.
- The runner must have VPC reachability to the private EKS Kubernetes API and
  approved VPC endpoints. GitHub-hosted runners are not assumed to reach the
  private API.
- The protected GitHub Environment is `aws-private-eks`; its reviewer rule is
  separate from `aws-sandbox`.
- The state key suffix is `eks-private-sandbox/terraform.tfstate`.
- No destroy mode exists in this workflow. `stop` scales worker capacity to
  zero but intentionally leaves the control plane, endpoints, and state in
  place for later review.

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
| `PRIVATE_EKS_DELIVERY_RUNNER_SECURITY_GROUP_ID` | VPC-connected runner security group |
| `PRIVATE_EKS_ARTIFACT_BUCKET_ARNS_JSON` | Explicit JSON list of private S3 artifact bucket ARNs |
| `PRIVATE_EKS_BUDGET_APPROVED` | Must be exactly `true` |
| `PRIVATE_EKS_MONTHLY_BUDGET_USD` | Positive monthly budget value |
| `PRIVATE_EKS_RUNNER_READY` | Must be exactly `true` after runner verification |
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

Do not add GPU, Kueue, HyperPod, Slurm, or real data-centre capacity until the
ordinary private-worker validation is independently approved.
