export type SourceLifecycle = "active" | "retired";
export type EntryPath = "gateway" | "direct-runtime";
export type WorkloadState = "enabled" | "disabled";
export type RuntimeOutcome = "answer" | "abstain" | "denied" | "disabled";

export interface RuntimeRequest {
  requestId: string;
  question: string;
  knowledgeSource: "agentcore-poc-handbook";
  governance: {
    sourceLifecycle: SourceLifecycle;
    requireCitations: boolean;
    entryPath: EntryPath;
    workloadState?: WorkloadState;
  };
}

export interface RuntimeResponse {
  requestId: string;
  outcome: RuntimeOutcome;
  answer?: string;
  reasonCode?: string;
  citations: Array<{ title: string; uri: string }>;
  audit: {
    sourceLifecycle: SourceLifecycle;
    citationPresent: boolean;
  };
}

export type ValidationResult = { ok: true } | { ok: false; reasonCode: "invalid_request" | "invalid_response" };

const requestKeys = new Set(["requestId", "question", "knowledgeSource", "governance"]);
const governanceKeys = new Set(["sourceLifecycle", "requireCitations", "entryPath", "workloadState"]);
const responseKeys = new Set(["requestId", "outcome", "answer", "reasonCode", "citations", "audit"]);
const auditKeys = new Set(["sourceLifecycle", "citationPresent"]);

export function validateRuntimeRequest(value: unknown): ValidationResult {
  if (!isRecord(value) || hasUnknownKeys(value, requestKeys)) return invalidRequest();
  if (!isSyntheticId(value.requestId) || !isBoundedQuestion(value.question)) return invalidRequest();
  if (value.knowledgeSource !== "agentcore-poc-handbook") return invalidRequest();
  if (!isRecord(value.governance) || hasUnknownKeys(value.governance, governanceKeys)) return invalidRequest();

  const governance = value.governance;
  if (!isSourceLifecycle(governance.sourceLifecycle)) return invalidRequest();
  if (typeof governance.requireCitations !== "boolean") return invalidRequest();
  if (!isEntryPath(governance.entryPath)) return invalidRequest();
  if (governance.workloadState !== undefined && !isWorkloadState(governance.workloadState)) return invalidRequest();

  return { ok: true };
}

export function validateRuntimeResponse(value: unknown): ValidationResult {
  if (!isRecord(value) || hasUnknownKeys(value, responseKeys)) return invalidResponse();
  if (!isSyntheticId(value.requestId) || !isRuntimeOutcome(value.outcome)) return invalidResponse();
  if (!Array.isArray(value.citations) || !value.citations.every(isCitation)) return invalidResponse();
  if (!isRecord(value.audit) || hasUnknownKeys(value.audit, auditKeys)) return invalidResponse();
  if (!isSourceLifecycle(value.audit.sourceLifecycle) || typeof value.audit.citationPresent !== "boolean") return invalidResponse();
  if (value.answer !== undefined && (typeof value.answer !== "string" || value.answer.length > 1_000)) return invalidResponse();
  if (value.reasonCode !== undefined && (typeof value.reasonCode !== "string" || value.reasonCode.length > 80)) return invalidResponse();
  if (value.outcome === "answer" && (!value.answer || value.citations.length === 0 || !value.audit.citationPresent)) return invalidResponse();
  if (value.outcome !== "answer" && value.answer !== undefined) return invalidResponse();
  return { ok: true };
}

function isCitation(value: unknown): value is { title: string; uri: string } {
  return isRecord(value)
    && Object.keys(value).length === 2
    && typeof value.title === "string"
    && value.title.length > 0
    && value.title.length <= 160
    && typeof value.uri === "string"
    && value.uri.startsWith("synthetic://");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUnknownKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(value).some((key) => !allowed.has(key));
}

function isSyntheticId(value: unknown): value is string {
  return typeof value === "string" && /^synthetic-request-[a-z0-9-]+$/.test(value);
}

function isBoundedQuestion(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 500;
}

function isSourceLifecycle(value: unknown): value is SourceLifecycle {
  return value === "active" || value === "retired";
}

function isEntryPath(value: unknown): value is EntryPath {
  return value === "gateway" || value === "direct-runtime";
}

function isWorkloadState(value: unknown): value is WorkloadState {
  return value === "enabled" || value === "disabled";
}

function isRuntimeOutcome(value: unknown): value is RuntimeOutcome {
  return value === "answer" || value === "abstain" || value === "denied" || value === "disabled";
}

function invalidRequest(): ValidationResult {
  return { ok: false, reasonCode: "invalid_request" };
}

function invalidResponse(): ValidationResult {
  return { ok: false, reasonCode: "invalid_response" };
}
