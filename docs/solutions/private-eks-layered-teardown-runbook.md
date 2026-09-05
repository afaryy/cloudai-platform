# Private EKS Layered Teardown Planning Gate

## Purpose

This runbook defines the dependency-aware planning boundary that must exist
before any paid private-EKS runtime validation. It prevents lower platform
layers from being considered for removal while workloads or dependent platform
services may still rely on them.

The current implementation is **planning-only**. It can validate the exact
layer order and inspect whether selected Terraform state objects are present.
It cannot stop workloads, scale nodes, uninstall software, apply Terraform, or
delete cloud resources.

## Exact Layer Order

```text
workloads
  -> GPU platform
  -> GPU node and IAM capacity
  -> ARC runner scale sets
  -> private EKS CPU baseline and control plane
  -> VPC-connected CodeBuild recovery runner
  -> endpoints, bounded NAT exception, subnets, routes and VPC
```

The machine-readable contract is exactly:

```text
workloads,gpu-platform,gpu-node,arc,eks,runner,network
```

Missing, duplicate, unknown, empty, or reordered layers fail closed. The
validator publishes only a Boolean/category result and never emits cloud
identifiers.

## Ownership, Evidence and Recovery Map

| Layer | Technical owner and state boundary | Evidence required before a future stop | Recovery route |
| --- | --- | --- | --- |
| Workloads | Workload owner; Git and Kubernetes workload state | No running Jobs, active deployments, pending queue items, retained checkpoints, or unresolved workload owner actions | Restore the approved Git revision or manifest through the VPC-connected delivery path |
| GPU platform | Platform add-on owner; Argo CD/Helm state for Kueue, NVIDIA device plugin and GPU telemetry components | Queues drained, admission suspended, controller health captured, and no GPU workload dependency | Reconcile the reviewed add-on version through Argo CD after EKS and CPU nodes are healthy |
| GPU node and IAM | GPU capacity owner; `eks-gpu-kueue-poc` Terraform state | Desired/minimum capacity is zero, no allocated GPU Pods, bounded run evidence captured, and role dependencies reviewed | Reapply the approved Terraform plan after network, runner, EKS and GPU platform recovery |
| ARC | CI platform owner; ARC Helm/GitOps state and GitHub runner registration | No active runner Jobs, scale-set minimum is zero, registrations are reconciled, and no workflow is assigned | Use the external CodeBuild recovery runner to reconcile ARC after the private EKS API is reachable |
| EKS | Kubernetes platform owner; `eks-private-sandbox` Terraform state | Workloads, GPU platform, GPU nodes and ARC are confirmed clear; control-plane and node evidence is retained | Recreate or reconcile from Terraform through the external recovery runner while consuming the existing network state |
| Runner | Delivery platform owner; `eks-private-runner` Terraform state | No bootstrap/recovery build is running and EKS no longer depends on the runner for an active recovery | Recreate from the GitHub-hosted protected runner workflow using OIDC and existing network state |
| Network | Network owner; `eks-private-network` Terraform state | Every upstream layer is absent or explicitly retained elsewhere; endpoint, route, NAT and shared security-group dependencies are reviewed | Recreate first through the GitHub-hosted protected network workflow, then recover runner, EKS and higher layers in reverse |

The network is always last in teardown planning and first in recovery. The
VPC-connected runner remains outside the EKS failure domain so it can recover
the cluster. ARC remains inside EKS and therefore cannot be the sole recovery
mechanism for EKS itself.

## GitHub Actions Modes

Workflow: `.github/workflows/private-eks-teardown-plan.yml`

### `inspect`

This credential-free mode:

1. checks out the repository;
2. validates the exact seven-layer order; and
3. writes source-only, sanitized summary evidence.

It does not enter the protected environment and does not inspect AWS.

### `teardown-plan`

This protected, read-only mode requires the `aws-private-eks` environment and
the exact confirmation:

```text
I_UNDERSTAND_PRIVATE_EKS_LAYERED_TEARDOWN_PLAN_ONLY
```

It uses GitHub Actions OIDC and performs only S3 `HeadObject` checks for the
known Terraform state-object boundaries. It does not download state, print
state keys, refresh providers, or create a Terraform destroy plan. A failed
`HeadObject` check is recorded as `unknown`, not `absent`, because the workflow
cannot safely distinguish a missing object from denied or unavailable access
without broadening its evidence boundary.

Workload and ARC readiness remain explicit manual runtime-inspection
prerequisites because they are not owned by standalone Terraform state in this
design.

## Sanitized Evidence Contract

The protected workflow artifact contains only:

- schema and workflow mode;
- exact-order validity and layer count;
- `present` or `unknown` categories for the GPU, EKS, runner and network state
  objects;
- Boolean flags showing that workload and ARC inspection remains manual;
- confirmation that raw state was not retrieved;
- confirmation that raw identifiers were not published; and
- confirmation that destructive execution is unavailable.

It must never include account IDs, role ARNs, bucket names, state keys, VPC or
subnet IDs, cluster names, runner tokens, Terraform state, provider plan output,
or Kubernetes object details.

## Fail-Closed Conditions

Planning stops or remains non-actionable when:

- the layer list is incomplete, duplicated, unknown, or out of order;
- the exact plan-only confirmation is missing;
- the protected OIDC role or backend configuration is unavailable;
- a managed state boundary returns `unknown`;
- workload or ARC runtime inspection is incomplete;
- recovery ownership is not identified; or
- sanitized evidence cannot be produced.

No state-presence result is proof that a layer is safe to remove. It is only an
input to a later human-reviewed plan.

## Future Destructive Boundary

There is no destructive workflow in this implementation. Any future stop or
teardown execution requires all of the following as separately reviewed work:

1. current runtime evidence for all seven layers;
2. a fresh dependency-aware teardown plan;
3. confirmed backup, retention and recovery responsibilities;
4. a reviewed cost and outage boundary;
5. a separate pull request containing narrowly scoped execution logic;
6. a new protected-environment approval; and
7. a fresh exact destructive confirmation defined by that future workflow.

The plan-only confirmation in this runbook must never authorize deletion.

## Local Validation

```bash
bash scripts/tests/test-private-eks-teardown-readiness.sh
bash scripts/tests/test-private-eks-teardown-workflow.sh
```

These tests exercise the real order validator and verify that the workflow has
no Terraform apply/destroy, AWS delete, Kubernetes delete, or Helm uninstall
path.

## Cost Boundary

The `inspect` mode uses only ordinary GitHub Actions execution. The protected
mode performs a bounded number of S3 metadata requests and creates no AWS
resources. It does not start EKS, EC2, CodeBuild, NAT, GPU, ARC, Kueue, Kafka,
Prometheus, or Grafana capacity.
