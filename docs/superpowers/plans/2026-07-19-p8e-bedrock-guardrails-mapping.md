# P8e Bedrock Guardrails Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static, tested map from synthetic GaaS outcomes to Bedrock Guardrails concepts without creating a live AWS control.

**Architecture:** A JSON Schema and metadata-only example sit beside the existing GaaS contract. The existing Node.js contract test validates the artifact and its explicit non-live boundary. Documentation explains concepts, placement, evidence, and deferrals; the API route remains unchanged.

**Tech Stack:** JSON Schema draft 2020-12, JSON fixtures, Node.js test runner, TypeScript, Markdown.

## Global Constraints

- No Terraform, CloudFormation, AWS IAM, OIDC, GitHub environment, or workflow changes.
- No Bedrock, `ApplyGuardrail`, or any AWS API call.
- No raw prompts, responses, documents, tool payloads, credentials, personal information, provider IDs, account IDs, ARNs, or model IDs.
- The artifact must be conceptual, metadata-only, non-live, and not a provider-enforcement claim.
- `POST /guardrails/assess` and its deterministic local verdicts must not change.
- Verify with `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

## File Structure

| File | Responsibility |
|---|---|
| `shared/schemas/guardrails-as-a-service/bedrock-guardrails-mapping.schema.json` | Defines the static mapping structure. |
| `shared/examples/guardrails-as-a-service/bedrock-guardrails-mapping.mock.json` | Provides the synthetic mapping example. |
| `providers/aws/app/api/tests/guardrailsContracts.test.ts` | Validates schema, example, and safety boundary. |
| `docs/guardrails-as-a-service.md` | Explains mapping, placement, evidence, and deferrals. |
| `docs/p8-real-bedrock-sandbox-design.md` | Records P8e as completed static mapping. |
| `docs/current-status.md` and `README.md` | Keep public project status accurate. |

## Task 1: Create and Test the Static Contract

**Files:**
- Create: `shared/schemas/guardrails-as-a-service/bedrock-guardrails-mapping.schema.json`
- Create: `shared/examples/guardrails-as-a-service/bedrock-guardrails-mapping.mock.json`
- Modify: `providers/aws/app/api/tests/guardrailsContracts.test.ts`

**Interfaces:**
- Consumes existing synthetic signals, verdicts, and reason codes in `providers/aws/app/api/src/types.ts`.
- Produces an artifact with `mappingVersion`, `scope`, `mappings`, `deferredConcepts`, and `evidenceBoundary`.
- Preserves the current API route and every existing GaaS fixture assertion.

- [ ] **Step 1: Write the failing test**

Read the new schema and example alongside existing GaaS fixtures. Add these assertions:

```ts
assertMatchesSchema(mapping, mappingSchema);
assert.deepEqual(mapping.mappings.map((entry: any) => entry.verdict), ["deny", "redact", "approval-required", "allow"]);
assert.deepEqual(mapping.scope, {
  conceptual: true,
  metadataOnly: true,
  liveProviderConfiguration: false,
  modelInvocation: false,
  rawContentHandling: false,
  providerEnforcementClaim: false
});
assert.deepEqual(mapping.deferredConcepts.map((entry: any) => entry.concept), ["denied-topics", "word-filters", "contextual-grounding-checks", "provider-traces"]);
assert.equal(mapping.mappings.find((entry: any) => entry.verdict === "approval-required").bedrockConcept, "external-human-approval-control");
```

- [ ] **Step 2: Run the test to verify red**

Run `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

Expected: FAIL because the P8e schema and example files do not exist.

- [ ] **Step 3: Add the minimal JSON Schema**

Use Draft 2020-12 and `additionalProperties: false` on every object. Require:

```json
{"mappingVersion":"string","scope":"object","mappings":"array","deferredConcepts":"array","evidenceBoundary":"object"}
```

Require `scope` booleans: `conceptual`, `metadataOnly`, `liveProviderConfiguration`, `modelInvocation`, `rawContentHandling`, and `providerEnforcementClaim`.

Constrain the mapping vocabulary:

```json
{"syntheticSignals":["prompt-injection","jailbreak-attempt","pii-detected","high-risk-action","none"],"verdict":["allow","redact","deny","approval-required"],"reasonCode":["no_synthetic_risk_signal","synthetic_pii_signal","synthetic_prompt_injection_signal","synthetic_high_risk_action_signal"],"bedrockConcept":["content-filter-prompt-attack","sensitive-information-filter","external-human-approval-control","no-intervention-inferred"],"futurePlacement":["pre-model-input","input-or-output","pre-tool-action","not-applicable"]}
```

Allow deferred concepts only for `denied-topics`, `word-filters`, `contextual-grounding-checks`, and `provider-traces`. Require `permitted` and `prohibited` string arrays in `evidenceBoundary`.

- [ ] **Step 4: Add the metadata-only example**

Use this exact scope:

```json
{"conceptual":true,"metadataOnly":true,"liveProviderConfiguration":false,"modelInvocation":false,"rawContentHandling":false,"providerEnforcementClaim":false}
```

Add these mapping outcomes in order:

```json
[{"syntheticSignals":["prompt-injection","jailbreak-attempt"],"verdict":"deny","reasonCode":"synthetic_prompt_injection_signal","bedrockConcept":"content-filter-prompt-attack","futurePlacement":"pre-model-input"},{"syntheticSignals":["pii-detected"],"verdict":"redact","reasonCode":"synthetic_pii_signal","bedrockConcept":"sensitive-information-filter","futurePlacement":"input-or-output"},{"syntheticSignals":["high-risk-action"],"verdict":"approval-required","reasonCode":"synthetic_high_risk_action_signal","bedrockConcept":"external-human-approval-control","futurePlacement":"pre-tool-action"},{"syntheticSignals":["none"],"verdict":"allow","reasonCode":"no_synthetic_risk_signal","bedrockConcept":"no-intervention-inferred","futurePlacement":"not-applicable"}]
```

Add deferred concepts in the exact order asserted in Step 1. Permit only synthetic correlation metadata. Prohibit raw content, provider traces, provider IDs, account IDs, ARNs, model IDs, and provider-enforcement claims.

- [ ] **Step 5: Run the test to verify green**

Run `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

Expected: PASS with no AWS credentials, network call, or provider output.

- [ ] **Step 6: Commit the contract**

Run `git add shared/schemas/guardrails-as-a-service/bedrock-guardrails-mapping.schema.json shared/examples/guardrails-as-a-service/bedrock-guardrails-mapping.mock.json providers/aws/app/api/tests/guardrailsContracts.test.ts`.

Run `git commit -m "feat: map mock guardrails to Bedrock concepts"`.

## Task 2: Document Placement and Deferrals

**Files:**
- Modify: `docs/guardrails-as-a-service.md`
- Modify: `docs/p8-real-bedrock-sandbox-design.md`
- Modify: `docs/current-status.md`
- Modify: `README.md`

**Interfaces:**
- Consumes the Task 1 vocabulary and non-live boundary.
- Produces accurate reader-facing wording with no provider integration claim.

- [ ] **Step 1: Add the mapping table to GaaS documentation**

Add this table:

```markdown
| GaaS outcome | Bedrock concept | Boundary |
|---|---|---|
| deny for prompt-injection or jailbreak-attempt | Content filter: Prompt Attack | Conceptual pre-model input placement only. |
| redact for pii-detected | Sensitive information filter | Conceptual input/output mask or block placement only. |
| approval-required for high-risk-action | External human approval control | Not a Bedrock Guardrails equivalence. |
| allow for none | No intervention inferred | Not evidence that real content is safe. |
```

List denied topics, word filters, contextual grounding checks, and provider traces as deferred. Explain future placement before a model request, after a model response, and before a tool action; state P8e adds none of those runtime paths.

- [ ] **Step 2: Update P8 design and status**

Mark P8e completed in `docs/p8-real-bedrock-sandbox-design.md` as a static documentation-and-contract mapping. Keep a separate design requirement for real Guardrails configuration, evaluation data, IAM, data handling, retention, cost, and operating ownership.

Add a P8e completed row to `docs/current-status.md` referencing the schema, example, test, and GaaS document. Replace the obsolete statement that P8d must occur before a smoke test because P8c and P8d are complete.

- [ ] **Step 3: Update README**

Describe P8e as complete static mapping and keep future real Bedrock Guardrails or AgentCore work explicitly separate and unconfigured.

- [ ] **Step 4: Verify and commit documentation**

Run `rg -n 'P8e|Bedrock Guardrails|metadata-only|provider enforcement|contextual grounding' README.md docs shared providers/aws/app/api/tests/guardrailsContracts.test.ts`.

Run `git diff --check`.

Run `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

Expected: wording is consistent, diff is clean, mock-only tests pass.

Run `git add docs/guardrails-as-a-service.md docs/p8-real-bedrock-sandbox-design.md docs/current-status.md README.md`.

Run `git commit -m "docs: record Bedrock Guardrails mapping boundary"`.

## Task 3: Final Scope Verification

**Files:**
- Verify all P8e files from Tasks 1 and 2.

**Interfaces:**
- Produces a review-ready branch containing no infrastructure or provider change.

- [ ] **Step 1: Confirm the approved boundary**

Run `git diff main...HEAD --name-only`.

Run `git diff main...HEAD -- providers/aws/infra .github`.

Expected: only P8e specification, static contract, test, and documentation files change; the infrastructure/workflow diff is empty.

- [ ] **Step 2: Run final verification**

Run `corepack pnpm@11.7.0 --dir providers/aws/app/api test`.

Run `git diff --check main...HEAD`.

Run `git status --short`.

Expected: tests pass, diff check is clean, and no generated or sensitive file is staged.

- [ ] **Step 3: Request review**

Summarize the static-only scope, test evidence, and deferred real-Guardrails/AgentCore work. Do not claim Bedrock Guardrails are configured or evaluated.

## Plan Self-Review

- Spec coverage: Task 1 delivers and tests the artifact; Task 2 documents mapping, placement, evidence, and status; Task 3 prevents scope leakage.
- Placeholder scan: no incomplete implementation step remains.
- Type consistency: every signal, verdict, reason code, mapping concept, and deferred concept is explicitly named.
