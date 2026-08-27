# ARC private EKS handoff runbook

This runbook describes the post-bootstrap handoff from the independent
VPC-connected CodeBuild runner to Actions Runner Controller (ARC) ephemeral
runner scale sets. It is source and CI guidance; it does not claim that ARC is
currently deployed.

## Boundary

The handoff is allowed only after the protected private-EKS validation job has
proved:

- the private EKS API is reachable from the CodeBuild runner;
- `PRIVATE_EKS_RUNNER_READY=true`;
- `PRIVATE_EKS_ENDPOINT_POLICY_READY=true`;
- the configured budget and private-EKS environment approvals remain valid.

The workflow uses the exact CodeBuild run-scoped label for both validation and
handoff jobs. It never falls back to a GitHub-hosted runner for private API
operations.

## ARC topology

```text
CodeBuild ephemeral runner (bootstrap / recovery)
  -> private EKS API
  -> ARC controller in arc-systems
  -> ARC listener and scale set in arc-runners
  -> Helm / Argo CD / Kueue / bounded workload delivery
```

ARC is installed from the official OCI-published charts:

- `gha-runner-scale-set-controller`
- `gha-runner-scale-set`

The chart version is pinned by the protected
`PRIVATE_EKS_ARC_CHART_VERSION` variable. The runner scale set is bounded to
`minRunners=0` and `maxRunners=1` for the sandbox. The installation name is the
workflow `runs-on` target for later steady-state jobs.

## Authentication and permissions

Use a GitHub App, not a long-lived personal token, where the repository and
organisation policy allows it. Store the App ID, installation ID, and private
key only as protected `aws-private-eks` secrets:

- `PRIVATE_EKS_ARC_GITHUB_APP_ID`
- `PRIVATE_EKS_ARC_GITHUB_APP_INSTALLATION_ID`
- `PRIVATE_EKS_ARC_GITHUB_APP_PRIVATE_KEY`

The ARC runner service account must be separate from the CodeBuild lifecycle
role. It should receive only the Kubernetes and cloud permissions needed for
steady-state delivery. It must not be able to create or recover the VPC,
private EKS control plane, Terraform backend, or bootstrap IAM role.

## Execution modes

1. `validate` performs source-only checks on a GitHub-hosted runner and does
   not configure AWS credentials.
2. `install` validates private EKS reachability, installs the controller and
   one bounded scale set, and records metadata-only evidence.
3. `smoke` validates the existing controller and scale set without reinstalling
   them.

Both remote modes require the exact phrase
`I_UNDERSTAND_PRIVATE_EKS_ARC_APPLY`. There is no destroy or uninstall mode in
this workflow. ARC removal is a separate reviewed change, after which the
VPC-connected runner remains available for recovery.

## Required protected variables and secrets

| Name | Purpose |
| --- | --- |
| `PRIVATE_EKS_RUNNER_PROJECT_NAME` | CodeBuild project used by the run-scoped label |
| `PRIVATE_EKS_CLUSTER_NAME` | Existing private EKS cluster name |
| `PRIVATE_EKS_RUNNER_READY` | Runner foundation readiness gate |
| `PRIVATE_EKS_ENDPOINT_POLICY_READY` | Endpoint-policy readiness gate |
| `PRIVATE_EKS_ARC_APPLY_READY` | Explicit ARC handoff approval gate |
| `PRIVATE_EKS_ARC_CHART_VERSION` | Reviewed immutable ARC chart version |
| `PRIVATE_EKS_ARC_GITHUB_CONFIG_URL` | Repository or organisation URL for ARC registration |
| `PRIVATE_EKS_ARC_GITHUB_APP_ID` | GitHub App ID secret |
| `PRIVATE_EKS_ARC_GITHUB_APP_INSTALLATION_ID` | GitHub App installation secret |
| `PRIVATE_EKS_ARC_GITHUB_APP_PRIVATE_KEY` | GitHub App private-key secret |

## Evidence and failure boundaries

The workflow uploads only booleans and categories. It does not publish runner
tokens, private endpoints, kubeconfig, account IDs, role ARNs, private keys,
raw Helm output, or unredacted logs.

If `kubectl` or `helm` is not present in the reviewed runner image, the
workflow fails closed. It does not download clients from the public internet
inside a private endpoint-only path. The runner image must be prepared and
reviewed separately, or an explicitly approved egress path must be added.

## Recovery rule

If EKS, ARC, the controller, or the scale set is unhealthy, use the independent
VPC-connected CodeBuild lifecycle runner to inspect, repair, stop, or recover
the private-EKS state. Do not attempt to recover a missing control plane using
an ARC runner that depends on that control plane.
