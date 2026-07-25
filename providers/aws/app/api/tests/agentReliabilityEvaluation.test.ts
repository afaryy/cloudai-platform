import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockApiServer } from "../src/server.js";

test("POST /agent-actions/reliability-evaluate returns deterministic evidence", async () => {
  const response = await postEvaluation(createRequest());

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "pass");
  assert.equal(response.body.observed.runs, 3);
  assert.equal("toolInput" in response.body, false);
});

test("POST /agent-actions/reliability-evaluate rejects unknown fields", async () => {
  const response = await postEvaluation({ ...createRequest(), toolInput: "not accepted" });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "invalid_agent_reliability_evaluation_request");
});

function createRequest(): object {
  return {
    evaluationId: "agent_reliability_api_0001",
    authorisationRequest: {
      requestId: "agent_req_reliability_api_0001",
      session: {
        sessionId: "agent_session_reliability_api_0001",
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
}

async function postEvaluation(body: object): Promise<{ status: number; body: any }> {
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/agent-actions/reliability-evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
}
