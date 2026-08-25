#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../gpu-quota.sh
source "$repo_root/scripts/gpu-quota.sh"

assert_equal() {
  local expected="$1"
  local actual="$2"
  local description="$3"
  if [[ "$expected" != "$actual" ]]; then
    printf 'FAIL: %s (expected=%q actual=%q)\n' "$description" "$expected" "$actual" >&2
    exit 1
  fi
}

assert_equal "" \
  "$(extract_positive_quota $'None\nNone\n0.0\nNone')" \
  "rejects a quota response with no positive numeric value"

assert_equal "32.0" \
  "$(extract_positive_quota $'None\n32.0\nNone')" \
  "selects the first positive numeric quota"

assert_equal "64" \
  "$(extract_positive_quota $'0\n64\nNone')" \
  "ignores zero before selecting a positive quota"

printf 'PASS: GPU quota parsing\n'
