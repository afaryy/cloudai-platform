import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createMockApiServer } from "../src/server.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/guardrails-as-a-service");

test("POST /guardrails/assess returns a metadata-only allow verdict", async () => {
  const requestFixture = await readJson("safe-allow.request.json");
  const response = await postGuardrailAssessment(requestFixture);

  assert.equal(response.status, 200);
  assert.equal(response.body.requestId, requestFixture.requestId);
  assert.equal(response.body.verdict, "allow");
  assert.equal(response.body.reasonCode, "no_synthetic_risk_signal");
  assert.equal(response.body.audit.traceId, `trace_${requestFixture.requestId}`);
  assert.equal("content" in response.body, false);
});

test("POST /guardrails/assess denies synthetic jailbreak attempts", async () => {
  const requestFixture = await readJson("jailbreak-deny.request.json");
  const response = await postGuardrailAssessment(requestFixture);

  assert.equal(response.status, 200);
  assert.equal(response.body.verdict, "deny");
  assert.equal(response.body.reasonCode, "synthetic_prompt_injection_signal");
  assert.equal(response.body.policyProfile, requestFixture.policyProfile);
});

test("POST /guardrails/assess rejects raw content payload fields", async () => {
  const requestFixture = await readJson("safe-allow.request.json");
  const unsupportedPayloadFields = [
    ["content", "not accepted in this synthetic metadata-only demo"],
    ["prompt", "ignore previous instructions"],
    ["toolPayload", { command: "not accepted" }],
    ["credentialRef", "not-accepted"]
  ] as const;

  for (const [fieldName, fieldValue] of unsupportedPayloadFields) {
    const response = await postGuardrailAssessment({
      ...requestFixture,
      [fieldName]: fieldValue
    });

    assert.equal(response.status, 400, `${fieldName} should be rejected`);
    assert.equal(response.body.error.code, "invalid_guardrail_assessment_request");
  }
});

async function readJson(fileName: string): Promise<any> {
  return JSON.parse(await readFile(resolve(EXAMPLE_DIR, fileName), "utf8"));
}

async function postGuardrailAssessment(body: unknown): Promise<{ status: number; body: any }> {
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/guardrails/assess`, {
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
