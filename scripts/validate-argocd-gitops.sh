#!/usr/bin/env bash

set -euo pipefail

workflow_file=".github/workflows/argocd-eks-gitops.yml"
application_file="argocd/applications/cloudai-api-sandbox.yaml"
shared_concurrency_group='group: cloudai-eks-sandbox-control-plane'

assert_contains() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if ! grep -Fq -- "$pattern" "$file"; then
    echo "ERROR: $message" >&2
    exit 1
  fi
}

assert_not_contains() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if grep -Fq -- "$pattern" "$file"; then
    echo "ERROR: $message" >&2
    exit 1
  fi
}

if [ ! -f "$workflow_file" ]; then
  echo "ERROR: P4g Argo CD GitOps workflow is missing." >&2
  exit 1
fi

assert_contains "$workflow_file" 'environment: aws-sandbox' 'P4g must use the protected aws-sandbox environment.'
assert_contains "$workflow_file" 'id-token: write' 'P4g must authenticate to AWS through GitHub OIDC.'
assert_contains "$workflow_file" 'actions/checkout@v7' 'P4g must use the current Node 24 checkout action.'
assert_contains "$workflow_file" 'aws-actions/configure-aws-credentials@v6' 'P4g must use the current AWS OIDC credentials action.'
assert_contains "$workflow_file" 'ARGOCD_VERSION: "v3.4.5"' 'P4g must pin the reviewed Argo CD release.'
assert_contains "$workflow_file" 'I_UNDERSTAND_SANDBOX_GITOPS' 'P4g must require an explicit sandbox confirmation.'
assert_contains "$workflow_file" 'repository_access' 'P4g must distinguish public and private repository access.'
assert_contains "$workflow_file" 'ARGOCD_REPO_TOKEN' 'Private repository access must use a runtime secret.'
assert_contains "$workflow_file" '[ "$MODE" = "bootstrap" ] || [ "$MODE" = "sync" ]' 'Only bootstrap and sync may require the private repository token.'
assert_contains "$workflow_file" 'refs/heads/main' 'P4g must sync only a revision already merged to main.'
assert_contains "$workflow_file" 'publicAccessCidrs' 'P4g must bound and restore GitHub runner access to the EKS API.'
assert_contains "$workflow_file" 'inputs.mode == '\''sync'\''' 'P4g must keep workload sync as an explicit manual mode.'
assert_contains "$workflow_file" 'inputs.mode == '\''uninstall'\''' 'P4g must provide a cleanup mode.'
assert_contains "$workflow_file" 'Synthetic GitOps health check passed' 'P4g must verify the synced mock workload.'
assert_contains "$workflow_file" 'kubectl wait deployment' 'P4g must wait for every Argo CD Deployment using a supported kubectl command.'
assert_contains "$workflow_file" '--for=condition=Available' 'P4g must wait for Argo CD Deployments to become available.'
assert_not_contains "$workflow_file" 'kubectl rollout status deployment' 'kubectl rollout status does not support selecting every Deployment with --all.'
assert_contains "$workflow_file" "revision_status=" 'P4g must read the revision reported by Argo CD.'
assert_contains "$workflow_file" '[ "$revision_status" = "$GITHUB_SHA" ]' 'P4g must not accept stale sync success from another revision.'

terraform_workflow='.github/workflows/terraform-eks-sandbox.yml'
assert_contains "$terraform_workflow" 'TF_VAR_node_desired_size: ${{ vars.TF_VAR_NODE_DESIRED_SIZE || '\''1'\'' }}' 'The EKS workflow must support a protected desired-node override with a one-node default.'
assert_contains "$terraform_workflow" 'TF_VAR_node_min_size: ${{ vars.TF_VAR_NODE_MIN_SIZE || '\''1'\'' }}' 'The EKS workflow must support a protected minimum-node override with a one-node default.'
assert_contains "$terraform_workflow" 'TF_VAR_node_max_size: ${{ vars.TF_VAR_NODE_MAX_SIZE || '\''1'\'' }}' 'The EKS workflow must support a protected maximum-node override with a one-node default.'

for control_workflow in \
  .github/workflows/terraform-eks-sandbox.yml \
  .github/workflows/helm-eks-validation.yml \
  .github/workflows/helm-eks-release.yml \
  .github/workflows/argocd-eks-gitops.yml; do
  assert_contains "$control_workflow" "$shared_concurrency_group" 'Every workflow that mutates the EKS sandbox control plane must share one concurrency group.'
done

assert_contains "$application_file" 'resources-finalizer.argocd.argoproj.io' 'The Application must clean up its managed resources before deletion.'
assert_contains "$application_file" 'repository: hashicorp/http-echo' 'The live Application must use the proven synthetic image.'
assert_contains "$application_file" 'tag: "1.0"' 'The synthetic image tag must be pinned.'
assert_contains "$application_file" 'releaseName: cloudai-api' 'The Argo CD Helm release name must remain stable.'
assert_not_contains "$application_file" 'automated:' 'The first live GitOps slice must not enable automated sync.'

echo "P4g Argo CD GitOps contract checks passed."
