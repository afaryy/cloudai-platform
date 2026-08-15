export const AWS_REGION = "ap-southeast-2" as const;
export const DEPLOYMENT_CONFIRMATION = "I_APPROVE_AGENTCORE_RAG_SANDBOX_DEPLOYMENT";
export const TEARDOWN_CONFIRMATION = "I_APPROVE_AGENTCORE_RAG_SANDBOX_TEARDOWN";

export type SpawnCommand = (command: string, args: string[]) => Promise<number>;

export interface ControlRunOptions {
  confirmation: string | undefined;
  spawn: SpawnCommand;
}

export type ControlRunResult =
  | { status: "blocked"; reason: "deployment_confirmation_required" | "teardown_confirmation_required"; spawnCalls: 0 }
  | { status: "ready"; spawnCalls: number };

export async function runDeploy(options: ControlRunOptions): Promise<ControlRunResult> {
  if (options.confirmation !== DEPLOYMENT_CONFIRMATION) {
    return { status: "blocked", reason: "deployment_confirmation_required", spawnCalls: 0 };
  }

  const commands = [
    ["node", ["providers/aws/scripts/agentcore-rag-preflight.mjs", "--region", AWS_REGION]],
    ["agentcore", ["validate", "--config", "providers/aws/agentcore/agentcore.example.json"]],
    ["agentcore", ["deploy", "--dry-run", "--config", "providers/aws/agentcore/agentcore.example.json"]]
  ] as const;
  for (const [command, args] of commands) {
    const exitCode = await options.spawn(command, [...args]);
    if (exitCode !== 0) throw new Error("deployment_preflight_failed");
  }
  return { status: "ready", spawnCalls: commands.length };
}

export async function runDestroy(options: ControlRunOptions): Promise<ControlRunResult> {
  if (options.confirmation !== TEARDOWN_CONFIRMATION) {
    return { status: "blocked", reason: "teardown_confirmation_required", spawnCalls: 0 };
  }

  const command = ["agentcore", ["destroy", "--config", "providers/aws/agentcore/agentcore.example.json", "--region", AWS_REGION]] as const;
  const exitCode = await options.spawn(command[0], [...command[1]]);
  if (exitCode !== 0) throw new Error("teardown_failed");
  return { status: "ready", spawnCalls: 1 };
}
