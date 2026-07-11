import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createMockApiServer } from "../src/server.js";

const EXAMPLE_DIR = resolve(process.cwd(), "../../../../shared/examples/rag-governance");

test("POST /rag/query returns a governed synthetic RAG response", async () => {
  const requestFixture = await readJson("rag-request.allowed.json");
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/rag/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestFixture)
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.requestId, requestFixture.requestId);
    assert.match(body.response.answer, /mock governed RAG response/i);
    assert.equal(body.response.citations.length, 1);
    assert.equal(body.retrieval.knowledgeBase, "demo-platform-handbook");
    assert.equal(body.retrieval.documentsReturned, 1);
    assert.equal(body.governance.citationRequirementMet, true);
    assert.equal(body.governance.egressDecision.allowed, true);
    assert.equal(body.governance.egressDecision.scope, "controlled_response");
    assert.equal(body.audit.requestId, requestFixture.requestId);
    assert.equal(body.audit.policyProfile, requestFixture.governance.policyProfile);
    assert.equal(body.audit.evaluatedAt, "2026-07-10T00:00:00.000Z");
    assert.equal(body.retrieval.sources[0].retrievedAt, "2026-07-10T00:00:00.000Z");
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("POST /rag/query rejects empty RAG queries", async () => {
  const requestFixture = await readJson("rag-request.allowed.json");
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/rag/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...requestFixture,
        query: " "
      })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "empty_rag_query");
    assert.equal(body.error.message, "query must not be empty.");
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("POST /rag/query rejects non-string knowledge base names", async () => {
  const requestFixture = await readJson("rag-request.allowed.json");
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/rag/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...requestFixture,
        retrieval: {
          ...requestFixture.retrieval,
          allowedKnowledgeBases: [123]
        }
      })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "invalid_rag_request");
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("POST /rag/query rejects extra top-level properties", async () => {
  const requestFixture = await readJson("rag-request.allowed.json");
  const response = await postRagQuery({
    ...requestFixture,
    extraDemoField: "not allowed by contract"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "invalid_rag_request");
});

test("POST /rag/query rejects unsupported required metadata values", async () => {
  const requestFixture = await readJson("rag-request.allowed.json");
  const response = await postRagQuery({
    ...requestFixture,
    retrieval: {
      ...requestFixture.retrieval,
      requiredMetadata: ["sourceId", "unsupportedField"]
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "invalid_rag_request");
});

async function readJson(fileName: string): Promise<any> {
  const raw = await readFile(resolve(EXAMPLE_DIR, fileName), "utf8");
  return JSON.parse(raw);
}

function getServerPort(address: string | AddressInfo | null): number {
  assert.ok(address && typeof address === "object");
  return address.port;
}

async function postRagQuery(body: unknown): Promise<{ status: number; body: any }> {
  const server = createMockApiServer(undefined, { info: () => undefined });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

  try {
    const port = getServerPort(server.address());
    const response = await fetch(`http://127.0.0.1:${port}/rag/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    return {
      status: response.status,
      body: await response.json()
    };
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
}
