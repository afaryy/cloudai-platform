import test from "node:test";
import assert from "node:assert/strict";
import { authoriseAgentAction } from "../src/lib/agentOpsPolicy.js";
import type { AgentActionAuthorisationRequest } from "../src/types.js";

function createRequest(overrides: Partial<AgentActionAuthorisationRequest> = {}): AgentActionAuthorisationRequest {
  return {
    requestId: "agent_req_test_0001",
    session: {
      sessionId: "agent_session_test_0001",
      agentId: "demo-knowledge-agent",
      owner: "platform-demo-owner",
      delegatedUser: "synthetic-user",
      riskTier: "standard",
      status: "active"
    },
    action: {
      toolId: "knowledge-search",
      actionClass: "read",
      leastPrivilegeScope: "synthetic-public-knowledge"
    },
    governance: {
      policyProfile: "agentops-demo-governed",
      approvalId: null,
      budgetLimit: 10,
      budgetConsumed: 2
    },
    ...overrides
  };
}

test("AgentOps allows active read actions for an approved mock tool", () => {
  const decision = authoriseAgentAction(createRequest());

  assert.equal(decision.decision.verdict, "allow");
  assert.equal(decision.decision.reasonCode, "read_only_action_allowed");
  assert.equal(decision.runtimeControl.state, "active");
  assert.equal(decision.audit.traceId, "trace_agent_req_test_0001");
});

test("AgentOps requires human approval before high-impact actions", () => {
  const request = createRequest({
    action: {
      toolId: "case-summary",
      actionClass: "high-impact",
      leastPrivilegeScope: "synthetic-case-summary"
    }
  });

  const decision = authoriseAgentAction(request);

  assert.equal(decision.decision.verdict, "approval-required");
  assert.equal(decision.decision.reasonCode, "human_approval_required");
  assert.equal(decision.approval.required, true);
});

test("AgentOps allows an approved high-impact action without executing it", () => {
  const request = createRequest({
    action: {
      toolId: "case-summary",
      actionClass: "high-impact",
      leastPrivilegeScope: "synthetic-case-summary"
    },
    governance: {
      policyProfile: "agentops-demo-governed",
      approvalId: "approval_demo_0001",
      budgetLimit: 10,
      budgetConsumed: 2
    }
  });

  const decision = authoriseAgentAction(request);

  assert.equal(decision.decision.verdict, "allow");
  assert.equal(decision.decision.reasonCode, "approved_high_impact_action");
  assert.equal(decision.approval.approvalId, "approval_demo_0001");
});

test("AgentOps denies tools outside the mock allowlist", () => {
  const request = createRequest({
    action: {
      toolId: "unapproved-tool",
      actionClass: "read",
      leastPrivilegeScope: "synthetic-public-knowledge"
    }
  });

  const decision = authoriseAgentAction(request);

  assert.equal(decision.decision.verdict, "deny");
  assert.equal(decision.decision.reasonCode, "tool_not_allowed");
});

test("AgentOps pauses a session when its synthetic budget is exhausted", () => {
  const request = createRequest({
    governance: {
      policyProfile: "agentops-demo-governed",
      approvalId: null,
      budgetLimit: 10,
      budgetConsumed: 10
    }
  });

  const decision = authoriseAgentAction(request);

  assert.equal(decision.decision.verdict, "deny");
  assert.equal(decision.decision.reasonCode, "budget_limit_exceeded");
  assert.equal(decision.runtimeControl.state, "paused");
  assert.equal(decision.runtimeControl.budgetRemaining, 0);
});

test("AgentOps preserves a paused or terminated session state", () => {
  const request = createRequest({
    session: {
      sessionId: "agent_session_test_0001",
      agentId: "demo-knowledge-agent",
      owner: "platform-demo-owner",
      delegatedUser: "synthetic-user",
      riskTier: "standard",
      status: "terminated"
    }
  });

  const decision = authoriseAgentAction(request);

  assert.equal(decision.decision.verdict, "paused");
  assert.equal(decision.decision.reasonCode, "session_not_active");
  assert.equal(decision.runtimeControl.state, "terminated");
});
