import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_POLICY_PROFILE, isModelAllowed } from "../src/lib/policyProfile.js";

test("DEFAULT_POLICY_PROFILE defines governed mock access settings", () => {
  assert.equal(DEFAULT_POLICY_PROFILE.id, "default-mock-governed");
  assert.equal(DEFAULT_POLICY_PROFILE.defaultModelName, "mock-bedrock-claude");
  assert.deepEqual(DEFAULT_POLICY_PROFILE.allowedModelNames, ["mock-bedrock-claude", "mock-bedrock-titan"]);
  assert.equal(DEFAULT_POLICY_PROFILE.maxPromptCharacters, 4000);
  assert.equal(DEFAULT_POLICY_PROFILE.maxInputTokens, 80);
});

test("isModelAllowed checks model access against a policy profile", () => {
  assert.equal(isModelAllowed("mock-bedrock-claude"), true);
  assert.equal(isModelAllowed("real-bedrock-model"), false);
});
