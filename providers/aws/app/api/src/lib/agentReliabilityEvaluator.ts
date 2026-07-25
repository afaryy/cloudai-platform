import { authoriseAgentAction } from "./agentOpsPolicy.js";
import type {
  AgentActionAuthorisationDecision,
  AgentReliabilityEvaluationRequest,
  AgentReliabilityEvaluationResult,
  AgentReliabilityExpectedOutcome
} from "../types.js";

const RECORDED_AT = "2026-07-25T00:00:00.000Z";

export function evaluateAgentActionReliability(
  request: AgentReliabilityEvaluationRequest
): AgentReliabilityEvaluationResult {
  const decisions = Array.from(
    { length: request.repeatCount },
    () => authoriseAgentAction(request.authorisationRequest)
  );
  const observed = toObservedOutcome(decisions[0], request.repeatCount);
  const checks = {
    policyOutcome: observed.verdict === request.expected.verdict
      && observed.reasonCode === request.expected.reasonCode ? "pass" : "fail",
    approvalBoundary: observed.approvalRequired === request.expected.approvalRequired ? "pass" : "fail",
    runtimeState: observed.runtimeState === request.expected.runtimeState ? "pass" : "fail",
    repeatability: decisions.every((decision) => matchesOutcome(decision, observed)) ? "pass" : "fail"
  } as const;

  return {
    evaluationId: request.evaluationId,
    status: Object.values(checks).every((check) => check === "pass") ? "pass" : "fail",
    expected: request.expected,
    observed,
    checks,
    audit: {
      traceId: `trace_${request.evaluationId}`,
      recordedAt: RECORDED_AT
    }
  };
}

function toObservedOutcome(
  decision: AgentActionAuthorisationDecision,
  runs: number
): AgentReliabilityEvaluationResult["observed"] {
  return {
    verdict: decision.decision.verdict,
    reasonCode: decision.decision.reasonCode,
    runtimeState: decision.runtimeControl.state,
    approvalRequired: decision.approval.required,
    runs
  };
}

function matchesOutcome(
  decision: AgentActionAuthorisationDecision,
  observed: AgentReliabilityExpectedOutcome
): boolean {
  return decision.decision.verdict === observed.verdict
    && decision.decision.reasonCode === observed.reasonCode
    && decision.runtimeControl.state === observed.runtimeState
    && decision.approval.required === observed.approvalRequired;
}
