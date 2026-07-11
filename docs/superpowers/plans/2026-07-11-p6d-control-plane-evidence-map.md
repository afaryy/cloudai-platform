# P6d Control-Plane Evidence Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mock evidence map that connects existing runtime AgentOps, capability governance, RAG lifecycle, guardrail verdict, and AI-assisted review evidence into one CloudAI control-plane story.

**Architecture:** P6d is a documentation, schema, fixture, and contract-test slice. It does not add real provider calls, runtime agent execution, persistent audit storage, traffic proxying, or cloud deployment.

**Tech Stack:** Markdown, JSON Schema, TypeScript node:test, synthetic JSON fixtures.

## Global Constraints

- Use synthetic IDs and metadata only.
- Do not include secrets, credentials, account identifiers, personal data, customer data, production logs, tfstate, tfvars, kubeconfig, plan files, or live endpoints.
- Do not introduce real agent execution, model calls, cloud deployment, runtime proxying, or persistent audit storage.

---

### Task 1: Add P6d Evidence Map

**Files:**
- Create: `docs/control-plane-evidence-map.md`
- Create: `shared/schemas/control-plane-evidence/evidence-map.schema.json`
- Create: `shared/examples/control-plane-evidence/evidence-map.mock.json`
- Create: `providers/aws/app/api/tests/controlPlaneEvidenceContracts.test.ts`
- Modify: `README.md`
- Modify: `docs/current-status.md`
- Create: `docs/superpowers/plans/2026-07-11-p6d-control-plane-evidence-map.md`

- [x] **Step 1: Add documentation**

Explain how P6d maps evidence across P6a, P6b, P6c, Guardrails as a Service, and P5b.

- [x] **Step 2: Add schema and fixture**

Create a closed evidence-map schema and one synthetic example.

- [x] **Step 3: Add contract test**

Validate the fixture and assert the expected evidence lanes are present.

- [x] **Step 4: Refresh README and current status**

Show P6d as the next evidence layer after P6a/P6b/P6c.

- [x] **Step 5: Verify**

Run JSON validation and the package-pinned API test command.
