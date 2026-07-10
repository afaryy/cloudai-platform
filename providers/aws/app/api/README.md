# Mock GenAI API

This package is the P1 mock GenAI / LLM Gateway API for the CloudAI platform reference implementation.

It runs in mock mode only. It returns synthetic responses and does not call Amazon Bedrock or deploy cloud resources.

## Endpoints

- `GET /health`: returns service health and mock mode status.
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

## API Contract Schemas

Lightweight JSON schemas document the current mock API request, response, and error shapes:

- `shared/schemas/mock-genai-api/chat-request.schema.json`
- `shared/schemas/mock-genai-api/chat-response.schema.json`
- `shared/schemas/mock-genai-api/error-response.schema.json`

These schemas are documentation and test fixtures in this phase. Runtime schema validation can be added later if the API needs stricter client compatibility checks.

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

## Boundaries

- Mock mode is the default and only mode in this package.
- The Bedrock client is represented by an interface so a real provider adapter can be added later.
- No AWS SDK dependency is included in this phase.
- No cloud account setup or deployment configuration is required.
