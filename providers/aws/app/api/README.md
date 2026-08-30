# Mock GenAI API

This package is the GenAI / LLM Gateway API for the CloudAI platform reference implementation.

It starts in mock mode by default. Mock mode returns synthetic responses and does not call Amazon Bedrock or deploy cloud resources. P8d adds a separately confirmed Bedrock adapter for one synthetic smoke request; it is never enabled by ordinary CI.

## Endpoints

- `GET /health`: returns service health and mock mode status.
- `GET /rag/status`: returns local RAG governance workflow status and current boundaries.
- `GET /rag/artifacts`: returns metadata for RAG contracts, sample outputs, and walkthrough documentation.
- `POST /rag/query`: accepts a governed RAG request and returns a synthetic governed RAG response.
- `POST /agent-actions/authorize`: evaluates metadata-only mock AgentOps policy and returns a deterministic authorisation decision.
- `POST /chat`: accepts a prompt and returns a synthetic model response with request metadata.

## Chat Request

```bash
curl -s http://localhost:3000/chat \
  -H "content-type: application/json" \
  -d '{
    "prompt": "Summarize the CloudAI control plane.",
    "modelName": "mock-bedrock-claude"
  }'
```

Request body:

```json
{
  "prompt": "Summarize the CloudAI control plane.",
  "modelName": "mock-bedrock-claude"
}
```

Supported mock models:

- `mock-bedrock-claude`
- `mock-bedrock-titan`

If `modelName` is omitted, the API uses `mock-bedrock-claude`.

## Default Policy Profile

The mock API uses a local policy profile named `default-mock-governed`.

The profile defines:

- default model: `mock-bedrock-claude`
- allowed models: `mock-bedrock-claude`, `mock-bedrock-titan`
- maximum prompt length: `4000` characters
- synthetic input token budget: `80` estimated input tokens

This profile is a small local example of governed model access. It is not connected to identity, persistence, or cloud policy services in this phase.

## API Contract Schemas

Lightweight JSON schemas document the current mock API request, response, and error shapes:

- `shared/schemas/mock-genai-api/chat-request.schema.json`
- `shared/schemas/mock-genai-api/chat-response.schema.json`
- `shared/schemas/mock-genai-api/error-response.schema.json`
- `shared/schemas/rag-governance/rag-status.schema.json`
- `shared/schemas/rag-governance/rag-artifacts.schema.json`
- `shared/schemas/agentops-governance/agent-session.schema.json`
- `shared/schemas/agentops-governance/tool-authorisation-request.schema.json`
- `shared/schemas/agentops-governance/tool-authorisation-decision.schema.json`
- `shared/schemas/agentops-governance/human-approval.schema.json`
- `shared/schemas/agentops-governance/agent-action-audit-event.schema.json`

These schemas are documentation and test fixtures in this phase. Runtime schema validation can be added later if the API needs stricter client compatibility checks.

## RAG Governance Metadata

The mock API exposes read-only metadata for the local RAG governance workflow. These endpoints help connect the TypeScript platform API layer with the Python RAG workflow artifacts through documented contracts.

```bash
curl -s http://localhost:3000/rag/status
curl -s http://localhost:3000/rag/artifacts
```

`GET /rag/status` describes the current workflow and boundaries:

```json
{
  "status": "available",
  "mode": "mock",
  "workflow": "local-rag-governance",
  "summary": "Local metadata endpoint for the synthetic RAG governance workflow and sample artifacts.",
  "artifacts": {
    "requestSchema": "shared/schemas/rag-governance/rag-request.schema.json",
    "responseSchema": "shared/schemas/rag-governance/rag-response.schema.json",
    "chunkExport": "examples/rag-pattern/python/sample_outputs/cloudai-rag-chunks.json",
    "evalDataset": "examples/rag-pattern/python/sample_outputs/cloudai-rag-eval-dataset.json",
    "scoreReport": "examples/rag-pattern/python/sample_outputs/cloudai-rag-score-report.json",
    "walkthrough": "examples/rag-pattern/python/DEMO_WALKTHROUGH.md"
  },
  "boundaries": {
    "embeddings": false,
    "vectorIndex": false,
    "modelCalls": false,
    "cloudDeployment": false,
    "pythonExecutionFromApi": false
  }
}
```

`GET /rag/artifacts` lists the RAG contract and sample artifact paths. The API does not execute Python, create embeddings, build a vector index, call a model, or deploy resources.

## Mock Governed RAG Query

`POST /rag/query` demonstrates the governed RAG API control point using the existing RAG request and response contracts.

