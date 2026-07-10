from dataclasses import dataclass, field


@dataclass(frozen=True)
class RagChunk:
    """A local, provider-neutral chunk record for RAG governance examples."""

    chunk_id: str
    chunk_index: int
    source_id: str
    source_title: str
    text: str
    classification: str = "synthetic-demo"
    content_type: str = "text/markdown"
    metadata: dict[str, str] = field(default_factory=dict)
