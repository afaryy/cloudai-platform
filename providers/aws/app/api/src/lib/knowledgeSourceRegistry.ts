import { HttpError } from "./errors.js";

type KnowledgeSourceLifecycle = "active" | "paused" | "retired";

type KnowledgeSourceRecord = {
  sourceId: string;
  sourceTitle: string;
  citationUrl: string;
  lifecycleStatus: KnowledgeSourceLifecycle;
  allowedKnowledgeBases: string[];
};

const KNOWLEDGE_SOURCES: KnowledgeSourceRecord[] = [
  {
    sourceId: "demo-platform-handbook-001",
    sourceTitle: "CloudAI Demo Platform Handbook",
    citationUrl: "https://example.com/cloudai-platform/demo-platform-handbook",
    lifecycleStatus: "active",
    allowedKnowledgeBases: ["demo-platform-handbook"]
  },
  {
    sourceId: "legacy-platform-handbook-001",
    sourceTitle: "Legacy CloudAI Demo Platform Handbook",
    citationUrl: "https://example.com/cloudai-platform/legacy-platform-handbook",
    lifecycleStatus: "retired",
    allowedKnowledgeBases: ["legacy-platform-handbook"]
  }
];

export function requireActiveKnowledgeSource(knowledgeBase: string): KnowledgeSourceRecord {
  const source = KNOWLEDGE_SOURCES.find((candidate) => candidate.allowedKnowledgeBases.includes(knowledgeBase));

  if (!source) {
    throw new HttpError(400, "knowledgeBase is not supported in mock mode.", "unsupported_knowledge_base");
  }

  if (source.lifecycleStatus === "retired") {
    throw new HttpError(400, "knowledgeBase is retired and cannot support a governed RAG response.", "retired_knowledge_source");
  }

  if (source.lifecycleStatus === "paused") {
    throw new HttpError(400, "knowledgeBase is paused and cannot support a governed RAG response.", "paused_knowledge_source");
  }

  return source;
}
