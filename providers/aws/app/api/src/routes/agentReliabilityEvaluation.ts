import { evaluateAgentActionReliability } from "../lib/agentReliabilityEvaluator.js";
import { normalizeAgentReliabilityEvaluationRequest } from "../lib/validation.js";
import type { AgentReliabilityEvaluationResult } from "../types.js";

export function postAgentActionReliabilityEvaluation(body: unknown): AgentReliabilityEvaluationResult {
  return evaluateAgentActionReliability(normalizeAgentReliabilityEvaluationRequest(body));
}
