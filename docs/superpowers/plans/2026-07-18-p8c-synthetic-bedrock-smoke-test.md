# P8c Synthetic Bedrock Smoke-Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one manually confirmed, synthetic Bedrock `Converse` call to the existing protected workflow without expanding the Terraform execution role.

**Architecture:** Add a `smoke-test` workflow mode that assumes `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME` directly through OIDC. Keep `validate`, `plan`, and `apply` unchanged; the smoke-test branch never initialises Terraform or the backend.

**Tech Stack:** GitHub Actions YAML, AWS CLI `bedrock-runtime converse`, shell static checks, Markdown.

## Global Constraints

- Require `I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL` before AWS credentials are configured.
- Use `AWS_MAX_ATTEMPTS=1`, non-streaming `converse`, a low output-token limit, and no fallback.
- Do not log or commit raw prompt/response data, role ARNs, account data, or backend values.
- Do not add Bedrock actions to `AWS_ROLE_TO_ASSUME` or modify Terraform resources.

---

### Task 1: Add failing static P8c boundary checks

**Files:**
- Modify: `.github/workflows/terraform-tests.yaml`

- [ ] Add shell assertions requiring `smoke-test`, the exact confirmation token, `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME`, `AWS_MAX_ATTEMPTS: 1`, and `bedrock-runtime converse`; assert the workflow does not contain a smoke-test Terraform command path.
- [ ] Run the focused assertion against the current workflow and confirm it fails because `smoke-test` is absent.

### Task 2: Add the protected smoke-test workflow path

**Files:**
- Modify: `.github/workflows/terraform-bedrock-sandbox.yml`

- [ ] Add `smoke-test` to the dispatch mode choices and a separate smoke-test confirmation input check.
- [ ] Add protected environment values `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME` and `BEDROCK_MODEL_ID`; check them only for `smoke-test`.
- [ ] Configure AWS credentials for `smoke-test` with the dedicated smoke role, while retaining the existing Terraform role for `plan` and `apply`.
- [ ] Add one `aws bedrock-runtime converse` call with runtime-generated synthetic input, `AWS_MAX_ATTEMPTS=1`, low output budget, response redirection to `$RUNNER_TEMP`, silent structural validation, and temporary-file cleanup.
- [ ] Emit only `smoke-test-passed` on success and sanitized failure output otherwise.

### Task 3: Document and verify P8c

**Files:**
- Modify: `docs/p8a-bedrock-access-readiness.md`
- Modify: `docs/templates/p8a-bedrock-smoke-test-evidence.md`
- Modify: `.github/workflows/terraform-tests.yaml`

- [ ] Document the two P8c protected environment variables, direct smoke-role assumption, exact confirmation, single-call boundary, and inference-profile stop condition.
- [ ] Add evidence-template fields for smoke-role separation and one-attempt/non-streaming confirmation without recording request data.
- [ ] Run the complete workflow static check, YAML parse check, `git diff --check`, and existing Terraform test suite; confirm the static check passes.
- [ ] Commit the workflow, tests, documentation, and this plan together with `feat: add synthetic Bedrock smoke test`.
