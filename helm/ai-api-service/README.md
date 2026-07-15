# Helm: AI API Service

This folder contains the synthetic-only Helm release-engineering example for the mock AI API service.

The chart demonstrates platform controls rather than production complexity:

- Deployment labels for app, environment, owner, data scope, and cost allocation.
- Readiness and liveness probes.
- Resource requests and limits.
- ConfigMap-driven mock-mode settings.
- No secrets or real provider credentials.
- Rollback notes for failed rollout.
- Optional PodDisruptionBudget when replicas are greater than one.

## Chart Contents

- `Chart.yaml` defines the chart metadata.
- `values.yaml` defines the synthetic-only defaults.
- `templates/deployment.yaml` packages the mock API Deployment.
- `templates/service.yaml` exposes the internal ClusterIP Service.
- `templates/configmap.yaml` provides mock-mode environment settings.
- `templates/serviceaccount.yaml` creates a minimal service account with token automount disabled.
- `templates/pdb.yaml` adds a PodDisruptionBudget when enabled and replicas are greater than one.

## Example Commands

When Helm is installed:

```bash
helm lint helm/ai-api-service
helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox
```

These commands render local manifests only. They do not deploy to EKS.

## Release Engineering Notes

The chart defaults to:

- `replicaCount: 2`
- `/health` readiness and liveness probes
- CPU and memory requests and limits
- `ClusterIP` service
- synthetic-only platform labels
- no Kubernetes `Secret` resources
- no image pull secret
- read-only root filesystem with a small writable `/tmp` volume
- no provider credentials
- optional command and args overrides for sandbox test images

## Boundary

The chart should deploy only synthetic/mock behavior. It should not invoke Amazon Bedrock, create agent runtime actions, connect to real RAG sources, or require a real cloud account by default.

Real deployment belongs in a later P4b sandbox path through GitHub Actions OIDC, environment approval, budget guardrails, and teardown.

P4f can override `containerCommand` and `containerArgs` at workflow time to use a known public test image while preserving the chart's default mock API image values.
