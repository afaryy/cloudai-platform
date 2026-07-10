from rag_ingest.models import RagChunk


def chunk_markdown_text(
    *,
    source_id: str,
    source_title: str,
    text: str,
    max_chars: int = 800,
) -> list[RagChunk]:
    """Split markdown text into deterministic paragraph-aware chunks."""

    if max_chars < 40:
        raise ValueError("max_chars must be at least 40")

    paragraphs = _normalise_paragraphs(text)
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(_split_long_paragraph(paragraph, max_chars))
            continue

        candidate = paragraph if not current else f"{current}\n\n{paragraph}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            chunks.append(current)
            current = paragraph

    if current:
        chunks.append(current)

    return [
        RagChunk(
            chunk_id=f"{source_id}:{index:04d}",
            chunk_index=index,
            source_id=source_id,
            source_title=source_title,
            text=chunk,
        )
        for index, chunk in enumerate(chunks, start=1)
    ]


def _normalise_paragraphs(text: str) -> list[str]:
    return [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]


def _split_long_paragraph(paragraph: str, max_chars: int) -> list[str]:
    words = paragraph.split()
    parts: list[str] = []
    current = ""

    for word in words:
        if len(word) > max_chars:
            raise ValueError("single token exceeds max_chars")

        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                parts.append(current)
            current = word

    if current:
        parts.append(current)

    return parts
