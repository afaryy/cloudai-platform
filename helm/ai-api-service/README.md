# Helm: AI API Service

This folder will hold the public-safe Helm release-engineering example for the mock AI API service.

The first chart should demonstrate platform controls rather than production complexity:

- Deployment labels for app, environment, owner, data scope, and cost allocation.
- Readiness and liveness probes.
- Resource requests and limits.
- ConfigMap-driven mock-mode settings.
- No secrets or real provider credentials.
- Rollback notes for failed rollout.
- Optional PodDisruptionBudget once the replica model is clear.

## Boundary

The chart should deploy only synthetic/mock behavior. It should not invoke Amazon Bedrock, create agent runtime actions, connect to real RAG sources, or require a real cloud account by default.
