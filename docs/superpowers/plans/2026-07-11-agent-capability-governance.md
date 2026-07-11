# Agent Capability Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mock-first, provider-neutral contract pack that demonstrates how reusable agent capabilities are reviewed and admitted before future runtime AgentOps controls can consume them.

**Architecture:** Four JSON Schemas define a capability record, skill card, evidence record, and admission decision. Twelve synthetic fixtures demonstrate approved, blocked, and approval-required scenarios; TypeScript contract tests and the existing mock evaluation harness verify the evidence-to-decision relationship. Public documentation positions this layer between governed RAG and later runtime AgentOps.

**Tech Stack:** JSON Schema draft 2020-12, JSON fixtures, TypeScript, Node.js built-in test runner, existing local mock evaluation harness, Markdown.

## Global Constraints

- Keep mock mode as the default; add no agent runtime, tool executor, provider call, cloud deployment, or traffic proxy.
- Do not add external dependencies, NVIDIA software, SkillSpector, credentials, real endpoints, or cryptographic signing.
- Use only synthetic, public-safe examples and avoid confidential, internal, customer, and production claims.
- Keep capability governance distinct from runtime AgentOps: this plan admits reusable capabilities but does not enforce runtime permissions.
- Follow existing `shared/schemas/rag-governance/`, `shared/examples/rag-governance/`, and `providers/aws/app/api/tests/ragGovernanceContracts.test.ts` patterns.

---

### Task 1: Define Capability Governance Contracts and Fixtures

**Files:**
- Create: `shared/schemas/agent-capability-governance/capability-record.schema.json`
- Create: `shared/schemas/agent-capability-governance/skill-card.schema.json`
- Create: `shared/schemas/agent-capability-governance/capability-evidence.schema.json`
- Create: `shared/schemas/agent-capability-governance/capability-admission-decision.schema.json`
- Create: `shared/examples/agent-capability-governance/knowledge-search.capability.json`
- Create: `shared/examples/agent-capability-governance/knowledge-search.skill-card.json`
- Create: `shared/examples/agent-capability-governance/knowledge-search.evidence.json`
- Create: `shared/examples/agent-capability-governance/knowledge-search.decision.json`
- Create: `shared/examples/agent-capability-governance/external-export.capability.json`
- Create: `shared/examples/agent-capability-governance/external-export.skill-card.json`
- Create: `shared/examples/agent-capability-governance/external-export.evidence.json`
- Create: `shared/examples/agent-capability-governance/external-export.decision.json`
- Create: `shared/examples/agent-capability-governance/change-summary.capability.json`
- Create: `shared/examples/agent-capability-governance/change-summary.skill-card.json`
- Create: `shared/examples/agent-capability-governance/change-summary.evidence.json`
- Create: `shared/examples/agent-capability-governance/change-summary.decision.json`
- Create: `providers/aws/app/api/tests/agentCapabilityGovernanceContracts.test.ts`

**Interfaces:**
- Consumes: The JSON Schema object-validation helper pattern in `providers/aws/app/api/tests/ragGovernanceContracts.test.ts`.
- Produces: A capability record, skill card, evidence record, and admission decision for each scenario. All four records share the same `capabilityId` and use explicit, synthetic governance status values.

- [ ] **Step 1: Write failing contract tests for the approved scenario**

Create `providers/aws/app/api/tests/agentCapabilityGovernanceContracts.test.ts` with fixture and schema directories and a test that asserts the approved capability's four records use a shared identifier and expected approved decision:

