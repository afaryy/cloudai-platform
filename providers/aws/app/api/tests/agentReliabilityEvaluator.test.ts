import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAgentActionReliability } from "../src/lib/agentReliabilityEvaluator.js";

test("evaluates an approved read action consistently", () => {
  const result = evaluateAgentActionReliability({
    evaluationId: "agent_reliability_allowed_read_0001",
    authorisationRequest: {
      requestId: "agent_req_reliability_0001",
      session: {
        sessionId: "agent_session_reliability_0001",
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
      }
    },
    expected: {
      verdict: "allow",
      reasonCode: "read_only_action_allowed",
      runtimeState: "active",
      approvalRequired: false
    },
    repeatCount: 3
  });

  assert.equal(result.status, "pass");
  assert.deepEqual(result.checks, {
    policyOutcome: "pass",
    approvalBoundary: "pass",
    runtimeState: "pass",
    repeatability: "pass"
  });
  assert.equal(result.observed.runs, 3);
});

test("preserves the human approval boundary for a high-impact action", () => {
  const result = evaluateAgentActionReliability(createRequest({
    action: {
      toolId: "case-summary",
      actionClass: "high-impact",
      leastPrivilegeScope: "synthetic-case-summary"
    },
    expected: {
      verdict: "approval-required",
      reasonCode: "human_approval_required",
      runtimeState: "active",
      approvalRequired: true
    }
  }));

  assert.equal(result.status, "pass");
  assert.equal(result.checks.approvalBoundary, "pass");
  assert.equal(result.observed.approvalRequired, true);
});

test("keeps an unapproved tool denied across repeated evaluations", () => {
  const result = evaluateAgentActionReliability(createRequest({
    action: {
      toolId: "unapproved-tool",
      actionClass: "read",
      leastPrivilegeScope: "synthetic-public-knowledge"
    },
    expected: {
      verdict: "deny",
      reasonCode: "tool_not_allowed",
      runtimeState: "active",
      approvalRequired: false
    }
  }));

  assert.equal(result.status, "pass");
  assert.equal(result.checks.policyOutcome, "pass");
  assert.equal(result.checks.repeatability, "pass");
});

test("preserves paused state when the synthetic budget is exhausted", () => {
  const result = evaluateAgentActionReliability(createRequest({
    governance: {
      policyProfile: "agentops-demo-governed",
      approvalId: null,
      budgetLimit: 10,
      budgetConsumed: 10
    },
    expected: {
      verdict: "deny",
      reasonCode: "budget_limit_exceeded",
      runtimeState: "paused",
      approvalRequired: false
    }
  }));

  assert.equal(result.status, "pass");
  assert.equal(result.checks.runtimeState, "pass");
  assert.equal(result.observed.runtimeState, "paused");
});

function createRequest(overrides: any = {}): any {
  const request = {
    evaluationId: "agent_reliability_scenario_0001",
    authorisationRequest: {
      requestId: "agent_req_reliability_0001",
      session: {
        sessionId: "agent_session_reliability_0001",
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
      }
    },
    expected: {
      verdict: "allow",
      reasonCode: "read_only_action_allowed",
      runtimeState: "active",
      approvalRequired: false
    },
    repeatCount: 3
  };

  return {
    ...request,
    ...overrides,
    authorisationRequest: {
      ...request.authorisationRequest,
      ...overrides.authorisationRequest,
      action: overrides.action ?? request.authorisationRequest.action,
      governance: overrides.governance ?? request.authorisationRequest.governance
    }
  };
}
