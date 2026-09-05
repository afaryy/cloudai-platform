#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
workflow="$repo_root/.github/workflows/private-eks-teardown-plan.yml"

test -f "$workflow"
grep -q 'workflow_dispatch:' "$workflow"
grep -q -- '- inspect' "$workflow"
grep -q -- '- teardown-plan' "$workflow"
test "$(grep -c '^          - inspect$' "$workflow")" -eq 1
test "$(grep -c '^          - teardown-plan$' "$workflow")" -eq 1
! grep -Eq '^          - (apply|destroy|stop)$' "$workflow"
grep -q 'environment: aws-private-eks' "$workflow"
grep -q 'id-token: write' "$workflow"
grep -q "inputs.mode == 'teardown-plan'" "$workflow"
grep -q 'MODE:.*inputs.mode' "$workflow"
grep -q 'CONFIRMATION:.*inputs.confirmation' "$workflow"
grep -q 'validate-private-eks-teardown-readiness.sh' "$workflow"
grep -q 'aws s3api head-object' "$workflow"
grep -q 'raw_identifiers_published.*false' "$workflow"
grep -q 'destructive_execution_available.*false' "$workflow"

if grep -Eq 'terraform[[:space:]]+(apply|destroy)([[:space:]]|$)' "$workflow"; then
  echo "workflow must not expose Terraform mutation" >&2
  exit 1
fi

if grep -Eq 'aws[[:space:]]+[a-z0-9-]+[[:space:]]+delete' "$workflow"; then
  echo "workflow must not expose AWS deletion" >&2
  exit 1
fi

if grep -Eq 'kubectl[[:space:]]+delete|helm[[:space:]]+(delete|uninstall)' "$workflow"; then
  echo "workflow must not expose Kubernetes or Helm deletion" >&2
  exit 1
fi

if grep -Eq 'aws s3api get-object|terraform state pull' "$workflow"; then
  echo "workflow must not retrieve or print raw Terraform state" >&2
  exit 1
fi

echo "private EKS teardown workflow boundary passed"
