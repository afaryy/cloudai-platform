# Python RAG Ingest Skeleton

This example adds a lightweight Python workflow for local RAG document preparation.
It uses synthetic markdown only and does not call cloud services, embedding models, vector databases, or orchestration frameworks.

## What It Demonstrates

- loading local markdown documents
- splitting content into deterministic chunks
- attaching provider-neutral governance metadata
- exporting chunks to governance-aligned JSON field names
- marking content as synthetic demo material
- keeping egress status local-only
- preparing a clean boundary for future embeddings, retrieval, and evaluation work

## Run Tests

From the repository root:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m unittest discover -s examples/rag-pattern/python/tests
```

Expected result:

```text
Ran 11 tests

OK
```

## Current Boundary

Included:

- local markdown loading
- paragraph-aware chunking
- stable chunk identifiers
- basic governance metadata
- local JSON export helpers
- unit tests using Python standard library tools

Deferred:

- embeddings
- vector indexes
- retrieval runtime
- LangChain or similar orchestration framework
- provider-hosted knowledge base integration
- cloud deployment

## Example Output Shape

Each chunk is represented as a local `RagChunk` record with:

- `chunk_id`
- `chunk_index`
- `source_id`
- `source_title`
- `classification`
- `content_type`
- `metadata`
- `text`

The metadata intentionally stays small so future work can map it to the RAG governance contracts under `shared/schemas/rag-governance/`.

## JSON Export Boundary

The exporter maps local chunks to field names used by the governed RAG contract:

- `sourceId`
- `sourceTitle`
- `citationUrl`
- `classification`
- `retrievedAt`

The export also includes chunk-specific fields such as `chunkId`, `chunkIndex`, `contentType`, `metadata`, and `text`.
This is not a full governed RAG response; it is a local ingest artifact that can support later retrieval and evaluation work.
