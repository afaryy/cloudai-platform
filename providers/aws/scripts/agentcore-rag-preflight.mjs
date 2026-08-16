import { spawn } from "node:child_process";

const expectedRegion = "ap-southeast-2";
const requestedRegion = process.argv.at(-1) === expectedRegion ? expectedRegion : undefined;

if (!requestedRegion) {
  console.error("blocked: region must be ap-southeast-2");
  process.exitCode = 1;
} else {
  const checks = [
    ["node", ["--version"], "node_runtime"],
    ["agentcore", ["--version"], "agentcore_cli"],
    ["aws", ["sts", "get-caller-identity", "--region", expectedRegion, "--output", "json"], "aws_identity"],
    ["aws", ["bedrock-agent", "list-knowledge-bases", "--region", expectedRegion, "--max-results", "1", "--output", "json"], "knowledge_base_access"]
  ];
  for (const [command, args, category] of checks) {
    const exitCode = await run(command, args);
    console.log(`${exitCode === 0 ? "pass" : "blocked"}: ${category}`);
    if (exitCode !== 0) process.exitCode = 1;
  }
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore", shell: false });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
}
