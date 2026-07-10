import type { ChatRequest } from "../types.js";
import { HttpError } from "./errors.js";
import {
  DEFAULT_POLICY_PROFILE,
  isModelAllowed,
  type MockPolicyProfile
} from "./policyProfile.js";

export function normalizeChatRequest(
  input: unknown,
  profile: MockPolicyProfile = DEFAULT_POLICY_PROFILE
): Required<ChatRequest> {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }

  if (typeof input.prompt !== "string") {
    throw new HttpError(400, "prompt is required and must be a string.", "invalid_prompt");
  }

  const prompt = input.prompt.trim();
  if (prompt.length === 0) {
    throw new HttpError(400, "prompt must not be empty.", "empty_prompt");
  }

  if (prompt.length > profile.maxPromptCharacters) {
    throw new HttpError(
      400,
      `prompt must be ${profile.maxPromptCharacters} characters or fewer.`,
      "prompt_too_long"
    );
  }

  const modelName = typeof input.modelName === "string" && input.modelName.trim().length > 0
    ? input.modelName.trim()
    : profile.defaultModelName;

  if (!isModelAllowed(modelName, profile)) {
    throw new HttpError(400, "modelName is not supported in mock mode.", "unsupported_model");
  }

  return { prompt, modelName };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