```bash
curl -s http://localhost:3000/rag/query \
  -H "content-type: application/json" \
  -d '{
    "requestId": "rag_req_demo_0001",
    "query": "Summarize the CloudAI gateway guardrails from the demo handbook.",
    "dataClassification": "synthetic-public",
    "retrieval": {
      "allowedKnowledgeBases": ["demo-platform-handbook"],
      "maxDocuments": 3,
      "requiredMetadata": [
        "sourceId",
        "sourceTitle",
        "classification",
        "citationUrl",
        "retrievedAt"
      ]
    },
    "governance": {
      "requireCitations": true,
      "allowExternalEgress": false,
      "policyProfile": "rag-demo-governed"
    }
  }'
```

The endpoint returns a deterministic synthetic response with citation metadata, egress decision, and audit evidence. It does not perform retrieval, execute Python, call a model, create embeddings, or use a vector index.

## Mock AgentOps Authorisation

`POST /agent-actions/authorize` is a deterministic, metadata-only policy decision point for the P6a AgentOps demonstration.

```bash
curl -s http://localhost:3000/agent-actions/authorize \
  -H "content-type: application/json" \
  -d @../../../../shared/examples/agentops-governance/agent-action.allowed-read.json
```

The request contract identifies a synthetic agent session, requested tool, action class, least-privilege scope, approval reference, and synthetic budget state. It intentionally rejects `toolInput` and any other undeclared payload fields.

The local policy returns one of `allow`, `deny`, `approval-required`, or `paused` using this fixed order:

1. inactive sessions are paused;
2. exhausted synthetic budgets are denied and reported as paused;
3. tools outside the local allowlist are denied;
4. unapproved `write` or `high-impact` actions require human approval;
5. approved `write` or `high-impact` actions and approved `read` actions are allowed.

This endpoint does not install a skill, call a tool, invoke a model, execute a shell command, contact a provider, persist evidence, or enforce policy outside the local mock response. Its audit fields are synthetic decision evidence only.

## Demo Fixtures

Synthetic demo fixtures are available under `shared/examples/mock-genai-api/`.

They show:

- an allowed chat request
- a mock chat response
- a token budget error response
- a structured request log event without prompt text or request bodies
- a mock eval report
- RAG governance metadata responses
- a governed RAG request and response
- AgentOps authorisation requests for allowed, approval-required, denied-tool, and budget-exhausted paths

The test suite checks these examples against the documented contract shapes so the demo material stays aligned with the mock API.

## Local Mock Evals

The package includes a small local eval harness in `src/evals/mockGatewayEvals.ts`.

The evals check:

- allowed chat request behavior
- token budget blocked-request behavior
- unsupported model policy behavior
- response metadata presence
- request log safety for prompt and request body omission
- governed RAG query citation, egress decision, audit evidence, and no query text echo
- AgentOps policy verdict, budget metadata, audit metadata, and no tool execution

This is a lightweight mock-mode evaluation pattern. It is not a model judge, benchmark suite, or provider-hosted evaluation service.

## Framework-Neutral Agent Evaluation Telemetry

The package also contains a locally contract-tested quality gate for synthetic
agent traces. It accepts OpenTelemetry GenAI scopes under
`opentelemetry.instrumentation.*` and OpenInference scopes under
`openinference.instrumentation.*`, normalizes both conventions, and evaluates
the same fixed prompts and tool trajectories against versioned thresholds.

The five deterministic dimensions are `local.telemetry_compatibility`,
`local.trace_completeness`, `local.tool_trajectory_accuracy`,
`local.behavioural_outcome`, and `local.goal_success`. Every `strict-v1`
threshold is `1.0`, and a missing, malformed, unknown, unsafe, or
below-threshold result fails closed.

Run the gate from the repository root:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api agent-eval:gate -- \
  --output /tmp/agent-evaluation-report.json
```

The required CI path does not call AWS and emits only a metadata-safe
`local-contract` report. The only provider-parity command documented for local
use is validation of the reviewed source contract:

```bash
corepack pnpm@11.7.0 --dir providers/aws/app/api agentcore-eval:provider-parity -- \
  --mode validate
