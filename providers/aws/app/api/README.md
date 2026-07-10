# Mock GenAI API

This package is the P1 mock GenAI / LLM Gateway API for the CloudAI platform reference implementation.

It runs in mock mode only. It returns synthetic responses and does not call Amazon Bedrock or deploy cloud resources.

## Endpoints

- `GET /health`: returns service health and mock mode status.
- `POST /chat`: accepts a prompt and returns a synthetic model response with request metadata.

Example request:

```json
{
  "prompt": "Summarize the CloudAI control plane.",
  "modelName": "mock-bedrock-claude"
}
```

Example response metadata:

```json
{
  "requestId": "synthetic request id",
  "modelName": "mock-bedrock-claude",
  "estimatedInputTokens": 8,
  "estimatedOutputTokens": 24,
  "estimatedCostUsd": 0.000032,
  "timestamp": "2026-07-10T00:00:00.000Z"
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
