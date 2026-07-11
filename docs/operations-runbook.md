# Operations Runbook

This runbook describes the future operating model for the platform.

## Mock Mode

Mock mode is the default. It should run without cloud credentials, provider API calls, or real infrastructure deployment.

## Future Operational Areas

- Gateway health checks.
- Provider adapter readiness.
- Policy evaluation failures.
- Cost anomaly review.
- Quota, rate-limit, and capacity saturation review.
- Model, retrieval, agent runtime, and GPU workload degradation.
- Audit event review.
- Incident response for unsafe AI behavior.
- Kubernetes release gates, rollout observation, rollback, and teardown boundaries.

## Release Engineering

The P4 EKS release-engineering track defines the public-safe release pattern for Kubernetes-based AI platform services.

Use `docs/eks-release-gates-and-rollback.md` for:

- pre-deploy gates before a future sandbox sync;
- Helm and Argo CD validation boundaries;
- rollout observation checks;
- rollback choices through Git, Argo CD, Helm, pause, or teardown;
- synthetic evidence expected from any future personal AWS sandbox exercise.

No live operational procedure is active in this first iteration.
