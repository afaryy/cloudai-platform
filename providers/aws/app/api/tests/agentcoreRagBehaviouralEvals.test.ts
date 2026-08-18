import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { evaluateAgentActionReliability } from "../src/lib/agentReliabilityEvaluator.js";
import type {
  AgentActionAuthorisationRequest,
  AgentReliabilityEvaluationRequest,
  AgentReliabilityExpectedOutcome
} from "../src/types.js";

const CASES_PATH = resolve(process.cwd(), "../../../../shared/examples/agentcore-rag-poc/behavioral-evaluation-cases.json");

test("AgentCore RAG behavioural fixture preserves the five agreed cases", async () => {
  const cases = JSON.parse(await readFile(CASES_PATH, "utf8")) as Array<Record<string, any>>;

  assert.deepEqual(cases.map((evaluation) => evaluation.scenario), [
    "synthetic-citation-missing",
    "synthetic-stale-source",
    "synthetic-provider-timeout",
    "synthetic-denied-tool",
    "synthetic-human-approval-boundary"
  ]);
  assert.ok(cases.every((evaluation) => evaluation.evidenceLevel === "local-contract"));
  assert.equal(cases.filter((evaluation) => evaluation.boundary === "retrieval").length, 1);
  assert.equal(cases.filter((evaluation) => evaluation.boundary === "source-lifecycle").length, 1);
  assert.equal(cases.filter((evaluation) => evaluation.boundary === "provider").length, 1);
  assert.equal(cases.filter((evaluation) => evaluation.boundary === "tool-authorisation").length, 1);
  assert.equal(cases.filter((evaluation) => evaluation.boundary === "human-approval").length, 1);
});

test("denied-tool and human-approval cases reuse the existing AgentOps policy contract", async () => {
  const cases = JSON.parse(await readFile(CASES_PATH, "utf8")) as Array<Record<string, any>>;
  const deniedTool = cases.find((evaluation) => evaluation.scenario === "synthetic-denied-tool");
  const approvalBoundary = cases.find((evaluation) => evaluation.scenario === "synthetic-human-approval-boundary");

  assert.ok(deniedTool?.action);
  assert.ok(approvalBoundary?.action);

  const deniedResult = evaluateAgentActionReliability(createReliabilityRequest(deniedTool.action, {
    verdict: "deny",
    reasonCode: "tool_not_allowed",
    runtimeState: "active",
    approvalRequired: false
  }));
  const approvalResult = evaluateAgentActionReliability(createReliabilityRequest(approvalBoundary.action, {
    verdict: "approval-required",
    reasonCode: "human_approval_required",
    runtimeState: "active",
    approvalRequired: true
  }));

  assert.equal(deniedResult.status, "pass");
  assert.equal(approvalResult.status, "pass");
});

function createReliabilityRequest(
  action: AgentActionAuthorisationRequest["action"],
  expected: AgentReliabilityExpectedOutcome
): AgentReliabilityEvaluationRequest {
  return {
    evaluationId: `agentcore_rag_${action.actionClass}_${action.toolId}`,
    authorisationRequest: {
      requestId: "agentcore_rag_behavioural_001",
      session: {
        sessionId: "agentcore_rag_session_001",
        agentId: "demo-knowledge-agent",
        owner: "platform-demo-owner",
        delegatedUser: "synthetic-user",
        riskTier: "standard",
        status: "active"
      },
      action,
      governance: {
        policyProfile: "agentops-demo-governed",
        approvalId: null,
        budgetLimit: 10,
        budgetConsumed: 2
      }
    },
    expected,
    repeatCount: 3
  };
}