```ts
const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agent-capability-governance");
const SCHEMA_DIR = resolve(process.cwd(), "../../../../shared/schemas/agent-capability-governance");

test("approved capability is supported by complete synthetic governance evidence", async () => {
  const capability = await readJson("knowledge-search.capability.json", EXAMPLE_DIR);
  const skillCard = await readJson("knowledge-search.skill-card.json", EXAMPLE_DIR);
  const evidence = await readJson("knowledge-search.evidence.json", EXAMPLE_DIR);
  const decision = await readJson("knowledge-search.decision.json", EXAMPLE_DIR);

  assert.equal(capability.capabilityId, "synthetic-knowledge-search");
  assert.equal(skillCard.capabilityId, capability.capabilityId);
  assert.equal(evidence.capabilityId, capability.capabilityId);
  assert.equal(decision.capabilityId, capability.capabilityId);
  assert.equal(evidence.scan.status, "passed");
  assert.equal(evidence.evaluation.status, "passed");
  assert.equal(evidence.integrity.status, "not-implemented");
  assert.equal(decision.decision, "approved");
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test -- --test-name-pattern="approved capability"
```

Expected: the TypeScript compile or test run fails because the new fixture and schema files do not exist.

- [ ] **Step 3: Create the four schemas with explicit closed object shapes**

Use `additionalProperties: false` and require these fields:

```json
{
  "capability-record": ["capabilityId", "name", "version", "ownerRole", "source", "declaredPermissions", "dependencies", "lifecycleStatus"],
  "skill-card": ["capabilityId", "purpose", "intendedUsers", "inputCategories", "outputCategories", "dataFlow", "knownRisks", "mitigations", "references"],
  "capability-evidence": ["capabilityId", "scan", "evaluation", "integrity", "evidenceReferences"],
  "admission-decision": ["capabilityId", "decision", "rationale", "reviewerRole", "decidedAt", "reviewBy", "evidenceReferences"]
}
```

Set `lifecycleStatus` to the enum `draft`, `approved`, `blocked`, `retired`; set admission `decision` to `approved`, `blocked`, `approval-required`; set evidence `scan.status` and `evaluation.status` to `passed`, `failed`, `not-run`; and set `integrity.status` to `not-implemented`. Require `network`, `fileSystem`, and `tools` arrays under `declaredPermissions` so every fixture states its requested access explicitly.

- [ ] **Step 4: Create the three complete synthetic fixture sets**

Use these scenario values exactly:

```json
{
  "knowledge-search": {
    "capabilityId": "synthetic-knowledge-search",
    "network": [],
    "fileSystem": ["synthetic-knowledge-base:read"],
    "tools": ["knowledge-search:read"],
    "scan": "passed",
    "evaluation": "passed",
    "decision": "approved"
  },
  "external-export": {
    "capabilityId": "synthetic-external-export",
    "network": ["external-network:write"],
    "fileSystem": ["workspace:read"],
    "tools": ["http-export:write"],
    "scan": "failed",
    "evaluation": "not-run",
    "decision": "blocked"
  },
  "change-summary": {
    "capabilityId": "synthetic-change-summary",
    "network": [],
    "fileSystem": ["synthetic-change-set:read"],
    "tools": ["change-summary:read"],
    "scan": "passed",
    "evaluation": "passed",
    "decision": "approval-required"
  }
}
```

Set every integrity status to `not-implemented` with wording that explicitly says no signature verification is implemented in this mock reference. Use `synthetic-public` only in data-flow wording and use no URL other than `https://example.com/cloudai-platform/...` reference paths.

- [ ] **Step 5: Complete schema-validation and relationship tests**

Copy the `readJson`, `assertMatchesSchema`, `matchesSchema`, and `isRecord` helpers from `ragGovernanceContracts.test.ts`. Add tests that validate all twelve fixtures against their matching schemas and assert:

```ts
assert.equal(blockedEvidence.scan.status, "failed");
assert.equal(blockedDecision.decision, "blocked");
assert.equal(reviewDecision.decision, "approval-required");
assert.equal(approvedCapability.declaredPermissions.network.length, 0);
```

Also add a negative test that changes the approved decision to `blocked` and asserts the admission-decision schema accepts the enum but the relationship evaluation in Task 2 does not treat it as approved.

