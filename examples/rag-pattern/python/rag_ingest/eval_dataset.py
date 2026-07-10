import json
import re
from pathlib import Path

from rag_ingest.exporter import DEFAULT_RETRIEVED_AT
from rag_ingest.models import RagChunk


def chunk_to_eval_case(chunk: RagChunk) -> dict[str, object]:
    """Create a deterministic local eval case from one RAG chunk."""

    return {
        "caseId": _case_id(chunk),
        "question": f"What governance signals are described in {chunk.source_title}?",
        "expectedSourceId": chunk.source_id,
        "expectedSourceTitle": chunk.source_title,
        "expectedCitationRequired": True,
        "sourceChunkId": chunk.chunk_id,
        "sourceChunkIndex": chunk.chunk_index,
        "qualityNotes": [
            "answer should cite the expected source",
        ],
    }


def build_eval_dataset(
    chunks: list[RagChunk],
    *,
    dataset_id: str,
    generated_at: str = DEFAULT_RETRIEVED_AT,
) -> dict[str, object]:
    """Build a local synthetic eval dataset from RAG chunks."""

    cases = [chunk_to_eval_case(chunk) for chunk in chunks]
    return {
        "datasetId": dataset_id,
        "datasetProfile": "local-rag-eval-demo",
        "generatedAt": generated_at,
        "caseCount": len(cases),
        "cases": cases,
    }


def write_eval_dataset_json(
    chunks: list[RagChunk],
    output_path: Path,
    *,
    dataset_id: str,
    generated_at: str = DEFAULT_RETRIEVED_AT,
) -> None:
    """Write a local eval dataset JSON file."""

    dataset = build_eval_dataset(
        chunks,
        dataset_id=dataset_id,
        generated_at=generated_at,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(dataset, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _case_id(chunk: RagChunk) -> str:
    return f"eval-{_slug(chunk.source_id)}-{chunk.chunk_index:04d}"


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "source"
