# P4b EKS Sandbox Operator Runbook

This runbook explains when to run the optional personal EKS sandbox and how to keep the run short-lived, budget-aware, and safe to document.

Do not use this runbook for production, customer, internal, or shared enterprise environments. The sandbox is for a personal AWS account with synthetic workloads only.

## When To Apply

Apply only when all of these are true:

- PR changes enabling the workflow have been merged to `main`.
- GitHub environment `aws-sandbox` exists and requires manual approval.
- `AWS_ROLE_TO_ASSUME` is configured as an environment secret or variable.
- `AWS_REGION`, `TF_BACKEND_BUCKET`, `TF_BACKEND_LOCK_TABLE`, and `TF_STATE_KEY_PREFIX` are configured as environment variables.
- AWS Budget and alarm are configured for the personal sandbox.
- You have time to run `destroy` the same day.
- You are ready to capture only sanitized evidence.

If any item is missing, do not apply yet.

## Before Apply

Use `docs/p4b-eks-apply-readiness-check.md` as the final go/no-go check before running any real apply. If that checklist produces a no-go signal, stop before credentials are configured.

Run `validate` first:

```text
workflow: terraform-eks-sandbox
mode: validate
```

Then run `plan`:

```text
workflow: terraform-eks-sandbox
mode: plan
```

Review the plan in GitHub Actions. Do not copy raw plan output into git if it contains account identifiers, ARNs, endpoints, or provider-specific resource IDs.

## Apply

Run apply only through GitHub Actions:

```text
workflow: terraform-eks-sandbox
mode: apply
confirm_apply: I_UNDERSTAND_COST_AND_TEARDOWN
```

Expected controls:

- GitHub environment approval is required.
- Confirmation phrase is required before AWS credentials are configured.
- Terraform uses the S3 backend and DynamoDB lock table.
- No `tfplan` artifact is saved.

After apply, update `docs/templates/p4b-eks-sandbox-apply-destroy-evidence.md` in a private note or sanitized public evidence file. Keep real endpoints, kubeconfig, account IDs, ARNs, backend names, and billing details out of git.

## Destroy

Destroy should normally run the same day after evidence is captured:

```text
workflow: terraform-eks-sandbox
mode: destroy
confirm_destroy: I_UNDERSTAND_DESTROY
```

After destroy, verify:

- EKS cluster is deleted.
- Managed node group is deleted.
- Load balancers are gone.
- EBS volumes and snapshots created by the sandbox are reviewed.
- Public IPs or elastic IPs are reviewed.
- CloudWatch log groups are reviewed.
- Terraform backend is intentionally retained or intentionally cleaned.

## Public-Safe Evidence

Good evidence:

```text
Terraform apply completed: yes
Terraform destroy completed: yes
Region: ap-southeast-2
Cluster name pattern: cloudai-platform-eks-sandbox
Node group name pattern: cloudai-platform-eks-sandbox-default
Endpoint: not committed
Kubeconfig: not committed
Data scope: synthetic-only
Teardown target: same day
```

Do not commit:

- live EKS API endpoint;
- load balancer DNS name;
- kubeconfig;
- AWS account ID;
- role ARN;
- backend bucket name;
- DynamoDB lock table name;
- Terraform state;
- raw Terraform plan;
- command output containing account identifiers or ARNs;
- screenshots showing account details.

## Stop Conditions

Stop and do not continue if:

- budget alarm is missing;
- teardown time is not available;
- plan shows unexpected expensive resources;
- NAT Gateway appears unexpectedly;
- non-synthetic workload values are present;
- GitHub environment approval is missing;
- any command output contains details that would be unsafe to commit.
