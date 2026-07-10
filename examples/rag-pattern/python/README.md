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
Ran 29 tests

OK
```

## Run Local Export

From the repository root:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m rag_ingest.cli \
  --docs examples/rag-pattern/python/sample_docs \
  --out /tmp/cloudai-rag-chunks.json \
  --knowledge-base cloudai-demo-handbook
```

To prepare a local eval dataset from the same synthetic docs:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m rag_ingest.cli \
  --mode eval-dataset \
  --docs examples/rag-pattern/python/sample_docs \
  --out /tmp/cloudai-rag-eval-dataset.json \
  --knowledge-base cloudai-demo-handbook \
  --dataset-id cloudai-rag-eval-demo
```

To score synthetic mock responses against the eval dataset:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m rag_ingest.cli \
  --mode score-report \
  --eval-dataset examples/rag-pattern/python/sample_outputs/cloudai-rag-eval-dataset.json \
  --responses examples/rag-pattern/python/sample_outputs/mock-rag-responses.json \
  --out /tmp/cloudai-rag-score-report.json
```

The command writes a local JSON export file outside the repository.
It does not call cloud services, create embeddings, run an LLM, or write to a vector database.

Committed sample outputs are available at:

- `examples/rag-pattern/python/sample_outputs/cloudai-rag-chunks.json`
- `examples/rag-pattern/python/sample_outputs/cloudai-rag-eval-dataset.json`
- `examples/rag-pattern/python/sample_outputs/mock-rag-responses.json`
- `examples/rag-pattern/python/sample_outputs/cloudai-rag-score-report.json`

## Local Flow

```text
synthetic markdown docs
  -> local ingest and chunking
  -> governance-aligned chunk JSON
  -> local eval dataset JSON
  -> synthetic response-quality score report
```

## Current Boundary

Included:

- local markdown loading
- paragraph-aware chunking
- stable chunk identifiers
- basic governance metadata
- local JSON export helpers
- local CLI wrapper for ingest/export demos
- committed sample output fixture
- local eval dataset preparation
- local response-quality scoring for synthetic mock responses
- unit tests using Python standard library tools

Deferred:

- embeddings
- vector indexes
- retrieval runtime
- automated LLM evaluation
- model-based scoring
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

## Eval Dataset Boundary

The local eval dataset prepares simple deterministic cases with:

- `caseId`
- `question`
- `expectedSourceId`
- `expectedSourceTitle`
- `expectedCitationRequired`
- `sourceChunkId`
- `qualityNotes`

It does not score model responses or call an evaluation framework.

## Quality Scoring Boundary

The local scoring harness checks synthetic mock responses for:

- response present
- expected source present
- citation requirement met
- unsupported marker absent

It is a deterministic local scoring example, not a model-based evaluator.
