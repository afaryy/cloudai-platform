import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { decideAdmission } from "./admission.js";
import {
  type RuntimeRequest,
  type RuntimeResponse,
  validateRuntimeRequest,
  validateRuntimeResponse
} from "./validation.js";
import { emitRuntimeObservation } from "./observability.js";

const maxRequestBytes = 16 * 1024;

export interface RuntimeDependencies {
  retrieveAndGenerate(request: RuntimeRequest): Promise<RuntimeResponse>;
}

export function createRuntimeServer(dependencies: RuntimeDependencies): Server {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/ping") {
      return sendJson(response, 200, { status: "ok" });
    }
    if (request.method !== "POST" || request.url !== "/invocations") {
      return sendJson(response, 404, { error: "not_found" });
    }

    const body = await parseJsonBody(request);
    if (body === undefined) {
      return sendJson(response, 400, { error: "invalid_request" });
    }

    const validation = validateRuntimeRequest(body);
    if (!validation.ok) {
      return sendJson(response, 400, { error: validation.reasonCode });
    }
    const runtimeRequest = body as RuntimeRequest;
    const startedAt = Date.now();
    let observedOutcome: RuntimeResponse["outcome"] = "abstain";
    let observedReasonCode: string | undefined;
    let observedCitationPresent = false;

    try {
      const admission = decideAdmission(runtimeRequest);
      if (admission.outcome !== "allow") {
        observedOutcome = admission.outcome;
        observedReasonCode = admission.reasonCode;
        return sendJson(response, admission.statusCode, boundedFailure(runtimeRequest, admission.outcome, admission.reasonCode));
      }

      const result = await dependencies.retrieveAndGenerate(runtimeRequest);
      const safeResult = { ...result, requestId: runtimeRequest.requestId };
      if (!validateRuntimeResponse(safeResult).ok) {
        observedOutcome = "abstain";
        observedReasonCode = "insufficient_evidence";
        return sendJson(response, 200, boundedFailure(runtimeRequest, "abstain", "insufficient_evidence"));
      }
      observedOutcome = safeResult.outcome;
      observedReasonCode = safeResult.reasonCode;
      observedCitationPresent = safeResult.audit.citationPresent;
      return sendJson(response, 200, safeResult);
    } catch {
      observedOutcome = "abstain";
      observedReasonCode = "retrieval_unavailable";
      return sendJson(response, 200, boundedFailure(runtimeRequest, "abstain", "retrieval_unavailable"));
    } finally {
      emitRuntimeObservation({
        requestId: runtimeRequest.requestId,
        outcome: observedOutcome,
        reasonCode: observedReasonCode,
        sourceLifecycle: runtimeRequest.governance.sourceLifecycle,
        citationPresent: observedCitationPresent,
        latencyMs: Date.now() - startedAt,
        providerFailureClass: observedReasonCode?.startsWith("retrieval_") ? observedReasonCode.slice("retrieval_".length) : undefined
      });
    }
  });
}

function boundedFailure(
  request: RuntimeRequest,
  outcome: "abstain" | "denied" | "disabled",
  reasonCode: string
): RuntimeResponse {
  return {
    requestId: request.requestId,
    outcome,
    reasonCode,
    citations: [],
    audit: { sourceLifecycle: request.governance.sourceLifecycle, citationPresent: false }
  };
}

async function parseJsonBody(request: IncomingMessage): Promise<unknown | undefined> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxRequestBytes) return undefined;
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}