- [ ] **Step 6: Run the contract tests to verify they pass**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test -- --test-name-pattern="capability"
```

Expected: all capability-governance contract tests pass.

- [ ] **Step 7: Commit the contract pack**

```bash
git add shared/schemas/agent-capability-governance shared/examples/agent-capability-governance providers/aws/app/api/tests/agentCapabilityGovernanceContracts.test.ts
git commit -m "feat(agentops): add capability governance contracts"
```

### Task 2: Add Capability Admission Evaluation Evidence

**Files:**
- Modify: `providers/aws/app/api/src/evals/mockGatewayEvals.ts`
- Modify: `providers/aws/app/api/tests/mockGatewayEvals.test.ts`
- Modify: `shared/examples/mock-genai-api/eval-result.mock.json`

**Interfaces:**
- Consumes: The four fixture files for each synthetic capability from Task 1.
- Produces: A `MockGatewayEvalResult` with id `capability-admission-governance` and category `contract`.

- [ ] **Step 1: Write the failing evaluation test**

In `mockGatewayEvals.test.ts`, change the expected total from `6` to `7` and append `capability-admission-governance` to the expected identifiers. Add:

```ts
test("mock gateway evals include capability admission evidence", async () => {
  const report = await runMockGatewayEvals();
  const capabilityEval = report.results.find((result) => result.id === "capability-admission-governance");

  assert.ok(capabilityEval);
  assert.equal(capabilityEval.category, "contract");
  assert.equal(capabilityEval.passed, true);
  assert.match(capabilityEval.evidence, /approved, blocked, and approval-required/i);
});
```

- [ ] **Step 2: Run the evaluation test to verify it fails**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test -- --test-name-pattern="capability admission"
```

Expected: FAIL because the seventh evaluation result does not exist.

- [ ] **Step 3: Implement `evaluateCapabilityAdmissionGovernance`**

In `mockGatewayEvals.ts`, use `readFile` and `resolve` to load the six evidence and decision fixtures. Add an async function with this decision rule:

```ts
const passed = approved.evidence.scan.status === "passed"
  && approved.evidence.evaluation.status === "passed"
  && approved.decision.decision === "approved"
  && blocked.evidence.scan.status === "failed"
  && blocked.decision.decision === "blocked"
  && review.evidence.scan.status === "passed"
  && review.decision.decision === "approval-required";
```

Return the result:

```ts
{
  id: "capability-admission-governance",
  category: "contract",
  description: "Mock capability admission keeps approved, blocked, and approval-required reusable agent capabilities distinct.",
  passed,
  evidence: passed
    ? "Synthetic capability evidence preserved approved, blocked, and approval-required outcomes."
    : "Synthetic capability evidence did not preserve the required admission outcomes."
}
```

Append this function call to the existing `results` array.

- [ ] **Step 4: Refresh the synthetic evaluation fixture**

Update `shared/examples/mock-genai-api/eval-result.mock.json` to set `totalCases` and `passedCases` to `7`, then add the same id, category, description, passed value, and evidence text produced by the new evaluation.

