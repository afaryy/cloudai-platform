# P4b EKS Sandbox Apply/Destroy Evidence Template

Use this template for public-safe notes after a personal AWS sandbox run.

Do not include account IDs, role ARNs, backend bucket names, state object names with private values, kubeconfig, live endpoints, command output containing ARNs, screenshots with account details, credentials, or billing details.

## Run Summary

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Workflow | `terraform-eks-sandbox` |
| Environment | `aws-sandbox` |
| Mode | `apply` / `destroy` |
| Region | `ap-southeast-2` |
| Workload data scope | `synthetic-only` |
| Confirmation used | apply or destroy confirmation phrase, not secrets |

## Pre-Apply Evidence

- Budget alarm exists:
- Manual GitHub environment approval required:
- Backend uses S3 and DynamoDB locking:
- Workload is synthetic-only:
- No NAT Gateway required for first POC:
- Teardown owner confirmed:
- Same-day teardown target recorded:

## Apply Evidence

- Terraform backend initialized:
- Terraform validation completed:
- Terraform apply completed:
- EKS cluster name pattern:
- Node group name pattern:
- Public-safe outputs captured:
- No live endpoint or kubeconfig committed:

## Teardown Evidence

- Terraform destroy completed:
- EKS cluster deleted:
- Node group deleted:
- Load balancers reviewed:
- EBS volumes/snapshots reviewed:
- Public IPs or elastic IPs reviewed:
- CloudWatch log groups reviewed:
- Terraform backend retained or cleaned intentionally:

## Notes

- Sanitized observation:
- Follow-up task:
