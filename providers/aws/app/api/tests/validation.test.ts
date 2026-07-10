import test from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "../src/lib/errors.js";
import { DEFAULT_POLICY_PROFILE } from "../src/lib/policyProfile.js";
import { normalizeChatRequest } from "../src/lib/validation.js";

test("normalizeChatRequest applies the default mock model", () => {
  assert.deepEqual(normalizeChatRequest({ prompt: "Hello" }), {
    prompt: "Hello",
    modelName: DEFAULT_POLICY_PROFILE.defaultModelName
  });
});

test("normalizeChatRequest rejects unsupported models", () => {
  assert.throws(
    () => normalizeChatRequest({ prompt: "Hello", modelName: "real-bedrock-model" }),
    (error) => error instanceof HttpError && error.code === "unsupported_model"
  );
});
