# P8h AgentCore Knowledge-Lookup Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public-safe, gateway-first reference architecture for a future read-only AgentCore knowledge-lookup capability, without creating any AgentCore or cloud runtime surface.

**Architecture:** One new document defines the required Gateway entry point, future read-only runtime, approved knowledge boundary, control/evidence map, and stop gates. Two existing project documents link to it and accurately distinguish P8h reference architecture from implemented Bedrock and Guardrail evidence.

**Tech Stack:** Markdown, Mermaid/text architecture notation, existing repository documentation, official AWS documentation links.

## Global Constraints

- Do not create AgentCore, Bedrock, Terraform, IAM, container, ECR, application, workflow, budget, log destination, or cloud resources.
- Do not invoke AWS, AgentCore, Bedrock, Guardrail, model, retrieval, API, or tool.
- The capability is read-only and synthetic-only: no memory, tools, writes, browser, code execution, outbound access, customer/internal data, or real knowledge source.
- The Gateway is the required future entry point; later work must prevent direct runtime bypass.
- Reuse existing evidence by reference only: P1 gateway, P3/P6c knowledge lifecycle, P6a AgentOps, P6f operations/FinOps, P8f Guardrail attachment, and P8g direct evaluation.
- Do not claim deployment, provider validation, production readiness, successful retrieval, AgentCore production experience, or integration of existing controls with AgentCore.
- Preserve public-safe wording: no identifiers, ARNs, account IDs, secrets, raw content, state, plans, or live operational detail.

---

### Task 1: Write the P8h reference architecture and evidence map

**Files:**
- Create: `docs/p8h-agentcore-knowledge-lookup-readiness.md`

**Interfaces:**
- Consumes: existing public-safe evidence documents at `docs/genai-llm-gateway.md`, `docs/rag-knowledge-lifecycle.md`, `docs/ai-traffic-governance.md`, `docs/ai-platform-security-operations-controls.md`, `docs/p8-real-bedrock-sandbox-design.md`, and `docs/guardrails-as-a-service.md`.
- Produces: a self-contained P8h reference document with direct links to existing evidence and official AWS references.

- [ ] **Step 1: Write a failing content contract before the document exists**

Run this check before creating the document:

```bash
test -f docs/p8h-agentcore-knowledge-lookup-readiness.md
```

Expected: exit status `1` because P8h has no public reference document yet.

- [ ] **Step 2: Create the minimal reference document**

Create `docs/p8h-agentcore-knowledge-lookup-readiness.md` with these exact sections:

```markdown
# P8h AgentCore Knowledge-Lookup Readiness

## Purpose and Boundary
## Future Capability
## Gateway-First Reference Architecture
## Control and Evidence Map
## Required Stop Gates Before Runtime Work
## What This Demonstrates
## What This Does Not Claim
## Sources
```

The architecture must show only:

```text
Approved user or client → AgentCore Gateway → future AgentCore Runtime → approved knowledge boundary
```

Under the Gateway, state identity, authorization, Guardrail, and metadata-only
telemetry. Under the future runtime, state read-only orchestration and explicit
exclusion of tools, memory, writes, browser, code execution, and outbound
access.

The control map must use four columns: future control, P8h reference
responsibility, existing portfolio evidence, and deferred external control.
It must map P1, P3, P6a, P6c, P6f, P8f, and P8g separately rather than saying
they are already integrated with AgentCore.

Include the nine stop gates from the approved design: region/service
availability; runtime protocol/artifact/model; approved knowledge
source/classification; Gateway authorization and bypass prevention; workload
identity and human owner; Guardrail/evaluation/evidence; telemetry/logging/
retention/redaction/incident response; cost/budgets/quotas; and a separately
reviewed Terraform/IAM/apply/teardown design.

- [ ] **Step 3: Verify the document contract turns green**

Run:

```bash
document=docs/p8h-agentcore-knowledge-lookup-readiness.md
test -f "$document"
grep -q '^## Gateway-First Reference Architecture$' "$document"
grep -q 'AgentCore Gateway' "$document"
grep -q 'AgentCore Runtime' "$document"
grep -q 'P8g' "$document"
grep -q '^## What This Does Not Claim$' "$document"
! grep -q 'arn:aws:' "$document"
! grep -Eq '[0-9]{12}' "$document"
```

Expected: exit status `0`.

- [ ] **Step 4: Commit the P8h reference document**

```bash
git add docs/p8h-agentcore-knowledge-lookup-readiness.md
git commit -m "docs: add AgentCore knowledge lookup readiness"
```

### Task 2: Link P8h from the Bedrock design and project status

