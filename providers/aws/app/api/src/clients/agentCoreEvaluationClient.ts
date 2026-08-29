import {
  BedrockAgentCoreClient,
  EvaluateCommand,
  type EvaluateCommandInput
} from "@aws-sdk/client-bedrock-agentcore";

import type { AgentCoreEvaluateClient } from "../evals/agentCoreEvaluationProviderTypes.js";

export function createAwsAgentCoreEvaluateClient(region: string): AgentCoreEvaluateClient {
  const client = new BedrockAgentCoreClient({ region, maxAttempts: 2 });
  return {
    async evaluate(request) {
      const input: EvaluateCommandInput = request as EvaluateCommandInput;
      return client.send(new EvaluateCommand(input));
    }
  };
}
