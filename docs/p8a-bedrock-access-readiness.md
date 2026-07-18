# P8a Bedrock Access Readiness

P8a is the go/no-go checklist before the project adds Terraform-managed Bedrock IAM resources or performs any real Bedrock model invocation.

This slice is intentionally documentation-only. It prepares the sandbox boundary for P8b and P8c without changing AWS resources, invoking a model, storing provider responses, or adding runtime integration code.

## Purpose

P8a answers one question:

```text
What must be true before CloudAI Platform performs a tiny, governed Bedrock smoke test?
```

The answer should cover identity, model access, budget, GitHub environment values, least-privilege IAM intent, evidence handling, and stop conditions.

## Scope

P8a includes:

- readiness checklist;
- GitHub environment contract;
- IAM intent;
- model access checks;
- budget and cost controls;
- smoke-test evidence template;
- failure-mode checklist;
- next-step sequencing.

P8a does not include:

- Terraform resources;
- Terraform apply;
- Bedrock invocation;
- Bedrock Guardrails;
- Bedrock AgentCore;
- SageMaker, GPU, or HyperPod;
- real RAG runtime;
- production deployment;
- provider-backed application adapter;
- customer, internal, personal, production, or confidential data.

## Readiness Checklist

Before P8b/P8b.1/P8c, confirm:

| Area | Question | Required answer |
| --- | --- | --- |
| Account | Is the AWS account a personal sandbox or approved non-production account? | Yes |
| Region | Is the target AWS region selected and documented? | Yes |
| Model access | Is access to the selected Bedrock model enabled in that region? | Yes |
| Budget | Is a sandbox budget or spending alarm active? | Yes |
| Workflow gate | Does GitHub environment `aws-sandbox` require manual approval? | Yes |
| Identity | Will GitHub Actions use OIDC role assumption? | Yes |
| Long-lived keys | Are long-lived AWS keys avoided? | Yes |
| Data | Is the planned prompt synthetic only? | Yes |
| Evidence | Is the evidence template ready and sanitized? | Yes |
| Stop condition | Is there a clear stop rule for cost, access, or unexpected output? | Yes |

If any answer is no, do not run a real Bedrock call.

## GitHub Environment Contract

The future P8 workflow should use the existing protected environment:

```text
aws-sandbox
```

Expected environment values:

| Name | Type | Purpose | Public repo rule |
| --- | --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | Secret or variable | OIDC-assumed AWS role for sandbox actions. | Do not commit role ARN. |
| `AWS_REGION` | Variable | Approved Bedrock region. | Region label may be documented if not sensitive. |
| `TF_BACKEND_BUCKET` | Variable | Terraform state bucket if P8b uses the shared backend. | Do not commit real bucket name. |
| `TF_BACKEND_LOCK_TABLE` | Variable | Terraform lock table if P8b uses the shared backend. | Do not commit real table name. |
| `TF_STATE_KEY_PREFIX` | Variable | State key prefix, expected to stay generic. | Safe generic values only. |
| `BEDROCK_MODEL_ID` | Variable | Approved model identifier for the smoke test. | Document only a generic placeholder unless public-safe. |
| `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME` | Secret or variable | Dedicated P8b-created OIDC role for one smoke test. | Do not commit role ARN. |

Do not store raw prompt text, provider responses, or model access screenshots as environment values.

P8c uses `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME` directly, not the Terraform `AWS_ROLE_TO_ASSUME` identity. It requires `confirm_smoke_test=I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL`, makes one non-streaming call with one attempt, and stops rather than falling back if direct model invocation requires an inference profile.

## IAM Intent

The future P8 IAM policy should be narrow and smoke-test oriented.

Allowed intent:

- invoke the selected Bedrock model;
- read only the minimal account/region metadata needed by the workflow;
- write optional sanitized workflow evidence to GitHub Actions logs;
- write optional CloudWatch logs only if explicitly added in P8b.

Avoid:

- broad Bedrock administration permissions;
- account-wide AI service administration;
- unrelated IAM, EKS, S3, DynamoDB, or network permissions;
- wildcard permissions unless AWS model-scoping limitations require them and the reason is documented.

The implementation should document any Bedrock model ARN or resource-scoping limitations discovered during P8b/P8c.

## Synthetic Prompt Boundary

The first prompt should be tiny and synthetic.

Approved shape:

```text
Return the word "ok" in JSON as {"status":"ok"}.
```

Not allowed:

- personal data;
- company or customer data;
- internal architecture details;
- secrets or credentials;
- production logs;
- real documents;
- resume or job-search personal details;
- prompts copied from private systems.

The smoke test should prove provider access only. It should not be used to evaluate model quality, safety, reasoning, RAG, or agent behavior.

## Evidence To Capture

Use `docs/templates/p8a-bedrock-smoke-test-evidence.md` when P8c eventually runs a smoke test.

Public-safe evidence may include:

- date;
- workflow name;
- environment name;
- region label;
- model family label if safe;
- result category, such as `access-ready`, `plan-ready`, or `smoke-test-passed`;
- token count or estimated cost if available and safe;
- confirmation that prompt and output were synthetic;
- confirmation that no raw prompt or response was committed.

Do not capture:

- account IDs;
- role ARNs;
- raw request or response bodies;
- access keys or session tokens;
- backend bucket/table names;
- CloudWatch links with account-specific values;
- screenshots with account details;
- model entitlement screenshots;
- sensitive prompt/output content.

## Failure Modes

Expected P8 readiness or smoke-test failures:

- model access not enabled in the region;
- selected model not available;
- IAM role missing `bedrock:InvokeModel` or equivalent required action;
- OIDC role assumption failure;
- GitHub environment value missing;
- budget alarm not configured;
- AWS quota or account restriction;
- provider SDK/version mismatch;
- unexpected response shape.

The correct behavior is to stop, record a sanitized failure reason, and fix one boundary at a time. Do not broaden IAM permissions blindly.

## Go / No-Go Decision

Go to P8b only when:

- this checklist is complete;
- the chosen model and region are known;
- the manual approval environment exists;
- the budget boundary exists;
- IAM intent is reviewed;
- evidence handling is clear.

Do not go to P8b if:

- model access is unknown;
- budget controls are missing;
- the prompt cannot be kept synthetic;
- the role permission scope is unclear;
- evidence would require private screenshots or account-specific logs.

## Next Sequence

```text
P8a readiness
  -> P8b Terraform plan for Bedrock IAM boundary
  -> P8b.1 IAM apply-readiness gate
  -> P8b.2 confirmed Terraform apply for the IAM boundary
  -> P8c one synthetic Bedrock smoke test
  -> P8d optional gateway adapter
  -> P8e optional Guardrails mapping
```

Do not combine these into one PR.

Before any separate apply-workflow change, use the [P8b.1 Bedrock IAM Apply Readiness](p8b1-bedrock-iam-apply-readiness.md) gate.

## Interview / CTO Wording

```text
Before invoking a real model, I created a Bedrock access readiness boundary that defines identity, manual approval, model access, budget controls, least-privilege IAM intent, synthetic prompt rules, failure modes, and sanitized evidence. This keeps real provider integration governed and incremental rather than turning a portfolio project into an uncontrolled cloud experiment.
```
