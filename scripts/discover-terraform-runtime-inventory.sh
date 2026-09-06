#!/usr/bin/env bash

set -euo pipefail

evidence_path="${1:-/tmp/terraform-runtime-inventory-evidence.json}"
state_directory="$(mktemp -d)"
trap 'rm -rf "$state_directory"' EXIT

for required_name in AWS_REGION TF_BACKEND_BUCKET TF_STATE_KEY_PREFIX; do
  if [[ -z "${!required_name:-}" ]]; then
    echo "required inventory configuration is absent" >&2
    exit 1
  fi
done

json_scalar() {
  local filter="$1"
  shift

  if "$@" --output json 2>/dev/null | jq -r "$filter" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

json_scalar_for_key() {
  local key="$1"
  local filter="$2"
  shift 2

  if "$@" --output json 2>/dev/null | jq -r --arg expected "$key" "$filter" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

inventory_boolean() {
  local filter="$1"
  shift
  local scalar

  scalar="$(json_scalar "$filter" "$@")" || return 1
  case "$scalar" in
    true|false) printf '%s\n' "$scalar" ;;
    *) return 1 ;;
  esac
}

inventory_count() {
  local filter="$1"
  shift
  local scalar

  scalar="$(json_scalar "$filter" "$@")" || return 1
  [[ "$scalar" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' "$scalar"
}

state_resource_present() {
  local suffix="$1"
  local module="$2"
  local resource_type="$3"
  local resource_name="$4"
  local state_key="${TF_STATE_KEY_PREFIX}/${suffix}/terraform.tfstate"
  local object_count
  local state_file
  local result

  object_count="$(json_scalar_for_key "$state_key" \
    '[.Contents[]? | select(.Key == $expected)] | length' \
    aws s3api list-objects-v2 \
    --bucket "$TF_BACKEND_BUCKET" \
    --prefix "$state_key" \
    --max-keys 2)" || return 1
  [[ "$object_count" == 1 ]] || return 1

  state_file="$(mktemp "$state_directory/state.XXXXXX")" || return 1
  aws s3api get-object \
    --bucket "$TF_BACKEND_BUCKET" \
    --key "$state_key" \
    "$state_file" \
    --output json >/dev/null 2>&1 || return 1

  result="$(jq -er \
    --arg expected_module "$module" \
    --arg expected_type "$resource_type" \
    --arg expected_name "$resource_name" '
      if type != "object"
        or .version != 4
        or (.resources | type) != "array"
        or any(.resources[]?; type != "object"
          or (.mode | type) != "string"
          or (.type | type) != "string"
          or (.name | type) != "string"
          or (.instances | type) != "array")
      then error("unsupported state shape")
      else
        [.resources[] | select(
          .module == $expected_module
          and .mode == "managed"
          and .type == $expected_type
          and .name == $expected_name
        )] as $matches
        | if ($matches | length) > 1 then error("ambiguous state address")
          elif ($matches | length) == 0 then "false"
          elif ($matches[0].instances | length) == 0 then "false"
          elif ($matches[0].instances | length) == 1 then "true"
          else error("ambiguous state instances")
          end
      end
    ' "$state_file" 2>/dev/null)" || return 1

  case "$result" in
    true|false) printf '%s\n' "$result" ;;
    *) return 1 ;;
  esac
}

fail_closed() {
  echo "read-only inventory query failed" >&2
  exit 1
}

legacy_public_eks_present="$(inventory_boolean \
  '.clusters | index("cloudai-platform-eks-sandbox") != null' \
  aws eks list-clusters)" || fail_closed

private_network_count="$(inventory_count \
  '.Vpcs | length' \
  aws ec2 describe-vpcs \
  --filters \
    'Name=tag:Project,Values=cloudai-platform' \
    'Name=tag:Environment,Values=eks-private-network' \
    'Name=tag:ManagedBy,Values=terraform' \
    'Name=tag:Name,Values=cloudai-platform-eks-private-network-vpc')" || fail_closed
if (( private_network_count > 0 )); then
  private_network_present=true
else
  private_network_present=false
fi

private_runner_count="$(inventory_count \
  '[.projects[]? | select(. == "cloudai-platform-private-eks-runner")] | length' \
  aws codebuild list-projects)" || fail_closed
if (( private_runner_count > 0 )); then
  private_runner_present=true
else
  private_runner_present=false
fi

private_eks_present="$(inventory_boolean \
  '.clusters | index("cloudai-platform-eks-private-sandbox") != null' \
  aws eks list-clusters)" || fail_closed

if [[ "$legacy_public_eks_present" == true ]]; then
  gpu_capacity_present="$(inventory_boolean \
    '.nodegroups | index("cloudai-platform-eks-sandbox-gpu-poc") != null' \
    aws eks list-nodegroups --cluster-name 'cloudai-platform-eks-sandbox')" || fail_closed
else
  gpu_capacity_present=false
fi

legacy_public_eks_state_present="$(state_resource_present \
  'eks-sandbox' 'module.eks' 'aws_eks_cluster' 'this')" || fail_closed
private_network_state_present="$(state_resource_present \
  'eks-private-network' 'module.network' 'aws_vpc' 'this')" || fail_closed
private_runner_state_present="$(state_resource_present \
  'eks-private-runner' 'module.runner' 'aws_codebuild_project' 'runner')" || fail_closed
private_eks_state_present="$(state_resource_present \
  'eks-private-sandbox' 'module.eks' 'aws_eks_cluster' 'this')" || fail_closed
gpu_capacity_state_present="$(state_resource_present \
  'eks-gpu-kueue-poc' 'module.gpu_kueue' 'aws_eks_node_group' 'gpu_poc')" || fail_closed

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
