#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
validator="$repo_root/scripts/validate-private-eks-teardown-readiness.sh"
approved_order="workloads,gpu-platform,gpu-node,arc,eks,runner,network"
failures=0

assert_passes() {
  local name="$1"
  local layers="$2"
  local output

  if ! output="$(LAYERS="$layers" bash "$validator" 2>/dev/null)"; then
    echo "not ok - $name"
    failures=$((failures + 1))
    return
  fi

  if [[ "$output" != '{"plan_ready":true,"layer_count":7,"order_valid":true}' ]]; then
    echo "not ok - $name returned unexpected evidence"
    failures=$((failures + 1))
    return
  fi

  echo "ok - $name"
}

assert_fails() {
  local name="$1"
  local layers="$2"

  if LAYERS="$layers" bash "$validator" >/dev/null 2>&1; then
    echo "not ok - $name"
    failures=$((failures + 1))
    return
  fi

  echo "ok - $name"
}

assert_mode_passes() {
  local name="$1"
  local mode="$2"
  local confirmation="$3"

  if ! MODE="$mode" CONFIRMATION="$confirmation" LAYERS="$approved_order" \
    bash "$validator" >/dev/null 2>&1; then
    echo "not ok - $name"
    failures=$((failures + 1))
    return
  fi

  echo "ok - $name"
}

assert_mode_fails() {
  local name="$1"
  local mode="$2"
  local confirmation="$3"

  if MODE="$mode" CONFIRMATION="$confirmation" LAYERS="$approved_order" \
    bash "$validator" >/dev/null 2>&1; then
    echo "not ok - $name"
    failures=$((failures + 1))
    return
  fi

  echo "ok - $name"
}

assert_passes "approved order" "$approved_order"
assert_fails "missing layer" "workloads,gpu-platform,gpu-node,arc,eks,runner"
assert_fails "duplicated layer" "workloads,gpu-platform,gpu-node,arc,eks,runner,runner,network"
assert_fails "unknown layer" "workloads,gpu-platform,gpu-node,arc,eks,runner,storage"
assert_fails "network cannot precede runner" "network,runner,eks"
assert_fails "EKS cannot precede ARC" "eks,arc,workloads"
assert_fails "complete but reordered layers" "workloads,gpu-node,gpu-platform,arc,eks,runner,network"
assert_fails "empty layer contract" ""
assert_fails "whitespace cannot alter the contract" "workloads, gpu-platform,gpu-node,arc,eks,runner,network"
assert_mode_passes "inspect needs no confirmation" "inspect" ""
assert_mode_passes "teardown plan accepts exact confirmation" "teardown-plan" \
  "I_UNDERSTAND_PRIVATE_EKS_LAYERED_TEARDOWN_PLAN_ONLY"
assert_mode_fails "teardown plan rejects missing confirmation" "teardown-plan" ""
assert_mode_fails "teardown plan rejects wrong confirmation" "teardown-plan" \
  "I_UNDERSTAND_PRIVATE_EKS_LAYERED_TEARDOWN"
assert_mode_fails "unknown mode is rejected" "apply" \
  "I_UNDERSTAND_PRIVATE_EKS_LAYERED_TEARDOWN_PLAN_ONLY"

if (( failures > 0 )); then
  echo "$failures teardown readiness test(s) failed" >&2
  exit 1
fi

echo "all private EKS teardown readiness tests passed"
