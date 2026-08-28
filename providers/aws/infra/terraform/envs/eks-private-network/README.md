# Private EKS Network Foundation

This Terraform environment owns the network foundation consumed by the
private-subnet EKS and VPC-connected runner paths.

It creates:

- a dedicated VPC and public/private subnet pairs;
- private route tables with no public-IP assignment;
- ECR API/DKR, S3, STS, EKS, EC2, and CloudWatch Logs endpoints;
- separate delivery-runner and private-worker security groups;
- endpoint policies with explicit IAM principals;
- optional single-AZ NAT only when explicitly enabled and budget-approved.

This state does not create an EKS control plane, ARC, GPU nodes, Kueue, or
workloads. It does not call the Kubernetes API. Its outputs are consumed by
the VPC runner foundation and private EKS baseline through reviewed remote
state or protected workflow handoff.

The consumer contract exports the VPC ID, VPC CIDR, private subnet IDs,
private route-table IDs, delivery-runner and worker security groups, endpoint
identifiers, NAT category, and a sanitised readiness Boolean. Live identifiers
remain sensitive and must not be copied into public evidence.

## State boundary

Use the isolated key:

```text
eks-private-network/terraform.tfstate
```

Do not place account IDs, live subnet IDs, endpoint IDs, credentials, plans,
or state files in this directory.

## Required protected inputs

- explicit IAM principal ARNs for endpoint policies. The protected workflow
  uses a staged lifecycle: `bootstrap` accepts exactly one already-existing
  role ARN, while `expanded` requires at least three explicit ARNs after the
  delivery-runner and private-worker roles exist;
- explicit private ECR repository ARNs or scoped ARN patterns;
- explicit private S3 artifact bucket ARNs;
- a separately approved budget before any apply;
- `enable_nat_gateway = false` unless the NAT exception is approved.

## Delivery boundary

The network foundation is applied through the protected GitHub Actions
workflow. A GitHub-hosted runner may execute the AWS API calls needed to create
this network foundation, but the workflow must not run `kubectl`, `helm`, or
private Kubernetes API operations. After this state is ready, a CodeBuild-hosted
ephemeral runner is validated against the VPC before private EKS lifecycle
operations begin.

## Endpoint-principal lifecycle

The endpoint policy is deliberately configured in two explicit phases:

1. **Bootstrap:** pass one verified, already-existing IAM role ARN so the
   network foundation can be created without inventing future role names.
   Bootstrap does not prove that the private runner or EKS worker can use the
   endpoints.
2. **Expanded:** after the dedicated delivery-runner and private-worker roles
   have been created and reviewed, pass all actual role ARNs (at least three)
   and run a new plan to update endpoint policies before private EKS runtime
   operations.

Terraform does not discover, synthesize, or predict future role ARNs. The
workflow phase input must match the protected
`PRIVATE_EKS_ENDPOINT_PRINCIPAL_PHASE` environment variable, preventing a
plan from silently using the wrong lifecycle phase.
