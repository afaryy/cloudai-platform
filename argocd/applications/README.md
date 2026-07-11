# Argo CD Applications

This folder contains portfolio-ready GitOps application examples for P4c.

The examples are synthetic-only. They show how a platform team could express release ownership, environment, cost, data-scope, and rollback metadata for AI platform services without connecting to a real cluster.

## Applications

| File | Purpose |
| --- | --- |
| `cloudai-api-sandbox.yaml` | Argo CD `Application` example for the synthetic mock AI API Helm chart in `helm/ai-api-service`. |

## Pattern

The `cloudai-api-sandbox` example demonstrates:

- GitOps delivery from a Helm chart path.
- Manual sync by default. Automated sync is intentionally not enabled.
- Synthetic-only labels for owner, environment, data scope, and cost allocation.
- Inline Helm values that keep provider mode set to `mock`.
- Namespace targeting without automatically creating namespaces.
- Retry configuration with a small bound.
- Rollback/runbook metadata through annotations.

## Local Validation

Validate that the YAML parses:

```bash
yq eval '.' argocd/applications/cloudai-api-sandbox.yaml
```

Render the Helm chart that this application points to:

```bash
helm template cloudai-api helm/ai-api-service --namespace cloudai-sandbox
```

These commands do not connect to a Kubernetes cluster or Argo CD server.

## Future Sandbox Use

If a personal AWS sandbox is explicitly approved later, this manifest can be used as a starting point for a controlled GitOps flow:

```text
GitHub Actions plan/apply
  -> EKS sandbox readiness checks
  -> Argo CD app registration
  -> manual sync approval
  -> rollout observation
  -> rollback or teardown
```

Any real sandbox use must define budget controls, cleanup steps, and approval gates first.

## Boundary

Do not commit cluster URLs, project names tied to a real organisation, tokens, kubeconfig, live namespaces, or environment-specific Argo CD secrets.
