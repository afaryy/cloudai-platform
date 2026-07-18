# P8d Opt-In Bedrock Gateway Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit, guarded Amazon Bedrock implementation behind the existing `/chat` gateway boundary while preserving mock-only defaults and ordinary CI behavior.

**Architecture:** A provider selector constructs either the existing mock client or an AWS Bedrock Converse adapter. The adapter depends on an injectable minimal runtime invoker for deterministic unit tests. A separate local script and manually dispatched GitHub workflow exercise the adapter with one synthetic request only; normal CI runs fake-client tests and never configures AWS credentials.

**Tech Stack:** TypeScript (NodeNext), Node test runner, pnpm, AWS SDK v3 Bedrock Runtime client, GitHub Actions OIDC.

## Global Constraints

- Mock mode is the default; only `MODEL_PROVIDER=bedrock` selects the real adapter.
- Bedrock mode requires `BEDROCK_MODEL_ID` and `AWS_REGION`; the configured model is the only model allowed.
- Each accepted Bedrock request is one non-streaming Converse request with `temperature: 0`, `maxTokens: 8`, no tools, no retrieval, no agents, no fallback, and no automatic retries.
- Never log or commit prompts, responses, AWS request IDs, error bodies, credentials, ARNs, or account identifiers.
- Existing mock response behavior and ordinary `ci.yml` remain mock-only.
- Live tests use only synthetic input and require `I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL` confirmation.

---

## File structure

- `providers/aws/app/api/src/clients/awsBedrockClient.ts` — production Bedrock adapter and injectable Converse boundary.
- `providers/aws/app/api/src/clients/providerClient.ts` — validates environment and chooses mock or Bedrock client.
- `providers/aws/app/api/src/scripts/bedrockAdapterSmoke.ts` — explicit local one-call adapter verifier with sanitized output.
- `providers/aws/app/api/src/types.ts` — provider mode and normalized safe usage metadata.
- `providers/aws/app/api/src/server.ts` — starts a selected provider client but retains mock default and injection seam.
- `providers/aws/app/api/src/lib/requestLogger.ts` — keeps logging metadata-only for both provider modes.
- `providers/aws/app/api/tests/awsBedrockClient.test.ts` — fake-invoker tests for request shape and response/failure normalization.
- `providers/aws/app/api/tests/providerClient.test.ts` — selector and environment validation tests.
- `providers/aws/app/api/tests/chat.test.ts` — regression coverage for mock default and log safety.
- `providers/aws/app/api/package.json`, `pnpm-lock.yaml` — SDK and smoke script.
- `shared/schemas/mock-genai-api/chat-response.schema.json`, `shared/examples/mock-genai-api/*`, `providers/aws/app/api/README.md` — updated normalized response and operator documentation.
- `.github/workflows/bedrock-gateway-adapter.yml` — protected OIDC-only manual adapter smoke workflow.
- `.github/workflows/terraform-tests.yaml` — static guard that workflow remains manual, confirmation-gated, synthetic-only, and direct-role scoped.

## Task 1: Define provider-safe response metadata and configuration

**Files:**
- Modify: `providers/aws/app/api/src/types.ts`
- Create: `providers/aws/app/api/src/clients/providerClient.ts`
- Test: `providers/aws/app/api/tests/providerClient.test.ts`

**Interfaces:**
- Produces `ModelProvider = "mock" | "bedrock"`.
- Produces `ProviderClientConfig = { provider: ModelProvider; modelId?: string; region?: string }`.
- Produces `readProviderClientConfig(env: NodeJS.ProcessEnv): ProviderClientConfig`.
- `ChatMetadata.usage` is optional and has `{ source: "synthetic-estimate" | "provider-reported"; inputTokens: number; outputTokens: number }`.

- [ ] **Step 1: Write failing selector tests**

