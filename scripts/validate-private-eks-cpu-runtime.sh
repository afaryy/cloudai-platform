#!/usr/bin/env bash

set -euo pipefail

cpu_smoke_image="${CPU_SMOKE_IMAGE:-}"
evidence_path="${EVIDENCE_PATH:-/tmp/private-eks-cpu-runtime-evidence.json}"
namespace="default"
job_name="private-cpu-smoke"

private_ecr_digest_pattern='^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/[a-z0-9][a-z0-9._/-]*@sha256:[0-9a-f]{64}$'
if [[ ! "$cpu_smoke_image" =~ $private_ecr_digest_pattern ]]; then
  echo "CPU_SMOKE_IMAGE must be a digest-pinned private ECR image URI." >&2
  exit 1
fi

cleanup_smoke_job() {
  kubectl delete job "$job_name" -n "$namespace" \
    --ignore-not-found=true --wait=true --timeout=2m >/dev/null 2>&1 || true
}

kubectl delete job "$job_name" -n "$namespace" \
  --ignore-not-found=true --wait=true --timeout=2m >/dev/null
trap cleanup_smoke_job EXIT

kubectl wait --for=condition=Ready nodes --all --timeout=10m >/dev/null
nodes_json="$(kubectl get nodes -o json)"

cpu_node_count="$(jq '[.items[]? | select((.status.allocatable.cpu // "0") != "0")] | length' <<<"$nodes_json")"
gpu_node_count="$(jq '[.items[]? | select(((.status.allocatable["nvidia.com/gpu"] // "0") | tonumber) > 0)] | length' <<<"$nodes_json")"

if [[ "$cpu_node_count" -lt 1 ]]; then
  echo "The private CPU baseline requires at least one Ready CPU node." >&2
  exit 1
fi
if [[ "$gpu_node_count" -ne 0 ]]; then
  echo "GPU capacity must remain absent during the private CPU baseline." >&2
  exit 1
fi

kubectl create job "$job_name" -n "$namespace" --image="$cpu_smoke_image" -- \
  /bin/sh -ec 'printf cloudai-private-cpu-ok' >/dev/null
kubectl wait --for=condition=complete "job/$job_name" -n "$namespace" --timeout=3m >/dev/null

job_json="$(kubectl get job "$job_name" -n "$namespace" -o json)"
if ! jq -e '(.status.succeeded // 0) >= 1 and (.status.failed // 0) == 0' <<<"$job_json" >/dev/null; then
  echo "The private CPU smoke Job did not complete successfully." >&2
  exit 1
fi

pods_json="$(kubectl get pods -n "$namespace" -l "job-name=$job_name" -o json)"
if ! jq -e --arg image "$cpu_smoke_image" '
  (.items | length) >= 1 and
  all(.items[]?.spec.containers[]?; .image == $image)
' <<<"$pods_json" >/dev/null; then
  echo "The completed Job did not use the approved private ECR digest." >&2
  exit 1
fi

kubectl delete job "$job_name" -n "$namespace" \
  --ignore-not-found=true --wait=true --timeout=2m >/dev/null
trap - EXIT

printf '%s\n' \
  '{"cpu_job_completed":true,"cpu_nodes_ready":true,"gpu_nodes_observed":0,"private_ecr_digest_used":true,"smoke_job_cleaned":true,"raw_identifiers_published":false}' \
  > "$evidence_path"

echo "private EKS CPU runtime validation passed"
