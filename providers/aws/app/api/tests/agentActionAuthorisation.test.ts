import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createMockApiServer } from "../src/server.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/agentops-governance");

test("POST /agent-actions/authorize returns a metadata-only allow decision", async () => {
  const requestFixture = await readJson("agent-action.allowed-read.json");
  const response = await postAgentActionAuthorisation(requestFixture);

  assert.equal(response.status, 200);
  assert.equal(response.body.requestId, requestFixture.requestId);
  assert.equal(response.body.decision.verdict, "allow");
  assert.equal(response.body.decision.reasonCode, "read_only_action_allowed");
  assert.equal(response.body.runtimeControl.state, "active");
  assert.equal(response.body.audit.traceId, `trace_${requestFixture.requestId}`);
  assert.equal("toolInput" in response.body, false);
});

test("POST /agent-actions/authorize requires approval for a high-impact action", async () => {
  const requestFixture = await readJson("agent-action.approval-required.json");
  const response = await postAgentActionAuthorisation(requestFixture);

  assert.equal(response.status, 200);
  assert.equal(response.body.decision.verdict, "approval-required");
  assert.equal(response.body.approval.required, true);
  assert.equal(response.body.runtimeControl.state, "active");
});

test("POST /agent-actions/authorize rejects tool input payload fields", async () => {
  const requestFixture = await readJson("agent-action.allowed-read.json");
  const response = await postAgentActionAuthorisation({
    ...requestFixture,
    toolInput: "not accepted in this metadata-only demo"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "invalid_agent_action_request");
});

async function readJson(fileName: string): Promise<any> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8"));
}

async function postAgentActionAuthorisation(body: unknown): Promise<{ status: number; body: any }> {
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/agent-actions/authorize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
}

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}
