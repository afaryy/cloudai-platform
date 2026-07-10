import type { HealthResponse } from "../types.js";

export function getHealth(): HealthResponse {
  return {
    status: "ok",
    mode: "mock",
    service: "mock-genai-api",
    timestamp: new Date().toISOString()
  };
}
