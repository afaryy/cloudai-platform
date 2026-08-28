# Private EKS Sandbox

This is a separate Terraform environment for the private-subnet EKS reference
architecture described in `docs/architecture/private-eks-reference-architecture.md`.

It is intentionally separate from `envs/eks-sandbox`:

- it uses a different cluster name and backend state key;
- it consumes VPC, VPC CIDR, private subnet, worker security-group, and
  delivery-runner security-group outputs from the separately managed
  `eks-private-network` state instead of recreating them;
- worker nodes run only in private subnets with `map_public_ip_on_launch = false`;
- the EKS Kubernetes API is private-only;
- AWS service access is endpoint-first;
- NAT and service endpoints remain owned by the private-network state;
- GPU and Kueue are not included in this first worker baseline.

The shared EKS module currently grants the GitHub provisioning principal a
cluster-admin access entry as a bootstrap exception. The private delivery
workflow must replace that with separate infrastructure, bootstrap, and
namespace-scoped workload identities before any production-oriented claim.

Do not apply this environment until the protected CI gates in the architecture
and design documents are satisfied. No live IDs, endpoints, kubeconfig, state,
plans, or credentials belong in this directory.
