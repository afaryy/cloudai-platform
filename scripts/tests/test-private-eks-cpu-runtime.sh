#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
validator="$repo_root/scripts/validate-private-eks-cpu-runtime.sh"
failures=0
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

fake_bin="$tmp_dir/bin"
mkdir -p "$fake_bin"

cat > "$fake_bin/kubectl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_KUBECTL_LOG"

case "$*" in
  "wait --for=condition=Ready nodes --all --timeout=10m")
    exit 0
    ;;
  "get nodes -o json")
    if [[ "${FAKE_GPU_NODE:-false}" == "true" ]]; then
      printf '%s\n' '{"items":[{"status":{"allocatable":{"cpu":"2","nvidia.com/gpu":"1"}}}]}'
    else
      printf '%s\n' '{"items":[{"status":{"allocatable":{"cpu":"2"}}}]}'
    fi
    ;;
  delete\ job\ private-cpu-smoke\ *)
    exit 0
    ;;
  create\ job\ private-cpu-smoke\ *)
    exit 0
    ;;
  "wait --for=condition=complete job/private-cpu-smoke -n default --timeout=3m")
    [[ "${FAKE_JOB_TIMEOUT:-false}" != "true" ]]
    ;;
  "get job private-cpu-smoke -n default -o json")
    printf '%s\n' '{"status":{"succeeded":1,"failed":0}}'
    ;;
  "get pods -n default -l job-name=private-cpu-smoke -o json")
    printf '{"items":[{"spec":{"containers":[{"image":"%s"}]}}]}\n' "$CPU_SMOKE_IMAGE"
    ;;
  *)
    printf 'unexpected kubectl call: %s\n' "$*" >&2
    exit 64
    ;;
esac
EOF
chmod +x "$fake_bin/kubectl"

run_validator() {
  local evidence_path="$1"
  shift
  env \
    PATH="$fake_bin:$PATH" \
    FAKE_KUBECTL_LOG="$tmp_dir/kubectl.log" \
    EVIDENCE_PATH="$evidence_path" \
    "$@" \
    bash "$validator"
}

assert_fails_without_kubectl() {
  local name="$1"
  local image="$2"
  : > "$tmp_dir/kubectl.log"

  if run_validator "$tmp_dir/evidence.json" CPU_SMOKE_IMAGE="$image" >/dev/null 2>&1; then
    echo "not ok - $name"
    failures=$((failures + 1))
  elif [[ -s "$tmp_dir/kubectl.log" ]]; then
    echo "not ok - $name invoked kubectl"
    failures=$((failures + 1))
  else
    echo "ok - $name"
  fi
}

approved_image="123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/cloudai-private-cpu-smoke@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

assert_fails_without_kubectl "mutable image tag is rejected" \
  "123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/cloudai-private-cpu-smoke:latest"
assert_fails_without_kubectl "public registry digest is rejected" \
  "registry.example.com/cloudai-private-cpu-smoke@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

: > "$tmp_dir/kubectl.log"
if run_validator "$tmp_dir/evidence.json" CPU_SMOKE_IMAGE="$approved_image" >/dev/null; then
  expected='{"cpu_job_completed":true,"cpu_nodes_ready":true,"gpu_nodes_observed":0,"private_ecr_digest_used":true,"smoke_job_cleaned":true,"raw_identifiers_published":false}'
  actual="$(cat "$tmp_dir/evidence.json")"
  if [[ "$actual" != "$expected" ]]; then
    echo "not ok - successful validation returned unexpected evidence"
    failures=$((failures + 1))
  elif ! grep -q -- "create job private-cpu-smoke -n default --image=$approved_image" "$tmp_dir/kubectl.log"; then
    echo "not ok - successful validation did not use the approved digest"
    failures=$((failures + 1))
  elif [[ "$(grep -c -- '^delete job private-cpu-smoke ' "$tmp_dir/kubectl.log")" -lt 2 ]]; then
    echo "not ok - successful validation did not clean before and after the smoke"
    failures=$((failures + 1))
  else
    echo "ok - successful CPU smoke emits bounded evidence and cleans the Job"
  fi
else
  echo "not ok - approved CPU smoke failed"
  failures=$((failures + 1))
fi

: > "$tmp_dir/kubectl.log"
if run_validator "$tmp_dir/gpu-evidence.json" CPU_SMOKE_IMAGE="$approved_image" FAKE_GPU_NODE=true >/dev/null 2>&1; then
  echo "not ok - GPU node was accepted in the CPU baseline"
  failures=$((failures + 1))
else
  echo "ok - GPU node is rejected from the CPU baseline"
fi

: > "$tmp_dir/kubectl.log"
if run_validator "$tmp_dir/timeout-evidence.json" CPU_SMOKE_IMAGE="$approved_image" FAKE_JOB_TIMEOUT=true >/dev/null 2>&1; then
  echo "not ok - incomplete Job was accepted"
  failures=$((failures + 1))
elif [[ "$(grep -c -- '^delete job private-cpu-smoke ' "$tmp_dir/kubectl.log")" -lt 2 ]]; then
  echo "not ok - failed smoke did not run cleanup"
  failures=$((failures + 1))
else
  echo "ok - failed smoke cleans the Job and emits no success evidence"
fi

if (( failures > 0 )); then
  echo "$failures private EKS CPU runtime test(s) failed" >&2
  exit 1
fi

echo "all private EKS CPU runtime tests passed"
