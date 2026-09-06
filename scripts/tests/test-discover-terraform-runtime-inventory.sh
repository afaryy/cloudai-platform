#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
discoverer="$repo_root/scripts/discover-terraform-runtime-inventory.sh"
workflow="$repo_root/.github/workflows/terraform-runtime-inventory.yml"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT
fixtures="$test_root/fixtures"
fake_bin="$test_root/bin"
call_log="$test_root/aws-calls.log"
state_suffixes=(eks-sandbox eks-private-network eks-private-runner eks-private-sandbox eks-gpu-kueue-poc)
mkdir -p "$fixtures" "$fake_bin"

new_scenario() {
  local scenario="$1"
  local suffix
  local scenario_dir="$fixtures/$scenario"
  mkdir -p "$scenario_dir/objects" "$scenario_dir/states"
  printf '%s\n' '{"clusters":[]}' > "$scenario_dir/clusters.json"
  printf '%s\n' '{"Vpcs":[]}' > "$scenario_dir/vpcs.json"
  printf '%s\n' '{"projects":[]}' > "$scenario_dir/projects.json"
  printf '%s\n' '{"nodegroups":[]}' > "$scenario_dir/nodegroups.json"
  for suffix in "${state_suffixes[@]}"; do
    jq -n --arg key "fixture-prefix/${suffix}/terraform.tfstate" '{Contents:[{Key:$key}]}' > "$scenario_dir/objects/$suffix.json"
    printf '%s\n' '{"version":4,"resources":[]}' > "$scenario_dir/states/$suffix.json"
  done
}

copy_scenario() {
  cp -R "$fixtures/$1" "$fixtures/$2"
}

new_scenario absent
copy_scenario absent public_api_empty_state
printf '%s\n' '{"clusters":["cloudai-platform-eks-sandbox"]}' > "$fixtures/public_api_empty_state/clusters.json"

copy_scenario public_api_empty_state public_api_managed_state
printf '%s\n' '{"version":4,"resources":[{"module":"module.eks","mode":"managed","type":"aws_eks_cluster","name":"this","instances":[{}]}]}' > "$fixtures/public_api_managed_state/states/eks-sandbox.json"

copy_scenario absent backup_only
jq -n --arg key 'fixture-prefix/eks-sandbox/terraform.tfstate.backup' '{Contents:[{Key:$key}]}' > "$fixtures/backup_only/objects/eks-sandbox.json"

copy_scenario absent lock_only
jq -n --arg key 'fixture-prefix/eks-sandbox/terraform.tfstate.tflock' '{Contents:[{Key:$key}]}' > "$fixtures/lock_only/objects/eks-sandbox.json"

copy_scenario absent malformed_state
printf '%s\n' '{"version":4,"resources":' > "$fixtures/malformed_state/states/eks-sandbox.json"

copy_scenario absent ambiguous_state
printf '%s\n' '{"version":4,"resources":[{"module":"module.eks","mode":"managed","type":"aws_eks_cluster","name":"this","instances":[{}]},{"module":"module.eks","mode":"managed","type":"aws_eks_cluster","name":"this","instances":[{}]}]}' > "$fixtures/ambiguous_state/states/eks-sandbox.json"

copy_scenario absent exact_runner_name
printf '%s\n' '{"projects":["cloudai-platform-private-eks-runner"]}' > "$fixtures/exact_runner_name/projects.json"
printf '%s\n' '{"version":4,"resources":[{"module":"module.runner","mode":"managed","type":"aws_codebuild_project","name":"runner","instances":[{}]}]}' > "$fixtures/exact_runner_name/states/eks-private-runner.json"

cat > "$fake_bin/aws" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

service="$1"
operation="$2"
shift 2
scenario_dir="$AWS_FIXTURES/$INVENTORY_SCENARIO"

argument_value() {
  local expected="$1"
  shift
  while (( "$#" > 0 )); do
    if [[ "$1" == "$expected" ]]; then
      printf '%s\n' "$2"
      return 0
    fi
    shift
  done
  return 1
}

