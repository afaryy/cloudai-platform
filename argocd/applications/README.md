# Argo CD Applications

This folder contains the GitOps Application contract introduced in P4c and used by the optional live P4g EKS sandbox workflow.

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
- A pinned public synthetic image and one replica for the bounded sandbox sync.
- Namespace targeting without automatically creating namespaces.
- Retry configuration with a small bound.
- Resource cleanup through the Argo CD Application finalizer.
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

## Optional Live Sandbox Use

The manual `.github/workflows/argocd-eks-gitops.yml` workflow uses this manifest for a controlled GitOps flow:

```text
GitHub Actions OIDC and environment approval
  -> temporary GitHub runner /32 access to EKS
  -> pinned Argo CD bootstrap
  -> optional runtime-only private repository credential
  -> Application registration
  -> explicit manual sync by commit SHA
  -> Argo CD and Kubernetes health checks
  -> Application and namespace cleanup
```

Run `bootstrap` first, then `sync`. Use `status` for a read-only summary and `uninstall` when the GitOps exercise is complete. Automated sync remains disabled.

For a public repository, select `repository_access=public`; no repository credential is created. For a private repository, store a fine-grained, read-only GitHub token as the `ARGOCD_REPO_TOKEN` secret in the protected `aws-sandbox` GitHub environment and select `repository_access=private`. The workflow creates the Argo CD repository Secret at runtime and removes it during uninstall.

## Boundary

Do not commit cluster URLs, project names tied to a real organisation, tokens, kubeconfig, live namespaces, or environment-specific Argo CD secrets. Keep the workload synthetic, ClusterIP-only, manually synchronized, budgeted, and teardown-ready.