- [ ] **Step 5: Run the complete API test suite**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test
```

Expected: TypeScript compilation succeeds and all API tests pass.

- [ ] **Step 6: Commit the admission evaluation**

```bash
git add providers/aws/app/api/src/evals/mockGatewayEvals.ts providers/aws/app/api/tests/mockGatewayEvals.test.ts shared/examples/mock-genai-api/eval-result.mock.json
git commit -m "test(agentops): add capability admission eval"
```

### Task 3: Align Public Architecture and Portfolio Documentation

**Files:**
- Create: `docs/agent-capability-governance.md`
- Modify: `docs/ai-traffic-governance.md`
- Modify: `README.md`
- Modify: `docs/current-status.md`
- Modify: `docs/cloudai-platform-solution-walkthrough.md`

**Interfaces:**
- Consumes: The schemas and examples from Task 1 and evaluation evidence from Task 2.
- Produces: A reader-facing explanation that capability governance controls what enters the platform, while later runtime AgentOps controls how approved capabilities execute.

- [ ] **Step 1: Write the documentation contract assertions first**

Extend `agentCapabilityGovernanceContracts.test.ts` to read `docs/agent-capability-governance.md` and assert it contains both exact headings:

```ts
assert.match(documentation, /## Capability Governance/);
assert.match(documentation, /## Runtime Governance/);
assert.match(documentation, /No agent runtime, tool executor, provider call, cloud deployment, or traffic proxy is implemented/);
```

- [ ] **Step 2: Run the documentation assertion to verify it fails**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test -- --test-name-pattern="documentation contract"
```

Expected: FAIL because `docs/agent-capability-governance.md` does not exist.

- [ ] **Step 3: Write the new capability-governance document**

Create `docs/agent-capability-governance.md` with these sections and wording:

```markdown
# Agent Capability Governance

## Capability Governance

Capability governance controls which reusable agent capabilities may enter the platform. It records declared permissions, ownership, dependencies, known risks, scan and evaluation evidence, integrity status, and an admission decision.

## Runtime Governance

Runtime governance is a later AgentOps concern. It controls how an approved capability is used by an identified agent through tool permissions, human approval, tracing, audit evidence, budgets, and incident controls.
```

Document the four schemas, three outcomes, evidence boundary, links to the synthetic examples, and explicit non-goals. Include the exact sentence required by the test: `No agent runtime, tool executor, provider call, cloud deployment, or traffic proxy is implemented.`

- [ ] **Step 4: Update the existing public docs**

Make these exact conceptual changes:

```text
README.md: capability governance comes before future AI Traffic Governance runtime controls.
docs/ai-traffic-governance.md: runtime governance consumes capabilities only after admission approval.
docs/current-status.md: capability governance becomes the current recommended next slice; runtime AgentOps moves to the following slice.
docs/cloudai-platform-solution-walkthrough.md: add a completed capability-governance row after #26 and name runtime AgentOps as the next planned work.
```

Keep all deferred-runtime statements intact and add no provider-specific claims.

- [ ] **Step 5: Run capability documentation and full API tests**

Run:

```bash
PATH=/Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/yvonne/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test
```

Expected: TypeScript compilation succeeds and all API tests pass, including the documentation assertions.

- [ ] **Step 6: Commit the documentation alignment**

```bash
git add README.md docs/agent-capability-governance.md docs/ai-traffic-governance.md docs/current-status.md docs/cloudai-platform-solution-walkthrough.md providers/aws/app/api/tests/agentCapabilityGovernanceContracts.test.ts
git commit -m "docs(agentops): explain capability governance"
```

### Task 4: Run Regression and Public-Safety Verification

**Files:**
- Modify only if verification finds a defect in a Task 1-3 file.

**Interfaces:**
- Consumes: The completed contract, evaluation, and documentation work from Tasks 1-3.
- Produces: Evidence that the new mock contracts do not regress the local RAG flow or introduce sensitive public content.

- [ ] **Step 1: Run the Python RAG regression suite**

Run:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m unittest discover -s examples/rag-pattern/python/tests
```

Expected: all Python RAG tests pass.

- [ ] **Step 2: Run whitespace and public-safety checks**

Run:

```bash
git diff main...HEAD --check
rg -n "_private|docs/project|credential|secret|confidential|proprietary|customer|production endpoint|internal endpoint" README.md docs shared providers/aws/app/api/tests
```

Expected: `git diff --check` exits `0`; the wording scan has no inappropriate matches in the new capability-governance files, or any intentional documentation match is reviewed and rewritten.

- [ ] **Step 3: Review the complete diff and request a second pass**

Run:

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: the diff contains only the scoped capability-governance contracts, fixtures, tests, evaluation fixture, documentation, and planning artifacts.

- [ ] **Step 4: Commit only verification fixes, if any**

```bash
git add README.md docs/agent-capability-governance.md docs/ai-traffic-governance.md docs/current-status.md docs/cloudai-platform-solution-walkthrough.md shared/schemas/agent-capability-governance shared/examples/agent-capability-governance providers/aws/app/api/src/evals/mockGatewayEvals.ts providers/aws/app/api/tests/agentCapabilityGovernanceContracts.test.ts providers/aws/app/api/tests/mockGatewayEvals.test.ts shared/examples/mock-genai-api/eval-result.mock.json
git commit -m "test(agentops): complete capability governance verification"
```
