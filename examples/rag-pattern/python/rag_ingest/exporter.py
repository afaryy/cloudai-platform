import json
from pathlib import Path
from urllib.parse import quote

from rag_ingest.models import RagChunk


DEFAULT_RETRIEVED_AT = "2026-07-10T00:00:00.000Z"
DEFAULT_CITATION_BASE_URL = "https://example.com/cloudai-platform/rag-sources"


def chunk_to_export_record(
    chunk: RagChunk,
    *,
    retrieved_at: str = DEFAULT_RETRIEVED_AT,
    citation_base_url: str = DEFAULT_CITATION_BASE_URL,
) -> dict[str, object]:
    """Map a local chunk to governance-aligned JSON field names."""

    return {
        "sourceId": chunk.source_id,
        "sourceTitle": chunk.source_title,
        "citationUrl": _citation_url(citation_base_url, chunk.source_id),
        "classification": _governance_classification(chunk.classification),
        "retrievedAt": retrieved_at,
        "chunkId": chunk.chunk_id,
        "chunkIndex": chunk.chunk_index,
        "contentType": chunk.content_type,
        "metadata": dict(chunk.metadata),
        "text": chunk.text,
    }


def chunks_to_export_document(
    chunks: list[RagChunk],
    *,
    knowledge_base: str,
    retrieved_at: str = DEFAULT_RETRIEVED_AT,
    citation_base_url: str = DEFAULT_CITATION_BASE_URL,
) -> dict[str, object]:
    """Create a deterministic local export document for RAG ingest chunks."""

    records = [
        chunk_to_export_record(
            chunk,
            retrieved_at=retrieved_at,
            citation_base_url=citation_base_url,
        )
        for chunk in chunks
    ]
    return {
        "exportProfile": "local-rag-ingest-demo",
        "knowledgeBase": knowledge_base,
        "recordCount": len(records),
        "retrievedAt": retrieved_at,
        "records": records,
    }


def write_chunks_json(
    chunks: list[RagChunk],
    output_path: Path,
    *,
    knowledge_base: str,
    retrieved_at: str = DEFAULT_RETRIEVED_AT,
    citation_base_url: str = DEFAULT_CITATION_BASE_URL,
) -> None:
    """Write chunk records to a UTF-8 JSON file."""

    document = chunks_to_export_document(
        chunks,
        knowledge_base=knowledge_base,
        retrieved_at=retrieved_at,
        citation_base_url=citation_base_url,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(document, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _governance_classification(classification: str) -> str:
    if classification == "synthetic-demo":
        return "synthetic-public"
    return classification


def _citation_url(citation_base_url: str, source_id: str) -> str:
    return f"{citation_base_url.rstrip('/')}/{quote(source_id, safe='')}"
