import type { RuntimeRequest } from "./validation.js";

export type AdmissionDecision =
  | { outcome: "allow"; statusCode: 200 }
  | { outcome: "denied"; statusCode: 403; reasonCode: string }
  | { outcome: "disabled"; statusCode: 423; reasonCode: "workload_disabled" };

export function decideAdmission(request: RuntimeRequest): AdmissionDecision {
  if (request.governance.workloadState === "disabled") {
    return { outcome: "disabled", statusCode: 423, reasonCode: "workload_disabled" };
  }
  if (request.governance.entryPath !== "gateway") {
    return { outcome: "denied", statusCode: 403, reasonCode: "gateway_required" };
  }
  if (request.governance.sourceLifecycle !== "active") {
    return { outcome: "denied", statusCode: 403, reasonCode: "knowledge_source_retired" };
  }
  if (!request.governance.requireCitations) {
    return { outcome: "denied", statusCode: 403, reasonCode: "citations_required" };
  }
  if (isPromptAttackShaped(request.question)) {
    return { outcome: "denied", statusCode: 403, reasonCode: "unsafe_request" };
  }
  return { outcome: "allow", statusCode: 200 };
}

function isPromptAttackShaped(question: string): boolean {
  return /ignore\s+(?:the\s+)?(?:policy|handbook|instructions)/i.test(question)
    || /(?:reveal|return|show)\s+(?:credentials|secrets|tokens)/i.test(question);
}
