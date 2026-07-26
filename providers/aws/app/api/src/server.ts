import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { MockBedrockClient } from "./clients/mockBedrockClient.js";
import type { BedrockClient } from "./clients/bedrockClient.js";
import { AwsBedrockClient, createBedrockRuntimeInvoker } from "./clients/awsBedrockClient.js";
import { readProviderClientConfig, type ModelProvider } from "./clients/providerClient.js";
import { createBedrockPolicyProfile, DEFAULT_POLICY_PROFILE, type MockPolicyProfile } from "./lib/policyProfile.js";
import { HttpError } from "./lib/errors.js";
import {
  buildRequestLogEvent,
  consoleRequestLogger,
  type RequestLogger
} from "./lib/requestLogger.js";
import { createMetricsCollector, type MetricsCollector, type RequestMetricObservation } from "./lib/metrics.js";
import { getHealth } from "./routes/health.js";
import { getMetrics } from "./routes/metrics.js";
import { postChat } from "./routes/chat.js";
import { getRagArtifacts, getRagStatus } from "./routes/ragMetadata.js";
import { postRagQuery } from "./routes/ragQuery.js";
import { postAgentActionAuthorisation } from "./routes/agentActionAuthorisation.js";
import { postAgentActionReliabilityEvaluation } from "./routes/agentReliabilityEvaluation.js";
import { postGuardrailAssessment } from "./routes/guardrailAssessment.js";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

export function createMockApiServer(
  client: BedrockClient = new MockBedrockClient(),
  logger: RequestLogger = consoleRequestLogger,
  mode: ModelProvider = "mock",
  policyProfile: MockPolicyProfile = DEFAULT_POLICY_PROFILE,
  metrics: MetricsCollector = createMetricsCollector()
) {
  return createServer(async (request, response) => {
    const startedAt = Date.now();
    const method = request.method ?? "UNKNOWN";
    const route = getRoutePath(request);
    const record = (event: ReturnType<typeof buildRequestLogEvent>, observation: Omit<RequestMetricObservation, "route" | "outcome" | "mode" | "durationMs"> = {}) => {
      writeRequestLog(logger, event);
      metrics.recordRequest({
        route: event.route,
        outcome: getMetricOutcome(event.statusCode),
        mode: event.mode,
        durationMs: event.durationMs,
        estimatedInputTokens: event.estimatedInputTokens,
        estimatedOutputTokens: event.estimatedOutputTokens,
        estimatedCostUsd: event.estimatedCostUsd,
        ...observation
      });
    };

    try {
      if (method === "GET" && route === "/metrics") {
        writeText(response, 200, await getMetrics(metrics));
        return;
      }

      if (method === "GET" && route === "/health") {
        const healthResponse = getHealth();
        writeJson(response, 200, healthResponse);
        record(buildRequestLogEvent({
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
        record(buildRequestLogEvent({
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
        record(buildRequestLogEvent({
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
        record(buildRequestLogEvent({
          requestId: ragQueryResponse.audit.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: ragQueryResponse.audit.evaluatedAt
        }, mode), { workloadState: "completed" });
        return;
      }

      if (method === "POST" && route === "/agent-actions/authorize") {
        const body = await readJsonBody(request);
        const decision = postAgentActionAuthorisation(body);
        writeJson(response, 200, decision);
        record(buildRequestLogEvent({
          requestId: decision.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: decision.audit.recordedAt
        }, mode), {
          policyVerdict: decision.decision.verdict,
          agentDecision: decision.decision.verdict,
          runtimeState: decision.runtimeControl.state
        });
        return;
      }

      if (method === "POST" && route === "/agent-actions/reliability-evaluate") {
        const body = await readJsonBody(request);
        const evaluation = postAgentActionReliabilityEvaluation(body);
        writeJson(response, 200, evaluation);
        record(buildRequestLogEvent({
          requestId: evaluation.evaluationId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: evaluation.audit.recordedAt
        }, mode), {
          policyVerdict: evaluation.observed.verdict,
          agentDecision: evaluation.observed.verdict,
          runtimeState: evaluation.observed.runtimeState
        });
        return;
      }

      if (method === "POST" && route === "/guardrails/assess") {
        const body = await readJsonBody(request);
        const verdict = postGuardrailAssessment(body);
        writeJson(response, 200, verdict);
        record(buildRequestLogEvent({
          requestId: verdict.requestId,
          method,
          route,
          statusCode: 200,
          durationMs: Date.now() - startedAt,
          timestamp: verdict.audit.recordedAt
        }, mode), {
          policyVerdict: verdict.verdict,
          guardrailVerdict: verdict.verdict
        });
        return;
      }

      if (method === "POST" && route === "/chat") {
        const body = await readJsonBody(request);
        const chatResponse = await postChat(client, body, policyProfile);
        writeJson(response, 200, chatResponse);
        record(buildRequestLogEvent({
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
      record(buildRequestLogEvent({
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
      record(buildRequestLogEvent({
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
    "bedrock",
    createBedrockPolicyProfile(config.modelId)
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

function writeText(response: ServerResponse, statusCode: number, payload: string): void {
  response.writeHead(statusCode, { "content-type": "text/plain; version=0.0.4; charset=utf-8" });
  response.end(payload);
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

function getMetricOutcome(statusCode: number): RequestMetricObservation["outcome"] {
  if (statusCode === 404) {
    return "not_found";
  }
  if (statusCode >= 500) {
    return "server_error";
  }
  if (statusCode >= 400) {
    return "client_error";
  }
  return "success";
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
