import assert from "node:assert/strict";
import test from "node:test";

import { runDeploy, runDestroy } from "../src/deploymentControls.js";

test("deploy refuses missing confirmation before spawning any command", async () => {
  let spawnCalls = 0;
  const result = await runDeploy({
    confirmation: undefined,
    spawn: async () => {
      spawnCalls += 1;
      return 0;
    }
  });

  assert.deepEqual(result, { status: "blocked", reason: "deployment_confirmation_required", spawnCalls: 0 });
  assert.equal(spawnCalls, 0);
});

test("destroy refuses incorrect confirmation before spawning any command", async () => {
  let spawnCalls = 0;
  const result = await runDestroy({
    confirmation: "yes",
    spawn: async () => {
      spawnCalls += 1;
      return 0;
    }
  });

  assert.deepEqual(result, { status: "blocked", reason: "teardown_confirmation_required", spawnCalls: 0 });
  assert.equal(spawnCalls, 0);
});

test("approved deployment uses only fixed Sydney, validate, and dry-run commands", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const result = await runDeploy({
    confirmation: "I_APPROVE_AGENTCORE_RAG_SANDBOX_DEPLOYMENT",
    spawn: async (command: string, args: string[]) => {
      commands.push({ command, args });
      return 0;
    }
  });

  assert.equal(result.status, "ready");
  assert.equal(result.spawnCalls, 3);
  assert.deepEqual(commands, [
    { command: "node", args: ["providers/aws/scripts/agentcore-rag-preflight.mjs", "--region", "ap-southeast-2"] },
    { command: "agentcore", args: ["validate", "--config", "providers/aws/agentcore/agentcore.example.json"] },
    { command: "agentcore", args: ["deploy", "--dry-run", "--config", "providers/aws/agentcore/agentcore.example.json"] }
  ]);
});
