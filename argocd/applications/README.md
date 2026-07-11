# Argo CD Applications

This folder will hold portfolio-ready GitOps application examples for P4c.

The first Argo CD example should show:

- Manual promotion from local/mock release examples to a sandbox namespace.
- Application labels for owner, environment, data scope, and cost allocation.
- Sync policy notes that keep destructive automation disabled by default.
- Rollback and audit metadata expectations.
- Clear separation between public examples and private cluster details.

## Boundary

Do not commit cluster URLs, project names tied to a real organisation, tokens, kubeconfig, live namespaces, or environment-specific Argo CD secrets.
