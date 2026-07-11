import type { ChatRequest, RagGovernanceRequest } from "../types.js";
import { HttpError } from "./errors.js";
import {
  DEFAULT_POLICY_PROFILE,
  isModelAllowed,
  type MockPolicyProfile
} from "./policyProfile.js";

const RAG_REQUEST_KEYS = ["requestId", "query", "dataClassification", "retrieval", "governance"] as const;
const RAG_RETRIEVAL_KEYS = ["allowedKnowledgeBases", "maxDocuments", "requiredMetadata"] as const;
const RAG_GOVERNANCE_KEYS = ["requireCitations", "allowExternalEgress", "policyProfile"] as const;
const RAG_REQUIRED_METADATA_VALUES = [
  "sourceId",
  "sourceTitle",
  "classification",
  "citationUrl",
  "retrievedAt"
] as const;

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

export function normalizeRagGovernanceRequest(input: unknown): RagGovernanceRequest {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object.", "invalid_body");
  }

  assertOnlyKeys(input, RAG_REQUEST_KEYS, "request");

  const requestId = readRequiredString(input, "requestId", "invalid_rag_request");
  const query = readRequiredString(input, "query", "invalid_rag_query").trim();

  if (query.length === 0) {
    throw new HttpError(400, "query must not be empty.", "empty_rag_query");
  }

  const dataClassification = readDataClassification(input.dataClassification);
  const retrieval = readRetrieval(input.retrieval);
  const governance = readGovernance(input.governance);

  return {
    requestId,
    query,
    dataClassification,
    retrieval,
    governance
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  input: Record<string, unknown>,
  key: string,
  errorCode: string
): string {
  if (typeof input[key] !== "string") {
    throw new HttpError(400, `${key} is required and must be a string.`, errorCode);
  }

  return input[key];
}

function readDataClassification(value: unknown): RagGovernanceRequest["dataClassification"] {
  if (value === "synthetic-public" || value === "synthetic-restricted") {
    return value;
  }

  throw new HttpError(400, "dataClassification is not supported in mock mode.", "invalid_rag_request");
}

function readRetrieval(value: unknown): RagGovernanceRequest["retrieval"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "retrieval is required and must be an object.", "invalid_rag_request");
  }

  assertOnlyKeys(value, RAG_RETRIEVAL_KEYS, "retrieval");

  if (typeof value.maxDocuments !== "number" || value.maxDocuments < 1) {
    throw new HttpError(400, "retrieval.maxDocuments must be a positive number.", "invalid_rag_request");
  }

  return {
    allowedKnowledgeBases: readStringArray(value.allowedKnowledgeBases, "retrieval.allowedKnowledgeBases"),
    maxDocuments: value.maxDocuments,
    requiredMetadata: readStringArray(
      value.requiredMetadata,
      "retrieval.requiredMetadata",
      [...RAG_REQUIRED_METADATA_VALUES]
    )
  };
}

function readGovernance(value: unknown): RagGovernanceRequest["governance"] {
  if (!isRecord(value)) {
    throw new HttpError(400, "governance is required and must be an object.", "invalid_rag_request");
  }

  assertOnlyKeys(value, RAG_GOVERNANCE_KEYS, "governance");

  if (typeof value.requireCitations !== "boolean") {
    throw new HttpError(400, "governance.requireCitations must be a boolean.", "invalid_rag_request");
  }

  if (typeof value.allowExternalEgress !== "boolean") {
    throw new HttpError(400, "governance.allowExternalEgress must be a boolean.", "invalid_rag_request");
  }

  if (typeof value.policyProfile !== "string" || value.policyProfile.trim().length === 0) {
    throw new HttpError(400, "governance.policyProfile is required and must be a string.", "invalid_rag_request");
  }

  return {
    requireCitations: value.requireCitations,
    allowExternalEgress: value.allowExternalEgress,
    policyProfile: value.policyProfile.trim()
  };
}

function assertOnlyKeys(
  input: Record<string, unknown>,
  allowedKeys: readonly string[],
  objectName: string
): void {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.includes(key)) {
      throw new HttpError(400, `${objectName}.${key} is not supported in mock mode.`, "invalid_rag_request");
    }
  }
}

function readStringArray(value: unknown, fieldName: string, allowedValues?: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, `${fieldName} must include at least one item.`, "invalid_rag_request");
  }

  if (!value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw new HttpError(400, `${fieldName} must contain only non-empty strings.`, "invalid_rag_request");
  }

  const normalized = value.map((item) => item.trim());

  if (allowedValues && !normalized.every((item) => allowedValues.includes(item))) {
    throw new HttpError(400, `${fieldName} contains an unsupported value.`, "invalid_rag_request");
  }

  return normalized;
}
