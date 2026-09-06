#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
discoverer="$repo_root/scripts/discover-terraform-runtime-inventory.sh"
test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT
fixtures="$test_root/fixtures"
fake_bin="$test_root/bin"
evidence="$test_root/evidence.json"
mkdir -p "$fixtures" "$fake_bin"

printf '%s\n' '{"clusters":[]}' > "$fixtures/clusters.json"
printf '%s\n' '{"Vpcs":[]}' > "$fixtures/vpcs.json"
printf '%s\n' '{"projects":[]}' > "$fixtures/projects.json"
printf '%s\n' '{"nodegroups":[]}' > "$fixtures/nodegroups.json"
printf '%s\n' '{"Contents":[]}' > "$fixtures/objects.json"

cat > "$fake_bin/aws" <<'EOF'
#!/usr/bin/env bash

set -euo pipefail

service="$1"
operation="$2"

case "$service $operation" in
  'eks list-clusters') cat "$AWS_FIXTURES/clusters.json" ;;
  'ec2 describe-vpcs') cat "$AWS_FIXTURES/vpcs.json" ;;
  'codebuild batch-get-projects') cat "$AWS_FIXTURES/projects.json" ;;
  'eks list-nodegroups') cat "$AWS_FIXTURES/nodegroups.json" ;;
  's3api list-objects-v2') cat "$AWS_FIXTURES/objects.json" ;;
  *) exit 64 ;;
esac
EOF
chmod +x "$fake_bin/aws"

PATH="$fake_bin:$PATH" AWS_FIXTURES="$fixtures" AWS_REGION='ap-southeast-2' \
  TF_BACKEND_BUCKET='fixture-bucket' TF_STATE_KEY_PREFIX='fixture-prefix' \
  bash "$discoverer" "$evidence"

test "$(jq -r '.legacy_public_eks_present' "$evidence")" = "false"
test "$(jq -r '.private_eks_present' "$evidence")" = "false"
test "$(jq -r '.raw_identifiers_published' "$evidence")" = "false"
test "$(jq -r '.state_api_consistent' "$evidence")" = "true"
test "$(jq -r '.unexpected_scope_detected' "$evidence")" = "false"
test "$(jq -e '
  type == "object"
  and (keys | sort) == [
    "gpu_capacity_present",
    "legacy_public_eks_present",
    "private_eks_present",
    "private_network_present",
    "private_runner_present",
    "raw_identifiers_published",
    "state_api_consistent",
    "unexpected_scope_detected"
  ]
  and all(.[]; type == "boolean")
' "$evidence")" = "true"
! grep -Eq 'arn:aws:|subnet-|vpc-|[0-9]{12}' "$evidence"

for prohibited in delete destroy apply import 'state rm' taint untaint; do
  ! grep -Fqi "$prohibited" "$discoverer"
done

echo 'all Terraform runtime inventory discovery tests passed'
