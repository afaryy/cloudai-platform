#!/usr/bin/env bash

set -euo pipefail

approved_order="workloads,gpu-platform,gpu-node,arc,eks,runner,network"
mode="${MODE:-inspect}"

if [[ "${LAYERS:-}" != "$approved_order" ]]; then
  echo "teardown layer contract rejected" >&2
  exit 1
fi

case "$mode" in
  inspect)
    ;;
  teardown-plan)
    if [[ "${CONFIRMATION:-}" != "I_UNDERSTAND_PRIVATE_EKS_LAYERED_TEARDOWN_PLAN_ONLY" ]]; then
      echo "teardown plan-only confirmation rejected" >&2
      exit 1
    fi
    ;;
  *)
    echo "teardown planning mode rejected" >&2
    exit 1
    ;;
esac

echo '{"plan_ready":true,"layer_count":7,"order_valid":true}'
