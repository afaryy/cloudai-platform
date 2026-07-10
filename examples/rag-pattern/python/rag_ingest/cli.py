import argparse
import sys
from pathlib import Path
from typing import Optional, Sequence

from rag_ingest.exporter import DEFAULT_RETRIEVED_AT, write_chunks_json
from rag_ingest.ingest import ingest_markdown_directory


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    docs_dir = Path(args.docs)
    output_path = Path(args.out)
    knowledge_base = args.knowledge_base or docs_dir.name

    try:
        chunks = ingest_markdown_directory(docs_dir, max_chars=args.max_chars)
        write_chunks_json(
            chunks,
            output_path,
            knowledge_base=knowledge_base,
            retrieved_at=args.retrieved_at,
        )
    except (FileNotFoundError, OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python3 -m rag_ingest.cli",
        description="Export synthetic local markdown chunks for the CloudAI RAG pattern.",
    )
    parser.add_argument("--docs", required=True, help="Directory containing synthetic markdown files.")
    parser.add_argument("--out", required=True, help="Path to write the exported JSON document.")
    parser.add_argument(
        "--knowledge-base",
        help="Logical knowledge base name. Defaults to the docs directory name.",
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=800,
        help="Maximum characters per chunk. Default: 800.",
    )
    parser.add_argument(
        "--retrieved-at",
        default=DEFAULT_RETRIEVED_AT,
        help=f"Deterministic retrieval timestamp. Default: {DEFAULT_RETRIEVED_AT}.",
    )
    return parser


if __name__ == "__main__":
    raise SystemExit(main())