```ts
test("uses mock mode when MODEL_PROVIDER is omitted", () => {
  assert.deepEqual(readProviderClientConfig({}), { provider: "mock" });
});

test("requires Bedrock model and region only in Bedrock mode", () => {
  assert.throws(
    () => readProviderClientConfig({ MODEL_PROVIDER: "bedrock" }),
    { code: "bedrock_configuration_invalid" }
  );
});

test("rejects an unknown provider", () => {
  assert.throws(
    () => readProviderClientConfig({ MODEL_PROVIDER: "other" }),
    { code: "model_provider_invalid" }
  );
});
```

- [ ] **Step 2: Run selector tests and verify RED**

Run: `pnpm run build && node --test dist/tests/providerClient.test.js`

Expected: TypeScript fails because `providerClient.ts` and its exported selector do not exist.

- [ ] **Step 3: Implement the minimal types and configuration selector**

```ts
export function readProviderClientConfig(env: NodeJS.ProcessEnv): ProviderClientConfig {
  const provider = env.MODEL_PROVIDER ?? "mock";
  if (provider === "mock") return { provider };
  if (provider !== "bedrock") throw new HttpError(500, "Model provider configuration is invalid.", "model_provider_invalid");
  const modelId = env.BEDROCK_MODEL_ID?.trim();
  const region = env.AWS_REGION?.trim();
  if (!modelId || !region) throw new HttpError(500, "Bedrock provider configuration is incomplete.", "bedrock_configuration_invalid");
  return { provider, modelId, region };
}
```

Add the optional `usage` block to `ChatMetadata`; mock metadata continues to retain its existing estimate fields and uses `source: "synthetic-estimate"`.

- [ ] **Step 4: Run selector tests and verify GREEN**

Run: `pnpm run build && node --test dist/tests/providerClient.test.js`

Expected: all selector tests pass.

- [ ] **Step 5: Commit the provider configuration boundary**

```bash
git add providers/aws/app/api/src/types.ts providers/aws/app/api/src/clients/providerClient.ts providers/aws/app/api/tests/providerClient.test.ts
git commit -m "feat: add gateway provider selection"
```

## Task 2: Add the fake-testable AWS Bedrock Converse adapter

**Files:**
- Modify: `providers/aws/app/api/src/clients/bedrockClient.ts`
- Create: `providers/aws/app/api/src/clients/awsBedrockClient.ts`
- Test: `providers/aws/app/api/tests/awsBedrockClient.test.ts`
- Modify: `providers/aws/app/api/package.json`, `providers/aws/app/api/pnpm-lock.yaml`

**Interfaces:**
- Produces `AwsBedrockClient implements BedrockClient`.
- Produces `BedrockRuntimeInvoker` with `converse(input)` and a factory that wraps `BedrockRuntimeClient.send(new ConverseCommand(input))`.
- Constructor: `new AwsBedrockClient({ modelId, invoker })`.
- Consumes the normalized `ChatRequest` and returns `ChatResponse` with `metadata.usage.source === "provider-reported"`.

- [ ] **Step 1: Write failing adapter tests with a fake invoker**

```ts
test("sends one bounded non-streaming Converse request", async () => {
  const invoker = new CapturingInvoker(successfulConverseResponse());
  const client = new AwsBedrockClient({ modelId: "configured-profile", invoker });

  await client.chat({ prompt: "synthetic-marker", modelName: "configured-profile" });

  assert.deepEqual(invoker.input, {
    modelId: "configured-profile",
    messages: [{ role: "user", content: [{ text: "synthetic-marker" }] }],
    inferenceConfig: { maxTokens: 8, temperature: 0 }
  });
});

test("rejects a request for a different model before invoking Bedrock", async () => {
  const invoker = new CapturingInvoker(successfulConverseResponse());
  const client = new AwsBedrockClient({ modelId: "configured-profile", invoker });

  await assert.rejects(
    () => client.chat({ prompt: "synthetic-marker", modelName: "another-model" }),
    { code: "unsupported_model" }
  );
  assert.equal(invoker.calls, 0);
});

test("does not expose provider error text", async () => {
  const client = new AwsBedrockClient({ modelId: "configured-profile", invoker: new FailingInvoker("secret provider detail") });
  await assert.rejects(() => client.chat({ prompt: "synthetic-marker", modelName: "configured-profile" }), {
    code: "bedrock_unavailable",
    message: "Bedrock provider is currently unavailable."
  });
});
```

