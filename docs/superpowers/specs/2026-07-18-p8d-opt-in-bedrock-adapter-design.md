# P8d Opt-In Bedrock Gateway Adapter Design

## Goal

Add an opt-in Amazon Bedrock implementation behind the existing GenAI gateway's `BedrockClient` interface. The public `POST /chat` route remains the integration point. Mock mode remains the default, and normal development and CI never obtain AWS credentials or invoke Bedrock.

## Scope and boundaries

- `MODEL_PROVIDER` selects the client at server startup. Omitted or `mock` uses the existing `MockBedrockClient`; only the exact value `bedrock` selects the real adapter.
- Bedrock mode requires `BEDROCK_MODEL_ID` and uses that configured inference-profile identifier as the only permitted model. A supplied `modelName` must match it; arbitrary client model routing is rejected.
- The adapter sends exactly one non-streaming `Converse` request per accepted chat request, with no tools, retrieval, agents, retries, streaming, fallback model, or automatic re-invocation.
- The Bedrock request uses the existing prompt validation and input-token budget, `temperature: 0`, and an eight-token output ceiling. It does not add a system prompt.
- The adapter returns the existing normalized `ChatResponse` shape. It surfaces provider-reported input and output token counts in a new non-sensitive usage block and does not invent or expose a provider cost. The existing synthetic estimates remain mock-only.
- Request logs retain route, status, duration, configured model name, and safe token metadata. They never include prompt text, response text, error bodies, credentials, ARNs, account identifiers, or request IDs from AWS.

## Components

1. **Provider configuration and client selection**
   - Add a small configuration boundary that validates `MODEL_PROVIDER` and, in Bedrock mode, `BEDROCK_MODEL_ID` and `AWS_REGION`.
   - Construct `MockBedrockClient` by default and `AwsBedrockClient` only after Bedrock configuration passes.
   - Keep dependency injection on `createMockApiServer` so tests can pass a fake client without environment changes or AWS SDK calls.

2. **AWS Bedrock adapter**
   - Add the AWS Bedrock Runtime SDK dependency and an `AwsBedrockClient` that implements the current `BedrockClient` interface.
   - Use an injected minimal Converse invoker interface so unit tests assert the exact command shape without contacting AWS.
   - Normalize a successful provider response to `ChatResponse`; reject missing text or token-usage fields as a controlled gateway error.
   - Translate provider failures into a generic, sanitized service-unavailable gateway error. The API response and logs do not include provider error strings.

3. **Metadata and contracts**
   - Preserve the current mock metadata fields and values for mock responses.
   - Add optional `usage` metadata with `source` (`synthetic-estimate` or `provider-reported`) and input/output token counts. Add `estimatedCostUsd` only for mock responses, where it remains explicitly synthetic.
   - Update the TypeScript contract, JSON response schema, example fixtures, route tests, and README so mock and Bedrock behavior are unambiguous.

4. **Explicit live adapter checks**
   - Add `pnpm run bedrock:smoke`, which starts the configured gateway client, submits one fixed synthetic marker through `POST /chat`, and prints only `adapter-smoke-passed` or a sanitized category.
   - The command requires `CONFIRM_BEDROCK_ADAPTER_SMOKE=I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL`, `MODEL_PROVIDER=bedrock`, `BEDROCK_MODEL_ID`, `AWS_REGION`, and the caller's explicit standard AWS credential/profile selection. It sets a one-attempt AWS retry policy and deletes temporary response/error files.
   - Add a distinct manually dispatched GitHub workflow for the same adapter smoke command. It requires the same confirmation phrase, `aws-sandbox` approval, and directly assumes the existing dedicated Bedrock smoke role through OIDC. It uses only `AWS_REGION`, `BEDROCK_MODEL_ID`, and `AWS_BEDROCK_SMOKE_ROLE_TO_ASSUME` from the environment. It emits only sanitized pass/failure metadata.

## Testing and verification

- New fake-invoker unit tests assert the `Converse` request is non-streaming, contains only the synthetic prompt message, has `maxTokens: 8` and `temperature: 0`, and never adds tools or retry/fallback behavior.
- Unit tests cover provider selection, missing configuration, unknown provider, model mismatch, success normalization, missing provider output, and sanitized provider failure handling.
- Existing mock route tests continue to prove default behavior and no prompt logging.
- GitHub's ordinary `ci.yml` continues to run only build and unit tests; it must not configure AWS credentials or invoke Bedrock.
- The local and GitHub smoke paths are operator-triggered verification only. They use synthetic input, one non-streaming request, no raw response logging, and no committed credentials, account identifiers, or ARNs.

## Non-goals

- No RAG, knowledge base, vector store, agent, AgentCore, tool use, streaming, persistence, deployment, model fallback, cost calculation, or real-user traffic.
- No Terraform change or broader AWS permission. P8d reuses the existing P8c direct Bedrock smoke role, constrained to the approved inference profile and its allowed foundation-model resources.
