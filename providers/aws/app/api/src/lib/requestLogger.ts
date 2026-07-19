import type { ModelProvider } from "../clients/providerClient.js";

export type RequestLogEvent = {
  event: "mock_api_request";
  mode: ModelProvider;
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  modelName?: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  estimatedCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
};

export interface RequestLogger {
  info(event: RequestLogEvent): void;
}

export const consoleRequestLogger: RequestLogger = {
  info(event: RequestLogEvent): void {
    console.log(JSON.stringify(event));
  }
};

export function buildRequestLogEvent(
  event: Omit<RequestLogEvent, "event" | "mode" | "durationMs"> & { durationMs: number },
  mode: ModelProvider = "mock"
): RequestLogEvent {
  return {
    event: "mock_api_request",
    mode,
    ...event,
    durationMs: Math.max(0, Math.round(event.durationMs))
  };
}