```

It uses local deterministic fakes and makes no AWS call. Stage A
`provider-direct` evidence and the future Stage B `provider-runtime`
Runtime-to-CloudWatch path are not provider, runtime, or production validated.
Protected execution is manual and is documented only in the
[agent evaluation telemetry runbook](../../../../docs/solutions/agent-evaluation-telemetry-runbook.md);
this README intentionally provides no laptop-local AWS invocation.

## Chat Response

The response includes synthetic text plus metadata that later phases can use for cost, audit, and observability patterns.

```json
{
  "response": "Mock CloudAI response: received 36 characters and routed through the mock GenAI gateway.",
  "metadata": {
    "requestId": "synthetic request id",
    "modelName": "mock-bedrock-claude",
    "estimatedInputTokens": 8,
    "estimatedOutputTokens": 24,
    "estimatedCostUsd": 0.000032,
    "timestamp": "2026-07-10T00:00:00.000Z"
  }
}
```

Metadata fields:

| Field | Description |
|---|---|
| `requestId` | Synthetic request identifier for local tracing examples. |
| `modelName` | Mock model selected for the request. |
| `estimatedInputTokens` | Simple word-based input token estimate. |
| `estimatedOutputTokens` | Simple word-based output token estimate. |
| `estimatedCostUsd` | Synthetic token cost estimate for demo FinOps workflows. |
| `timestamp` | ISO timestamp generated when the mock response is created. |

Mock responses also include `metadata.usage` with `source: "synthetic-estimate"`. The estimates and `estimatedCostUsd` are mock-only values.

When the explicit Bedrock adapter is used, the normalized response retains `response`, `requestId`, `modelName`, and `timestamp`, but replaces synthetic estimates with:

```json
{
  "usage": {
    "source": "provider-reported",
    "inputTokens": 2,
    "outputTokens": 3
  }
}
```

Provider-reported token counts are not a cost calculation. The gateway never fabricates a Bedrock cost and never logs response text.

## Health Response

```bash
curl -s http://localhost:3000/health
```

```json
{
  "status": "ok",
  "mode": "mock",
  "service": "mock-genai-api",
  "timestamp": "2026-07-10T00:00:00.000Z"
}
```

## Error Handling

The API returns JSON errors for invalid input.

Example empty prompt response:

```json
{
  "error": {
    "code": "empty_prompt",
    "message": "prompt must not be empty."
  }
}
```

Example token budget response:

```json
{
  "error": {
    "code": "token_budget_exceeded",
    "message": "estimated input tokens exceed the mock budget of 80."
  }
}
```

## Local Token Budget Guardrail

The mock API applies a simple synthetic input token budget before generating a response. The current local limit is `80` estimated input tokens.

This guardrail is intentionally small and demo-oriented. It shows where token-aware policy, rate limiting, and FinOps controls can sit in the GenAI / LLM Gateway without calling real provider services.

## Local Request Logs

The mock API writes one structured JSON log event per request. Logs include routing, status, duration, and metadata for cost and observability examples. They do not include prompt text or request bodies.

Example chat log:

```json
{
  "event": "mock_api_request",
  "mode": "mock",
  "requestId": "synthetic request id",
  "method": "POST",
  "route": "/chat",
  "statusCode": 200,
  "durationMs": 13,
  "timestamp": "2026-07-10T00:00:00.000Z",
  "modelName": "mock-bedrock-claude",
  "estimatedInputTokens": 8,
  "estimatedOutputTokens": 24,
  "estimatedCostUsd": 0.000032
}
```

## Local Run

```bash
pnpm install
pnpm run build
pnpm test
pnpm run dev
```

The default port is `3000`. Set `PORT` to use another local port.

```bash
PORT=3001 pnpm run dev
```

## Opt-In Bedrock Adapter Smoke Check

The default server remains mock-only. Bedrock mode is an explicit operator action and is intended only for a single synthetic verification request through the same `/chat` gateway boundary.

Before a local live check, select your own standard AWS credential/profile through the AWS CLI or SDK credential chain. Do not place credentials in this repository or its configuration files. Then run:

```bash
CONFIRM_BEDROCK_ADAPTER_SMOKE=I_UNDERSTAND_ONE_SYNTHETIC_BEDROCK_CALL \
MODEL_PROVIDER=bedrock \
BEDROCK_MODEL_ID='<approved-inference-profile-id>' \
AWS_REGION=ap-southeast-2 \
pnpm run bedrock:smoke
```

The command performs one non-streaming Bedrock Converse request with `temperature: 0`, `maxTokens: 8`, no tools, retrieval, agents, streaming, fallback, or automatic retry. It sends one synthetic marker and prints only `adapter-smoke-passed` or a sanitized failure category. It does not print prompt text, response text, provider errors, credentials, ARNs, account identifiers, or AWS request IDs.

The protected GitHub equivalent is the manually dispatched `bedrock-gateway-adapter` workflow. It requires the same confirmation phrase, `aws-sandbox` approval, and the dedicated direct Bedrock smoke role through OIDC. It does not use Terraform credentials or run Terraform.

## Boundaries

- Mock mode is the default; `MODEL_PROVIDER=bedrock` is the only real-provider opt-in.
- Bedrock mode requires `BEDROCK_MODEL_ID` and `AWS_REGION`, and accepts only its configured inference-profile identifier.
- The real adapter uses the AWS Bedrock Runtime SDK but does not add RAG, agents, AgentCore, tools, streaming, fallback models, persistence, deployment, or real-user traffic.
- No cloud account setup or deployment configuration is required.
