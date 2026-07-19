# P8f Real Bedrock Guardrail and Guarded Converse Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one bounded Bedrock Guardrail and prove it is attached to one synthetic, manually approved Converse request through a separate OIDC role.

**Architecture:** Extend the existing Bedrock sandbox Terraform state with a Guardrail and explicit version, while preserving model-only smoke access. A new, separate smoke role is condition-bound to the Guardrail. The existing manual workflow gains a guarded mode that reads Terraform outputs, invokes once, disables traces, and emits only sanitized evidence.

**Tech Stack:** Terraform 1.6+, locked HashiCorp AWS provider 5.x, AWS IAM, GitHub Actions OIDC, AWS CLI, Node.js tests, Markdown.

## Global Constraints

- Stop before implementation if provider 5.100.0 lacks `aws_bedrock_guardrail` or `aws_bedrock_guardrail_version`; do not upgrade the provider in P8f.
- No AgentCore, RAG, tools, memory, storage, gateway, custom regex, denied topics, word filters, contextual grounding, or production policy content.
- No raw input, output, trace, provider error, identifier, ARN, account ID, state, plan, credential, or model ID in committed content or workflow logs.
- Existing model-only smoke role and normal CI must remain unchanged.
- The guarded smoke must use one non-streaming request, `AWS_MAX_ATTEMPTS=1`, and a trace-disabled Guardrail configuration.

## Task 1: Verify Provider Support Before Any Guardrail Resource

**Files:**
- Verify: `providers/aws/infra/terraform/envs/bedrock-sandbox/.terraform.lock.hcl`
- Verify: installed provider schema in the Bedrock sandbox environment.

- [ ] **Step 1: Initialize without backend changes and inspect the provider schema**

Run `terraform init -backend=false` from `providers/aws/infra/terraform/envs/bedrock-sandbox`.

Run `terraform providers schema -json` and inspect the AWS provider resource schemas for `aws_bedrock_guardrail` and `aws_bedrock_guardrail_version`.

Expected: both resources and required configuration blocks are present under locked provider version `5.100.0`.

- [ ] **Step 2: Stop if unsupported**

If either resource is absent, do not edit Terraform or IAM. Record the provider incompatibility and ask the user to approve a separate provider-upgrade design.

## Task 2: Test and Add Guardrail Terraform and Separate IAM

**Files:**
- Modify: `providers/aws/infra/terraform/modules/bedrock-access/main.tf`
- Modify: `providers/aws/infra/terraform/modules/bedrock-access/variables.tf`
- Modify: `providers/aws/infra/terraform/modules/bedrock-access/outputs.tf`
- Modify: `providers/aws/infra/terraform/envs/bedrock-sandbox/main.tf`
- Modify: `providers/aws/infra/terraform/envs/bedrock-sandbox/variables.tf`
- Modify: `providers/aws/infra/terraform/envs/bedrock-sandbox/outputs.tf`
- Modify: relevant native Terraform tests under `providers/aws/infra/terraform/**/tests/`
- Modify: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml`

**Interfaces:**
- Produces Guardrail identifier/version Terraform outputs without exposing them in repository fixtures.
- Produces a separate Guardrail smoke role output for the protected GitHub environment.
- Preserves existing model-only smoke role policy unchanged.

- [ ] **Step 1: Write failing Terraform assertions**

Add native Terraform tests asserting the Guardrail has existing synthetic-only tags, a Prompt Attack policy, one standard sensitive-information policy, generic blocked messages, and an explicit Guardrail version.

Add assertions that the Guardrail smoke policy has model invocation actions only, excludes Guardrail administration and `iam:PassRole`, and includes a `bedrock:GuardrailIdentifier` condition.

- [ ] **Step 2: Run the targeted Terraform tests to verify red**

Run `terraform test` in the affected module/environment directories.

Expected: the new Guardrail assertions fail before the resource and role exist.

- [ ] **Step 3: Add minimal Terraform implementation**

Add provider-supported variables for Prompt Attack strength, one standard PII entity/action, and generic messages. Create the Guardrail and `aws_bedrock_guardrail_version` in the existing sandbox state.

Create a distinct OIDC role for the Guardrail smoke path. Limit model resources to the existing approved set and enforce the generated Guardrail identifier condition. Add only lifecycle permissions proven necessary to the Terraform bootstrap role; do not add runtime invocation or `iam:PassRole`.

- [ ] **Step 4: Verify Terraform**

Run `terraform fmt -check -recursive`, all affected `terraform test` commands, `terraform validate`, and a backend-disabled `terraform plan` with existing non-secret sandbox inputs.

Expected: only the Guardrail, version, bounded role/policy, and required lifecycle permissions are planned; no model invocation occurs.

- [ ] **Step 5: Commit the Terraform boundary**

Use a focused commit such as `feat: add Bedrock Guardrail sandbox boundary`.

## Task 3: Test and Add the Guarded Manual Workflow Mode

**Files:**
- Modify: `.github/workflows/terraform-bedrock-sandbox.yml`
- Modify: workflow static tests or repository checks that validate manual AWS boundaries.
- Modify: `docs/p8-real-bedrock-sandbox-design.md` and `docs/current-status.md`.

**Interfaces:**
- Consumes Terraform Guardrail identifier/version outputs and protected `AWS_BEDROCK_GUARDRAIL_SMOKE_ROLE_TO_ASSUME`.
- Produces only `guardrail-attached-passed` or a sanitized failure category.

- [ ] **Step 1: Write failing workflow contract checks**

Assert a `guardrail-smoke-test` dispatch mode, exact confirmation, protected environment role requirement, `AWS_MAX_ATTEMPTS=1`, Terraform output lookup, one `aws bedrock-runtime converse` command, `guardrailConfig` with a numeric version, `trace=disabled`, temporary-file cleanup, and no raw output/error echo.

- [ ] **Step 2: Run the static check to verify red**

Run the repository workflow-boundary test/check used by the existing Bedrock workflow.

Expected: it fails because the Guardrail mode does not exist.

- [ ] **Step 3: Add the minimal guarded mode**

Add the new manual mode without modifying validate, plan, apply, or model-only smoke behavior. Read Terraform outputs after the approved apply path, assume only the separate role, generate the one synthetic message in runner temporary state, call Converse once with trace disabled, validate safe response/intervention shape, and map errors to sanitized categories.

- [ ] **Step 4: Verify workflow and docs**

Run workflow/repository static checks, API tests, Terraform tests, and security scan. Update the docs to state that P8f is implemented but the real manual apply and smoke require protected-environment setup and explicit human dispatch.

- [ ] **Step 5: Commit the workflow and documentation**

Use a focused commit such as `feat: add guarded Bedrock smoke workflow`.

## Task 4: Final Verification and Operator Handoff

- [ ] **Step 1: Verify scope**

Run `git diff main...HEAD --name-only`, `git diff --check main...HEAD`, full Terraform tests, repository checks, security scan, and `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

Expected: no AgentCore/RAG/runtime service change, no secret or raw-content artifact, and all tests pass.

- [ ] **Step 2: Prepare the explicit operator checklist**

List only the future protected environment value, required bootstrap apply, Terraform plan/apply review, and exact manual workflow confirmation. Do not execute a live apply or Guardrail smoke without a separate user instruction after the PR is merged.

- [ ] **Step 3: Request review before merge**

Summarize provider-compatibility evidence, IAM separation, static test results, and the fact that no live provider action occurred during implementation.

## Plan Self-Review

- Provider compatibility is a stop gate before resource code.
- Terraform, IAM, workflow, documentation, and final operator actions are independently verifiable.
- Every live AWS action remains manually approved and outside normal CI.
