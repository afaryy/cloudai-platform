import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { MockBedrockClient } from "./clients/mockBedrockClient.js";
import type { BedrockClient } from "./clients/bedrockClient.js";
import { AwsBedrockClient, createBedrockRuntimeInvoker } from "./clients/awsBedrockClient.js";
import { readProviderClientConfig, type ModelProvider } from "./clients/providerClient.js";
import { HttpError } from "./lib/errors.js";
import {
  buildRequestLogEvent,
  consoleRequestLogger,
  type RequestLogger
} from "./lib/requestLogger.js";
import { getHealth } from "./routes/health.js";
import { postChat } from "./routes/chat.js";
import { getRagArtifacts, getRagStatus } from "./routes/ragMetadata.js";
import { postRagQuery } from "./routes/ragQuery.js";
import { postAgentActionAuthorisation } from "./routes/agentActionAuthorisation.js";
import { postGuardrailAssessment } from "./routes/guardrailAssessment.js";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

export function createMockApiServer(
  client: BedrockClient = new MockBedrockClient(),
  logger: RequestLogger = consoleRequestLogger,
  mode: ModelProvider = "mock"
) {
  return createServer(async (request, response) => {
    const startedAt = Date.now();
    const method = request.method ?? "UNKNOWN";
    const route = getRoutePath(request);

    try {
      if (method === "GET" && route === "/health") {
        const healthResponse = getHealth();
        writeJson(response, 200, healthResponse);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: randomUUID(),
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: healthResponse.timestamp
        }, mode));
        return;
      }

      if (method === "GET" && route === "/rag/status") {
        const ragStatusResponse = getRagStatus();
        writeJson(response, 200, ragStatusResponse);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: randomUUID(),
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: new Date().toISOString()
        }, mode));
        return;
      }

      if (method === "GET" && route === "/rag/artifacts") {
        const ragArtifactsResponse = getRagArtifacts();
        writeJson(response, 200, ragArtifactsResponse);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: randomUUID(),
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: new Date().toISOString()
        }, mode));
        return;
      }

      if (method === "POST" && route === "/rag/query") {
        const body = await readJsonBody(request);
        const ragQueryResponse = postRagQuery(body);
        writeJson(response, 200, ragQueryResponse);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: ragQueryResponse.audit.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: ragQueryResponse.audit.evaluatedAt
        }, mode));
        return;
      }

      if (method === "POST" && route === "/agent-actions/authorize") {
        const body = await readJsonBody(request);
        const decision = postAgentActionAuthorisation(body);
        writeJson(response, 200, decision);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: decision.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: decision.audit.recordedAt
        }, mode));
        return;
      }

      if (method === "POST" && route === "/guardrails/assess") {
        const body = await readJsonBody(request);
        const verdict = postGuardrailAssessment(body);
        writeJson(response, 200, verdict);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: verdict.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: verdict.audit.recordedAt
        }, mode));
        return;
      }

      if (method === "POST" && route === "/chat") {
        const body = await readJsonBody(request);
        const chatResponse = await postChat(client, body);
        writeJson(response, 200, chatResponse);
        writeRequestLog(logger, buildRequestLogEvent({
          requestId: chatResponse.metadata.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: chatResponse.metadata.timestamp,
          modelName: chatResponse.metadata.modelName,
          estimatedInputTokens: chatResponse.metadata.estimatedInputTokens,
          estimatedOutputTokens: chatResponse.metadata.estimatedOutputTokens,
          estimatedCostUsd: chatResponse.metadata.estimatedCostUsd,
          inputTokens: chatResponse.metadata.usage?.inputTokens,
          outputTokens: chatResponse.metadata.usage?.outputTokens
        }, mode));
        return;
      }

      writeJson(response, 404, {
        error: {
          code: "not_found",
          message: "Route not found."
        }
      });
      writeRequestLog(logger, buildRequestLogEvent({
        requestId: randomUUID(),
        method,
        route,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        errorCode: "not_found"
      }, mode));
    } catch (error) {
      writeError(response, error);
      writeRequestLog(logger, buildRequestLogEvent({
        requestId: randomUUID(),
        method,
        route,
        statusCode: getErrorStatusCode(error),
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        errorCode: getErrorCode(error)
      }, mode));
    }
  });
}

export function createConfiguredApiServer(
  env: NodeJS.ProcessEnv = process.env,
  logger: RequestLogger = consoleRequestLogger
) {
  const config = readProviderClientConfig(env);
  if (config.provider === "mock") {
    return createMockApiServer(new MockBedrockClient(), logger, "mock");
  }

  return createMockApiServer(
    new AwsBedrockClient({
      modelId: config.modelId,
      invoker: createBedrockRuntimeInvoker(config.region)
    }),
    logger,
    "bedrock"
  );
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.byteLength;

    if (receivedBytes > MAX_BODY_BYTES) {
      throw new HttpError(413, "Request body is too large.", "body_too_large");
    }

    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (rawBody.trim().length === 0) {
    throw new HttpError(400, "Request body must not be empty.", "empty_body");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.", "invalid_json");
  }
}

function writeError(response: ServerResponse, error: unknown): void {
  if (error instanceof HttpError) {
    writeJson(response, error.statusCode, {
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  writeJson(response, 500, {
    error: {
      code: "unexpected_error",
      message: "Unexpected mock API error."
    }
  });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload, null, 2));
}

function getRoutePath(request: IncomingMessage): string {
  return request.url?.split("?")[0] ?? "/";
}

function getErrorStatusCode(error: unknown): number {
  return error instanceof HttpError ? error.statusCode : 500;
}

function getErrorCode(error: unknown): string {
  return error instanceof HttpError ? error.code : "unexpected_error";
}

function writeRequestLog(logger: RequestLogger, event: ReturnType<typeof buildRequestLogEvent>): void {
  try {
    logger.info(event);
  } catch {
    // Logging should never change mock API response behavior.
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  createConfiguredApiServer().listen(port, () => {
    console.log(`GenAI API listening on http://localhost:${port}`);
  });
}