- [ ] **Step 2: Run adapter tests and verify RED**

Run: `pnpm run build && node --test dist/tests/awsBedrockClient.test.js`

Expected: TypeScript fails because `AwsBedrockClient` does not exist.

- [ ] **Step 3: Add the AWS SDK and implement the minimum adapter**

Run: `pnpm add @aws-sdk/client-bedrock-runtime`

Implement a runtime factory using the SDK. The adapter must make exactly one `converse` call, extract the first text content block and `usage.inputTokens` / `usage.outputTokens`, construct its own UUID, and return only normalized data. Missing text or usage raises a sanitized `HttpError(502, ..., "bedrock_response_invalid")`. Any runtime exception maps to `HttpError(503, "Bedrock provider is currently unavailable.", "bedrock_unavailable")` without using the caught message.

- [ ] **Step 4: Run adapter tests and verify GREEN**

Run: `pnpm run build && node --test dist/tests/awsBedrockClient.test.js`

Expected: all adapter tests pass; the fake invoker has one call only and no request shape includes tools, streaming, retry, or fallback fields.

- [ ] **Step 5: Commit the adapter**

```bash
git add providers/aws/app/api/src/clients/bedrockClient.ts providers/aws/app/api/src/clients/awsBedrockClient.ts providers/aws/app/api/tests/awsBedrockClient.test.ts providers/aws/app/api/package.json providers/aws/app/api/pnpm-lock.yaml
git commit -m "feat: add bounded Bedrock gateway adapter"
```

## Task 3: Wire the API server and preserve mock default behavior

**Files:**
- Modify: `providers/aws/app/api/src/server.ts`
- Modify: `providers/aws/app/api/src/lib/requestLogger.ts`
- Modify: `providers/aws/app/api/src/lib/metadata.ts`
- Modify: `providers/aws/app/api/tests/chat.test.ts`

**Interfaces:**
- `createMockApiServer` continues to default to `MockBedrockClient` for existing callers.
- `createConfiguredApiServer(env, logger)` returns a server that uses `readProviderClientConfig` and provider construction.
- `RequestLogEvent.mode` becomes `"mock" | "bedrock"`; it contains only metadata, never prompt or response content.

- [ ] **Step 1: Write failing server tests**

```ts
test("configured server remains mock when no provider is configured", async () => {
  const server = createConfiguredApiServer({}, logger);
  // POST /chat returns the existing mock response and metadata.usage.source is synthetic-estimate.
});

test("request log omits prompt and response in Bedrock mode", async () => {
  const server = createMockApiServer(fakeBedrockClient, logger, "bedrock");
  // POST /chat succeeds; logged event has mode=bedrock and has neither prompt nor response keys.
});
```

- [ ] **Step 2: Run the focused route tests and verify RED**

Run: `pnpm run build && node --test dist/tests/chat.test.js`

Expected: TypeScript fails because `createConfiguredApiServer` and the mode-aware server signature do not exist.

- [ ] **Step 3: Implement provider-aware server creation and log metadata**

Keep all existing routing and error behavior. Add `createConfiguredApiServer` that chooses the provider client once at startup. Add a `mode` parameter with default `"mock"` to the injectable server factory. Pass only mode, model, token metadata, status, duration, and timestamp to logs. Extend mock metadata with a synthetic usage block; use Bedrock provider-reported usage unchanged.

- [ ] **Step 4: Run focused route tests and verify GREEN**

Run: `pnpm run build && node --test dist/tests/chat.test.js`

Expected: mock behavior remains green and both new mode/log tests pass.

- [ ] **Step 5: Commit the server wiring**

