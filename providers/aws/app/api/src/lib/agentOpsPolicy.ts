import type {
  AgentActionAuthorisationDecision,
  AgentActionAuthorisationRequest,
  AgentAuthorisationReasonCode,
  AgentAuthorisationVerdict,
  AgentSessionStatus
} from "../types.js";

export const AGENTOPS_POLICY_ID = "agentops-demo-governed";
export const ALLOWED_TOOL_IDS = ["knowledge-search", "case-summary"] as const;

const RECORDED_AT = "2026-07-11T00:00:00.000Z";

export function authoriseAgentAction(
  request: AgentActionAuthorisationRequest
): AgentActionAuthorisationDecision {
  if (request.session.status !== "active") {
    return buildDecision(request, "paused", "session_not_active", request.session.status);
  }

  if (request.governance.budgetConsumed >= request.governance.budgetLimit) {
    return buildDecision(request, "deny", "budget_limit_exceeded", "paused");
  }

  if (!ALLOWED_TOOL_IDS.includes(request.action.toolId as (typeof ALLOWED_TOOL_IDS)[number])) {
    return buildDecision(request, "deny", "tool_not_allowed", "active");
  }

  if ((request.action.actionClass === "write" || request.action.actionClass === "high-impact") && !request.governance.approvalId) {
    return buildDecision(request, "approval-required", "human_approval_required", "active");
  }

  if (request.action.actionClass === "write" || request.action.actionClass === "high-impact") {
    return buildDecision(request, "allow", "approved_high_impact_action", "active");
  }

  return buildDecision(request, "allow", "read_only_action_allowed", "active");
}

function buildDecision(
  request: AgentActionAuthorisationRequest,
  verdict: AgentAuthorisationVerdict,
  reasonCode: AgentAuthorisationReasonCode,
  state: AgentSessionStatus
): AgentActionAuthorisationDecision {
  return {
    requestId: request.requestId,
    decision: {
      verdict,
      reasonCode,
      policyId: AGENTOPS_POLICY_ID
    },
    approval: {
      required: verdict === "approval-required",
      approvalId: request.governance.approvalId
    },
    runtimeControl: {
      state,
      budgetLimit: request.governance.budgetLimit,
      budgetConsumed: request.governance.budgetConsumed,
      budgetRemaining: Math.max(0, request.governance.budgetLimit - request.governance.budgetConsumed)
    },
    audit: {
      traceId: `trace_${request.requestId}`,
      eventId: `audit_${request.requestId}`,
      recordedAt: RECORDED_AT
    }
  };
}
