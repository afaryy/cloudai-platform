import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { MockBedrockClient } from "./clients/mockBedrockClient.js";
import type { BedrockClient } from "./clients/bedrockClient.js";
import { HttpError } from "./lib/errors.js";
import { getHealth } from "./routes/health.js";
import { postChat } from "./routes/chat.js";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

export function createMockApiServer(client: BedrockClient = new MockBedrockClient()) {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        writeJson(response, 200, getHealth());
        return;
      }

      if (request.method === "POST" && request.url === "/chat") {
        const body = await readJsonBody(request);
        const chatResponse = await postChat(client, body);
        writeJson(response, 200, chatResponse);
        return;
      }

      writeJson(response, 404, {
        error: {
          code: "not_found",
          message: "Route not found."
        }
      });
    } catch (error) {
      writeError(response, error);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  createMockApiServer().listen(port, () => {
    console.log(`Mock GenAI API listening on http://localhost:${port}`);
  });
}