**Files:**
- Modify: `docs/p8-real-bedrock-sandbox-design.md:223-237`
- Modify: `docs/current-status.md:32-36,73-80,131-132`

**Interfaces:**
- Consumes: the P8h document created in Task 1.
- Produces: a deliberate P8 progression and a clear current-status entry.

- [ ] **Step 1: Write a failing link/content check**

Run this before modifying existing documents:

```bash
grep -q 'p8h-agentcore-knowledge-lookup-readiness.md' docs/p8-real-bedrock-sandbox-design.md
```

Expected: exit status `1` because the P8h document is not linked yet.

- [ ] **Step 2: Update the P8 AgentCore boundary**

Replace the outdated statement that AgentCore is merely a later exploration
with concise wording that P8h now supplies a **documentation-only,
gateway-first readiness reference**. It must say no AgentCore resource, call,
Terraform, IAM, container, knowledge source, or runtime exists in this slice.
Link only to `p8h-agentcore-knowledge-lookup-readiness.md`.

Update the completed progression section to reflect live-validated P8f/P8g
evidence and P8h as the next separate, design-only extension. Do not describe
P8h as live validated.

- [ ] **Step 3: Add a precise current-status entry**

Add P8h to the current milestone bullets and the completed/status table with
this meaning:

```text
P8h AgentCore knowledge-lookup readiness | Complete static gateway-first reference architecture; no AgentCore resource or call
```

Update the P8 future-provider boundary note to state that P8h is a completed
architecture reference, while any real AgentCore work remains separately
reviewed and stop-gated.

- [ ] **Step 4: Verify links and status wording**

Run:

```bash
test -f docs/p8h-agentcore-knowledge-lookup-readiness.md
grep -q 'p8h-agentcore-knowledge-lookup-readiness.md' docs/p8-real-bedrock-sandbox-design.md
grep -q 'P8h AgentCore knowledge-lookup readiness' docs/current-status.md
! rg -n 'AgentCore (is |was )?(live validated|deployed|production-ready|running in production)' \
  docs/p8h-agentcore-knowledge-lookup-readiness.md \
  docs/p8-real-bedrock-sandbox-design.md \
  docs/current-status.md
```

Expected: exit status `0`.

- [ ] **Step 5: Commit the navigation/status update**

```bash
git add docs/p8-real-bedrock-sandbox-design.md docs/current-status.md
git commit -m "docs: link P8h AgentCore readiness"
```

### Task 3: Final documentation-only verification and PR handoff

**Files:**
- Verify: `docs/p8h-agentcore-knowledge-lookup-readiness.md`
- Verify: `docs/p8-real-bedrock-sandbox-design.md`
- Verify: `docs/current-status.md`
- Verify: `docs/superpowers/specs/2026-07-20-p8h-agentcore-knowledge-lookup-readiness-design.md`

**Interfaces:**
- Consumes: the P8h document and cross-document navigation from Tasks 1 and 2.
- Produces: evidence that P8h is a public-safe documentation-only slice with no cloud implementation scope.

- [ ] **Step 1: Run whitespace, link, and sensitive-content checks**

Run:

```bash
git diff --check main...HEAD
for path in \
  docs/p8h-agentcore-knowledge-lookup-readiness.md \
  docs/p8-real-bedrock-sandbox-design.md \
  docs/current-status.md; do
  ! rg -n 'arn:aws:|[0-9]{12}|AKIA|AWS_SECRET|BEGIN (RSA |OPENSSH )?PRIVATE KEY' "$path"
done
test -f docs/p8h-agentcore-knowledge-lookup-readiness.md
```

Expected: exit status `0`.

- [ ] **Step 2: Verify implementation scope**

Run:

```bash
git diff --name-only main...HEAD
! git diff --name-only main...HEAD | rg '^(providers/|\.github/workflows/|helm/|argocd/|shared/|examples/)'
```

Expected: only the P8h document, P8 design/status links, spec, and plan are
changed. No infrastructure, workflow, or runtime surface is present.

- [ ] **Step 3: Request review before any push or live action**

Summarize the mapping and stop gates, state that no AWS request ran, and request
review. Do not create a runtime, dispatch a workflow, or perform a provider
call.

## Plan Self-Review

- Scope coverage: Task 1 creates the architecture/control artifact; Task 2 makes it discoverable without overstating maturity; Task 3 verifies public-safe documentation-only scope.
- Placeholder scan: no unspecified resources, controls, or stop gates remain.
- Consistency: every reference to AgentCore calls it future/deferred; P8f/P8g remain the only live Bedrock/Guardrail evidence in this P8 path.
