import test from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "../src/lib/errors.js";
import { DEFAULT_POLICY_PROFILE } from "../src/lib/policyProfile.js";
import { normalizeChatRequest, normalizeWorkflowRunRequest } from "../src/lib/validation.js";

test("normalizeChatRequest applies the default mock model", () => {
  assert.deepEqual(normalizeChatRequest({ prompt: "Hello" }), {
    prompt: "Hello",
    modelName: DEFAULT_POLICY_PROFILE.defaultModelName
  });
});

test("normalizeChatRequest rejects unsupported models", () => {
  assert.throws(
    () => normalizeChatRequest({ prompt: "Hello", modelName: "real-bedrock-model" }),
    (error) => error instanceof HttpError && error.code === "unsupported_model"
  );
});

test("workflow request normalization rejects raw execution payload fields", () => {
  assert.throws(
    () => normalizeWorkflowRunRequest({
      workflowId: "workflow_demo_allowed_0001",
      objective: "Summarize approved synthetic platform guidance.",
      owner: "platform-demo-owner",
      riskTier: "standard",
      agentAction: {
        requestId: "agent_req_0001",
        session: {
          sessionId: "agent_session_0001",
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
      capability: { capabilityId: "knowledge-search", admissionStatus: "admitted" },
      knowledgeSource: {
        sourceId: "demo-platform-handbook-001",
        allowedKnowledgeBase: "demo-platform-handbook"
      },
      guardrails: {
        requestId: "guardrail_req_0001",
        policyProfile: "guardrails-demo",
        surface: "agent-action",
        syntheticSignals: ["none"]
      },
      acceptanceChecks: ["capability-admitted", "source-active", "guardrails-allow", "within-budget"],
      executionResult: "not accepted"
    }),
    (error) => error instanceof HttpError && error.code === "invalid_workflow_run_request"
  );
});
