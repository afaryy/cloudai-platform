# Cloud AI Platform Synthetic Demo Handbook

This document is synthetic training material for the Cloud & AI Platform Engineering portfolio.

## Platform operating principles

1. Identity is explicit. Every workload, agent and tool uses a dedicated, short-lived identity.
2. Network access is bounded. Private connectivity and deny-by-default egress are preferred.
3. Infrastructure is reproducible. Terraform and reviewed CI/CD changes are the deployment path.
4. AI behaviour is evaluated. A successful HTTP response is not proof of a correct business outcome.
5. Human accountability remains. High-impact or destructive actions require human approval.
6. Operations are observable. Logs, traces, metrics, cost and evaluation evidence are retained.

## Synthetic support scenario

An engineering agent investigates a failed Terraform deployment. It may read approved logs, deployment history and runbooks, then prepare a pull request. It must not read secrets or make direct production changes.

The pull request passes deterministic formatting, security, policy and test checks before a human reviewer approves the change. The agent's identity, tool calls, proposed change and approval outcome are retained as audit evidence.

## Expected RAG behaviour

Answers should cite this handbook when explaining the platform operating principles or the synthetic support scenario. If the source does not contain an answer, the assistant should say that the handbook does not provide enough evidence instead of inventing a policy.
