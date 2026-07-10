import test from "node:test";
import assert from "node:assert/strict";
import {
  checkInputTokenBudget,
  DEFAULT_MAX_INPUT_TOKENS,
  enforceInputTokenBudget
} from "../src/lib/tokenBudget.js";
import { HttpError } from "../src/lib/errors.js";
import { DEFAULT_POLICY_PROFILE } from "../src/lib/policyProfile.js";

test("DEFAULT_MAX_INPUT_TOKENS uses the default policy profile", () => {
  assert.equal(DEFAULT_MAX_INPUT_TOKENS, DEFAULT_POLICY_PROFILE.maxInputTokens);
});

test("checkInputTokenBudget allows prompts within the mock budget", () => {
  const decision = checkInputTokenBudget("hello world", DEFAULT_MAX_INPUT_TOKENS);

  assert.equal(decision.allowed, true);
  assert.equal(decision.maxInputTokens, DEFAULT_MAX_INPUT_TOKENS);
  assert.equal(decision.estimatedInputTokens, 3);
});

test("enforceInputTokenBudget rejects prompts over the mock budget", () => {
  const prompt = Array.from({ length: 70 }, (_, index) => `word${index}`).join(" ");

  assert.throws(
    () => enforceInputTokenBudget(prompt),
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 429);
      assert.equal(error.code, "token_budget_exceeded");
      return true;
    }
  );
});
