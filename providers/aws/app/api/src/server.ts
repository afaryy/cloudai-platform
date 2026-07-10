import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { MockBedrockClient } from "./clients/mockBedrockClient.js";
import type { BedrockClient } from "./clients/bedrockClient.js";
import { HttpError } from "./lib/errors.js";
import {
  buildRequestLogEvent,
  consoleRequestLogger,
  type RequestLogger
} from "./lib/requestLogger.js";
import { getHealth } from "./routes/health.js";
import { postChat } from "./routes/chat.js";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

export function createMockApiServer(
  client: BedrockClient = new MockBedrockClient(),
  logger: RequestLogger = consoleRequestLogger
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
        }));
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
          estimatedCostUsd: chatResponse.metadata.estimatedCostUsd
        }));
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
      }));
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
      }));
    }
  });
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
      code: "internal_error",
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
  return error instanceof HttpError ? error.code : "internal_error";
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
  createMockApiServer().listen(port, () => {
    console.log(`Mock GenAI API listening on http://localhost:${port}`);
  });
}