case "$service $operation" in
  'eks list-clusters') cat "$scenario_dir/clusters.json" ;;
  'ec2 describe-vpcs') cat "$scenario_dir/vpcs.json" ;;
  'codebuild list-projects') cat "$scenario_dir/projects.json" ;;
  'eks list-nodegroups') cat "$scenario_dir/nodegroups.json" ;;
  's3api list-objects-v2')
    key_prefix="$(argument_value --prefix "$@")"
    suffix="${key_prefix#fixture-prefix/}"
    suffix="${suffix%/terraform.tfstate}"
    cat "$scenario_dir/objects/$suffix.json"
    ;;
  's3api get-object')
    key="$(argument_value --key "$@")"
    suffix="${key#fixture-prefix/}"
    suffix="${suffix%/terraform.tfstate}"
    destination=''
    for argument in "$@"; do
      if [[ "$argument" != --* && "$argument" != 'fixture-bucket' && "$argument" != "$key" && "$argument" != json ]]; then
        destination="$argument"
      fi
    done
    test -n "$destination"
    cat "$scenario_dir/states/$suffix.json" > "$destination"
    printf '%s\n' '{}'
    printf '%s\n' "s3api get-object $key" >> "$AWS_CALL_LOG"
    ;;
  *) exit 64 ;;
esac
EOF
chmod +x "$fake_bin/aws"

run_discovery() {
  local scenario="$1"
  local evidence="$test_root/$scenario-evidence.json"
  : > "$call_log"
  PATH="$fake_bin:$PATH" AWS_FIXTURES="$fixtures" INVENTORY_SCENARIO="$scenario" AWS_CALL_LOG="$call_log" AWS_REGION='ap-southeast-2' TF_BACKEND_BUCKET='fixture-bucket' TF_STATE_KEY_PREFIX='fixture-prefix' bash "$discoverer" "$evidence" || return 1
  printf '%s\n' "$evidence"
}

assert_rejected() {
  local scenario="$1"
  local evidence="$test_root/$scenario-evidence.json"
  if PATH="$fake_bin:$PATH" AWS_FIXTURES="$fixtures" INVENTORY_SCENARIO="$scenario" AWS_CALL_LOG="$call_log" AWS_REGION='ap-southeast-2' TF_BACKEND_BUCKET='fixture-bucket' TF_STATE_KEY_PREFIX='fixture-prefix' bash "$discoverer" "$evidence" >/dev/null 2>&1; then
    echo "not ok - $scenario must be rejected" >&2
    exit 1
  fi
}

evidence="$(run_discovery absent)"
test "$(jq -r '.legacy_public_eks_present' "$evidence")" = "false"
test "$(jq -r '.private_eks_present' "$evidence")" = "false"
test "$(jq -r '.raw_identifiers_published' "$evidence")" = "false"
test "$(jq -r '.state_api_consistent' "$evidence")" = "true"
test "$(jq -r '.unexpected_scope_detected' "$evidence")" = "false"
grep -Fq 's3api get-object fixture-prefix/eks-sandbox/terraform.tfstate' "$call_log"
test "$(jq -e 'type == "object" and (keys | sort) == ["gpu_capacity_present","legacy_public_eks_present","private_eks_present","private_network_present","private_runner_present","raw_identifiers_published","state_api_consistent","unexpected_scope_detected"] and all(.[]; type == "boolean")' "$evidence")" = "true"
! grep -Eq 'arn:aws:|subnet-|vpc-|[0-9]{12}' "$evidence"

evidence="$(run_discovery public_api_empty_state)"
test "$(jq -r '.legacy_public_eks_present' "$evidence")" = "true"
test "$(jq -r '.state_api_consistent' "$evidence")" = "false"

evidence="$(run_discovery public_api_managed_state)"
test "$(jq -r '.state_api_consistent' "$evidence")" = "true"

assert_rejected backup_only
assert_rejected lock_only
assert_rejected malformed_state
assert_rejected ambiguous_state

evidence="$(run_discovery exact_runner_name)"
test "$(jq -r '.private_runner_present' "$evidence")" = "true"
test "$(jq -r '.state_api_consistent' "$evidence")" = "true"

for prohibited in delete destroy apply import 'state rm' taint untaint; do
  ! grep -Fqi "$prohibited" "$discoverer"
done

grep -Fq 'role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}' "$workflow"
! grep -Fq 'vars.AWS_ROLE_TO_ASSUME' "$workflow"
! grep -Fq 'AWS_ROLE_TO_ASSUME:' "$workflow"
grep -Fq 'codebuild list-projects' "$discoverer"
! grep -Fq 'codebuild batch-get-projects' "$discoverer"

echo 'all Terraform runtime inventory discovery tests passed'