```bash
git add providers/aws/app/api/src/server.ts providers/aws/app/api/src/lib/requestLogger.ts providers/aws/app/api/src/lib/metadata.ts providers/aws/app/api/tests/chat.test.ts
git commit -m "feat: wire configured Bedrock gateway client"
```

## Task 4: Update contracts and operator documentation

**Files:**
- Modify: `shared/schemas/mock-genai-api/chat-response.schema.json`
- Modify: `shared/examples/mock-genai-api/chat-response.mock.json`
- Modify: `providers/aws/app/api/tests/schemaContracts.test.ts`
- Modify: `providers/aws/app/api/tests/fixtureContracts.test.ts`
- Modify: `providers/aws/app/api/README.md`

**Interfaces:**
- Mock response remains valid with its existing estimate fields and new `usage` block.
- Bedrock response schema permits an arbitrary configured model ID, provider-reported usage, and no synthetic-cost fields.

- [ ] **Step 1: Write failing schema and fixture tests**

```ts
test("chat response schema accepts provider-reported usage without synthetic cost", () => {
  assert.equal(validateChatResponse({
    response: "synthetic response",
    metadata: {
      requestId: "synthetic-id",
      modelName: "configured-profile",
      usage: { source: "provider-reported", inputTokens: 2, outputTokens: 3 },
      timestamp: "2026-07-19T00:00:00.000Z"
    }
  }), true);
});
```

- [ ] **Step 2: Run schema tests and verify RED**

Run: `pnpm run build && node --test dist/tests/schemaContracts.test.js dist/tests/fixtureContracts.test.js`

Expected: the provider-reported metadata shape is rejected by the existing mock-only schema.

- [ ] **Step 3: Update schema, fixtures, and README**

Use a schema `oneOf` for mock and Bedrock metadata variants. State clearly that `estimated*` fields and `estimatedCostUsd` are synthetic mock-only values, while Bedrock reports only provider token counts. Document default mock startup, the exact Bedrock environment variables, confirmation phrase, synthetic-only constraint, and no-response-logging boundary.

- [ ] **Step 4: Run schema tests and verify GREEN**

Run: `pnpm run build && node --test dist/tests/schemaContracts.test.js dist/tests/fixtureContracts.test.js`

Expected: all existing fixtures remain valid and the new provider-reported response case is valid.

- [ ] **Step 5: Commit contracts and docs**

```bash
git add shared/schemas/mock-genai-api/chat-response.schema.json shared/examples/mock-genai-api/chat-response.mock.json providers/aws/app/api/tests/schemaContracts.test.ts providers/aws/app/api/tests/fixtureContracts.test.ts providers/aws/app/api/README.md
git commit -m "docs: describe Bedrock gateway response boundary"
```

## Task 5: Add explicitly confirmed local and GitHub adapter smoke paths

**Files:**
- Create: `providers/aws/app/api/src/scripts/bedrockAdapterSmoke.ts`
- Modify: `providers/aws/app/api/package.json`
- Create: `.github/workflows/bedrock-gateway-adapter.yml`
- Modify: `.github/workflows/terraform-tests.yaml`
- Test: `providers/aws/app/api/tests/bedrockAdapterSmoke.test.ts`

**Interfaces:**
- `pnpm run bedrock:smoke` requires `CONFIRM_BEDROCK_ADAPTER_SMOKE=I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL` and emits only `adapter-smoke-passed` or a sanitized failure category.
- GitHub workflow is `workflow_dispatch` only, uses `environment: aws-sandbox`, and directly assumes `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME`.

- [ ] **Step 1: Write failing local-smoke guard tests**

```ts
test("adapter smoke rejects a missing confirmation before a provider call", async () => {
  const result = await runAdapterSmoke({ MODEL_PROVIDER: "bedrock", BEDROCK_MODEL_ID: "profile", AWS_REGION: "region" }, fakeServerFactory);
  assert.equal(result, "confirmation-required");
  assert.equal(fakeServerFactory.calls, 0);
});
```

