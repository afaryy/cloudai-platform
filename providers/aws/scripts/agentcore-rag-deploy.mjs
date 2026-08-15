import { spawn } from "node:child_process";

const confirmation = process.env.AGENTCORE_RAG_DEPLOY_CONFIRMATION;
if (confirmation !== "I_APPROVE_AGENTCORE_RAG_SANDBOX_DEPLOYMENT") {
  console.error("blocked: deployment_confirmation_required");
  process.exitCode = 1;
} else {
  const checks = [
    ["node", ["providers/aws/scripts/agentcore-rag-preflight.mjs", "--region", "ap-southeast-2"]],
    ["agentcore", ["validate", "--config", "providers/aws/agentcore/agentcore.example.json"]],
    ["agentcore", ["deploy", "--dry-run", "--config", "providers/aws/agentcore/agentcore.example.json"]]
  ];
  for (const [command, args] of checks) {
    const code = await run(command, args);
    if (code !== 0) {
      console.error("blocked: preflight_or_dry_run_failed");
      process.exitCode = 1;
      break;
    }
  }
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
}
