# P4b EKS Apply Readiness Check

Use this checklist immediately before any real personal EKS sandbox apply.

This is a go/no-go check, not a deployment instruction. If any item is not true, do not run `mode=apply`.

## Readiness Decision

```text
Ready to apply only if:
  budget exists
  manual approval exists
  backend values are private
  workload is synthetic
  teardown owner and same-day destroy window exist
  evidence capture is sanitized
```

The first real apply should prove the platform foundation only:

- Terraform remote backend initialization;
- GitHub Actions OIDC role assumption;
- EKS control plane and managed node group creation;
- no NAT-heavy default;
- no Helm deployment, Argo CD sync, Bedrock, Bedrock AgentCore, GPU, or HyperPod resources;
- same-day destroy and sanitized evidence.

## Go / No-Go Checklist

| Gate | Go condition | No-go signal |
|---|---|---|
| Branch state | Apply workflow is merged to `main`. | Running from an unmerged branch or local-only workflow. |
| GitHub environment | `aws-sandbox` exists and requires manual approval. | No environment protection or no human approval. |
| OIDC role | GitHub Actions can assume the sandbox role through OIDC. | Static AWS keys, missing trust policy, or unclear role boundary. |
| Backend | S3 backend bucket and DynamoDB lock table are configured as private GitHub environment variables. | Backend names committed to git or copied into public notes. |
| State key | The state key is derived from project, stack, and environment naming. | Reusing one state key across unrelated stacks. |
| Budget | Sandbox budget and alarm are active before apply. | No alarm recipient, no threshold, or no budget owner. |
| Cost shape | Plan does not introduce NAT Gateway, GPU, HyperPod, Bedrock, AgentCore, or unexpected expensive resources. | Any expensive or unclear resource appears unexpectedly. |
| Data scope | Workload values are synthetic-only. | Any real internal, customer, production, or personal sensitive data. |
| Evidence | Evidence template is ready and will be sanitized. | Raw plan/apply output, screenshots, account IDs, ARNs, endpoints, or kubeconfig will be saved. |
| Teardown | Destroy owner and same-day destroy window are confirmed. | No time to destroy after apply. |

## Recommended Sequence

1. Run `validate`.
2. Run `plan`.
3. Review plan for cost, scope, and unexpected resources.
4. Confirm budget and alarm.
5. Confirm same-day teardown window.
6. Run `apply` only with the exact confirmation phrase.
7. Capture sanitized evidence.
8. Run `destroy`.
9. Verify cleanup.

## Apply Command Boundary

Use GitHub Actions only:

```text
workflow: terraform-eks-sandbox
mode: apply
confirm_apply: I_UNDERSTAND_COST_AND_TEARDOWN
```

Do not run apply from a laptop as the normal portfolio path. Laptop commands are acceptable only for learning or emergency inspection.

## Evidence Boundary

Safe evidence:

- workflow name;
- mode;
- region label;
- synthetic workload statement;
- cluster and node group name pattern;
- confirmation that no endpoint or kubeconfig was committed;
- confirmation that destroy completed.

Unsafe evidence:

- account IDs;
- ARNs;
- backend bucket names;
- DynamoDB lock table names;
- raw Terraform plan or state;
- kubeconfig;
- live EKS endpoint;
- load balancer DNS names;
- screenshots showing account or billing details.

## Stop Conditions

Stop before apply if:

- budget alarm is missing;
- manual environment approval is missing;
- apply cannot be destroyed the same day;
- plan includes an unexpected high-cost resource;
- evidence would require exposing private identifiers;
- you are unsure whether the workload is synthetic-only.

The safest professional answer is sometimes: do not apply yet.
