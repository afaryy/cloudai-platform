import { HttpError } from "./errors.js";
import { DEFAULT_POLICY_PROFILE } from "./policyProfile.js";
import { estimateTokens } from "./tokenEstimator.js";

export type TokenBudgetDecision = {
  allowed: boolean;
  estimatedInputTokens: number;
  maxInputTokens: number;
};

export const DEFAULT_MAX_INPUT_TOKENS = DEFAULT_POLICY_PROFILE.maxInputTokens;

export function checkInputTokenBudget(
  prompt: string,
  maxInputTokens: number = DEFAULT_MAX_INPUT_TOKENS
): TokenBudgetDecision {
  const estimatedInputTokens = estimateTokens(prompt);

  return {
    allowed: estimatedInputTokens <= maxInputTokens,
    estimatedInputTokens,
    maxInputTokens
  };
}

export function enforceInputTokenBudget(
  prompt: string,
  maxInputTokens: number = DEFAULT_MAX_INPUT_TOKENS
): TokenBudgetDecision {
  const decision = checkInputTokenBudget(prompt, maxInputTokens);

  if (!decision.allowed) {
    throw new HttpError(
      429,
      `estimated input tokens exceed the mock budget of ${decision.maxInputTokens}.`,
      "token_budget_exceeded"
    );
  }

  return decision;
}
