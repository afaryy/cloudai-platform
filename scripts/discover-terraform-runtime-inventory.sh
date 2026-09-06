#!/usr/bin/env bash

set -euo pipefail

evidence_path="${1:-/tmp/terraform-runtime-inventory-evidence.json}"

for required_name in AWS_REGION TF_BACKEND_BUCKET TF_STATE_KEY_PREFIX; do
  if [[ -z "${!required_name:-}" ]]; then
    echo "required inventory configuration is absent" >&2
    exit 1
  fi
done

json_scalar() {
  local filter="$1"
  shift
  local statuses

  if "$@" --output json 2>/dev/null | jq -r "$filter" 2>/dev/null; then
    statuses=("${PIPESTATUS[@]}")
  else
    statuses=("${PIPESTATUS[@]}")
  fi

  if (( statuses[0] != 0 || statuses[1] != 0 )); then
    return 1
  fi
}

boolean_from_scalar() {
  local scalar="$1"

  case "$scalar" in
    true|false)
      printf '%s\n' "$scalar"
      ;;
    *)
      return 1
      ;;
  esac
}

inventory_boolean() {
  local filter="$1"
  shift
  local scalar

  if ! scalar="$(json_scalar "$filter" "$@")"; then
    echo "read-only inventory query failed" >&2
    exit 1
  fi

  if ! boolean_from_scalar "$scalar"; then
    echo "read-only inventory query returned an invalid result" >&2
    exit 1
  fi
}

inventory_count() {
  local filter="$1"
  shift
  local scalar

  if ! scalar="$(json_scalar "$filter" "$@")"; then
    echo "read-only inventory query failed" >&2
    exit 1
  fi

  if [[ ! "$scalar" =~ ^[0-9]+$ ]]; then
    echo "read-only inventory query returned an invalid count" >&2
    exit 1
  fi

  printf '%s\n' "$scalar"
}

state_present() {
  local suffix="$1"
  local state_key="${TF_STATE_KEY_PREFIX}/${suffix}/terraform.tfstate"
  local count

  count="$(inventory_count '.Contents | length' aws s3api list-objects-v2 \
    --bucket "$TF_BACKEND_BUCKET" \
    --prefix "$state_key" \
    --max-keys 1)"

  if (( count > 0 )); then
    printf 'true\n'
  else
    printf 'false\n'
  fi
}

legacy_public_eks_present="$(inventory_boolean \
  '.clusters | index("cloudai-platform-eks-sandbox") != null' \
  aws eks list-clusters)"

private_network_count="$(inventory_count \
  '.Vpcs | length' \
  aws ec2 describe-vpcs \
  --filters \
    'Name=tag:Project,Values=cloudai-platform' \
    'Name=tag:Environment,Values=eks-private-network' \
    'Name=tag:ManagedBy,Values=terraform' \
    'Name=tag:Name,Values=cloudai-platform-eks-private-network-vpc')"
if (( private_network_count > 0 )); then
  private_network_present=true
else
  private_network_present=false
fi

private_runner_count="$(inventory_count \
  '.projects | length' \
  aws codebuild batch-get-projects \
  --names 'cloudai-platform-private-eks-runner')"
if (( private_runner_count > 0 )); then
  private_runner_present=true
else
  private_runner_present=false
fi

private_eks_present="$(inventory_boolean \
  '.clusters | index("cloudai-platform-eks-private-sandbox") != null' \
  aws eks list-clusters)"

if [[ "$legacy_public_eks_present" == true ]]; then
  gpu_capacity_present="$(inventory_boolean \
    '.nodegroups | index("cloudai-platform-eks-sandbox-gpu-poc") != null' \
    aws eks list-nodegroups --cluster-name 'cloudai-platform-eks-sandbox')"
else
  gpu_capacity_present=false
fi

legacy_public_eks_state_present="$(state_present 'eks-sandbox')"
private_network_state_present="$(state_present 'eks-private-network')"
private_runner_state_present="$(state_present 'eks-private-runner')"
private_eks_state_present="$(state_present 'eks-private-sandbox')"
gpu_capacity_state_present="$(state_present 'eks-gpu-kueue-poc')"

if [[ "$legacy_public_eks_present" == "$legacy_public_eks_state_present" \
  && "$private_network_present" == "$private_network_state_present" \
  && "$private_runner_present" == "$private_runner_state_present" \
  && "$private_eks_present" == "$private_eks_state_present" \
  && "$gpu_capacity_present" == "$gpu_capacity_state_present" ]]; then
  state_api_consistent=true
else
  state_api_consistent=false
fi

if (( private_network_count > 1 || private_runner_count > 1 )); then
  unexpected_scope_detected=true
else
  unexpected_scope_detected=false
fi

mkdir -p "$(dirname "$evidence_path")"
jq -n \
  --argjson legacy_public_eks_present "$legacy_public_eks_present" \
  --argjson private_network_present "$private_network_present" \
  --argjson private_runner_present "$private_runner_present" \
  --argjson private_eks_present "$private_eks_present" \
  --argjson gpu_capacity_present "$gpu_capacity_present" \
  --argjson state_api_consistent "$state_api_consistent" \
  --argjson unexpected_scope_detected "$unexpected_scope_detected" \
  '{
    legacy_public_eks_present: $legacy_public_eks_present,
    private_network_present: $private_network_present,
    private_runner_present: $private_runner_present,
    private_eks_present: $private_eks_present,
    gpu_capacity_present: $gpu_capacity_present,
    state_api_consistent: $state_api_consistent,
    unexpected_scope_detected: $unexpected_scope_detected,
    raw_identifiers_published: false
  }' > "$evidence_path"
