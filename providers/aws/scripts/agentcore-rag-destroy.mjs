import { spawn } from "node:child_process";

const confirmation = process.env.AGENTCORE_RAG_TEARDOWN_CONFIRMATION;
if (confirmation !== "I_APPROVE_AGENTCORE_RAG_SANDBOX_TEARDOWN") {
  console.error("blocked: teardown_confirmation_required");
  process.exitCode = 1;
} else {
  console.log("teardown categories: gateway target, gateway, runtime, knowledge base/data source, synthetic storage");
  const child = spawn("agentcore", ["destroy", "--config", "providers/aws/agentcore/agentcore.example.json", "--region", "ap-southeast-2"], { stdio: "inherit", shell: false });
  child.on("error", () => { process.exitCode = 1; });
  child.on("close", (code) => { process.exitCode = code ?? 1; });
}