- [ ] **Step 2: Run smoke guard tests and verify RED**

Run: `pnpm run build && node --test dist/tests/bedrockAdapterSmoke.test.js`

Expected: TypeScript fails because the smoke runner does not exist.

- [ ] **Step 3: Implement local script and manual workflow**

Implement a testable smoke runner that checks confirmation and required provider configuration before constructing an adapter. It uses one fixed marker derived from the local process or GitHub run ID, starts the configured server with a no-op logger, sends one POST `/chat`, validates only the normalized metadata shape, and emits no body. Configure `AWS_MAX_ATTEMPTS=1` before the SDK client is constructed.

Create the GitHub workflow with `contents: read` and `id-token: write`; it must configure only the dedicated Bedrock smoke role and run the script with `MODEL_PROVIDER=bedrock`. Require `confirm_adapter_smoke=I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL`. It must not use Terraform credentials, invoke Terraform, upload responses, or print environment values.

Extend static workflow checks to require manual dispatch, the confirmation phrase, direct smoke-role assumption, `MODEL_PROVIDER=bedrock`, `AWS_MAX_ATTEMPTS=1`, and absence of Terraform commands, raw AWS CLI runtime calls, `bedrock:InvokeModel`, or `iam:PassRole`.

- [ ] **Step 4: Run smoke guard and static workflow tests and verify GREEN**

Run: `pnpm run build && node --test dist/tests/bedrockAdapterSmoke.test.js && ruby -e 'require "yaml"; YAML.safe_load_file(".github/workflows/bedrock-gateway-adapter.yml")' && ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb`

Expected: local guard tests pass, shell syntax passes, and bootstrap boundary tests remain green. Run the repository's existing Terraform workflow static test command after adding the new guard.

- [ ] **Step 5: Commit the opt-in smoke paths**

```bash
git add providers/aws/app/api/src/scripts/bedrockAdapterSmoke.ts providers/aws/app/api/tests/bedrockAdapterSmoke.test.ts providers/aws/app/api/package.json .github/workflows/bedrock-gateway-adapter.yml .github/workflows/terraform-tests.yaml
git commit -m "feat: add opt-in Bedrock adapter smoke checks"
```

## Task 6: Full verification and PR preparation

**Files:**
- Modify if needed: files identified by verification failures only.

- [ ] **Step 1: Run formatting and API verification**

Run:

```bash
pnpm --dir providers/aws/app/api run build
pnpm --dir providers/aws/app/api test
```

Expected: TypeScript compiles and all API tests pass without AWS credentials or network Bedrock calls.

- [ ] **Step 2: Run repository boundary checks**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform fmt -check -recursive
terraform -chdir=providers/aws/infra/terraform init -backend=false
terraform -chdir=providers/aws/infra/terraform validate
terraform -chdir=providers/aws/infra/terraform test
ruby providers/aws/infra/bootstrap/test_github_oidc_terraform_backend.rb
```

Expected: Terraform style, validation, and tests pass; bootstrap tests pass. No apply, destroy, or Bedrock runtime call occurs.

- [ ] **Step 3: Verify repository hygiene**

Run:

```bash
git diff main...HEAD --check
git status --short
rg -n --hidden --glob '!**/.git/**' 'arn:aws:bedrock:.*:[0-9]{12}:|[A-Za-z0-9]{20,}' providers/aws/app/api .github/workflows/bedrock-gateway-adapter.yml docs/superpowers || true
```

Expected: no whitespace errors; no untracked dependency/cache artifacts; no credentials, account IDs, or committed Bedrock resource ARNs.

- [ ] **Step 4: Commit any verification-only correction**

Commit only if verification requires a correction, staging each corrected file by its exact path, for example:

```bash
git add providers/aws/app/api/src/clients/awsBedrockClient.ts providers/aws/app/api/tests/awsBedrockClient.test.ts
git commit -m "test: correct Bedrock adapter boundary"
```
