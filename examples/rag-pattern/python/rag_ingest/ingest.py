from pathlib import Path

from rag_ingest.chunker import chunk_markdown_text
from rag_ingest.models import RagChunk


def ingest_markdown_directory(docs_dir: Path, *, max_chars: int = 800) -> list[RagChunk]:
    """Load synthetic markdown files and attach local governance metadata."""

    if not docs_dir.exists():
        raise FileNotFoundError(f"docs_dir does not exist: {docs_dir}")

    records: list[RagChunk] = []
    for markdown_file in sorted(docs_dir.glob("*.md")):
        text = markdown_file.read_text(encoding="utf-8")
        source_id = markdown_file.stem
        source_title = _extract_title(text, fallback=source_id)
        chunks = chunk_markdown_text(
            source_id=source_id,
            source_title=source_title,
            text=text,
            max_chars=max_chars,
        )
        records.extend([_with_ingest_metadata(chunk) for chunk in chunks])

    return records


def _extract_title(text: str, *, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line.removeprefix("# ").strip()
    return fallback.replace("-", " ").title()


def _with_ingest_metadata(chunk: RagChunk) -> RagChunk:
    metadata = {
        "use_case": "rag-pattern",
        "egress": "local-only",
        "embedding_status": "not-generated",
    }
    return RagChunk(
        chunk_id=chunk.chunk_id,
        chunk_index=chunk.chunk_index,
        source_id=chunk.source_id,
        source_title=chunk.source_title,
        text=chunk.text,
        classification=chunk.classification,
        content_type=chunk.content_type,
        metadata=metadata,
    )
