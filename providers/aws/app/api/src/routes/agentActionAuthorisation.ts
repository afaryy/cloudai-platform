import { authoriseAgentAction } from "../lib/agentOpsPolicy.js";
import { normalizeAgentActionAuthorisationRequest } from "../lib/validation.js";
import type { AgentActionAuthorisationDecision } from "../types.js";

export function postAgentActionAuthorisation(body: unknown): AgentActionAuthorisationDecision {
  return authoriseAgentAction(normalizeAgentActionAuthorisationRequest(body));
}
