# Governed RAG Pattern

This example documents a mock governance contract and local workflow for Retrieval-Augmented Generation (RAG).

It does not implement retrieval runtime, embeddings, a vector database, or a retrieval or answer-generation RAG endpoint. The purpose is to define the request, response, chunk, evaluation, and scoring evidence that a future governed RAG flow should produce.

## Contract Files

Schemas:

- `shared/schemas/rag-governance/rag-request.schema.json`
- `shared/schemas/rag-governance/rag-response.schema.json`
- `shared/schemas/rag-governance/rag-status.schema.json`
- `shared/schemas/rag-governance/rag-artifacts.schema.json`

Synthetic examples:

- `shared/examples/rag-governance/rag-request.allowed.json`
- `shared/examples/rag-governance/rag-response.governed.json`
- `shared/examples/rag-governance/rag-egress-blocked.json`
- `shared/examples/rag-governance/rag-status.mock.json`
- `shared/examples/rag-governance/rag-artifacts.mock.json`

Local Python workflow:

- `examples/rag-pattern/python/README.md`
- `examples/rag-pattern/python/DEMO_WALKTHROUGH.md`
- `examples/rag-pattern/python/sample_docs/cloudai-demo-handbook.md`
- `examples/rag-pattern/python/sample_outputs/cloudai-rag-chunks.json`
- `examples/rag-pattern/python/sample_outputs/cloudai-rag-eval-dataset.json`
- `examples/rag-pattern/python/sample_outputs/cloudai-rag-score-report.json`

## Governance Intent

The contract captures:

- data classification for the request
- allowed knowledge base boundaries
- required retrieval metadata
- citation requirements
- data egress decisions
- audit metadata

This lets the project discuss RAG governance before adding retrieval infrastructure.

## Local Python Workflow

The local Python workflow demonstrates:

- synthetic markdown ingest
- deterministic chunk export
- governance-aligned metadata
- evaluation dataset preparation
- synthetic mock response scoring
- sample outputs that can be reviewed in the repository

This workflow is local-only. It does not call an LLM, create embeddings, build a vector index, or deploy cloud resources.

## Mock API Metadata Endpoints

The TypeScript mock API exposes RAG workflow metadata without running the Python workflow:

- `GET /rag/status`
- `GET /rag/artifacts`

These endpoints help a reader discover the local RAG contracts, sample outputs, score report, and walkthrough from the platform API layer. They do not execute Python, perform retrieval, call a model, or deploy resources.

## Example Flow

```text
Application / Agent
  -> RAG request with classification and allowed knowledge bases
  -> retrieval policy check
  -> source metadata and citation requirement check
  -> data egress decision
  -> governed response with audit evidence
```

## Current Boundary

Current scope:

- JSON contracts
- synthetic examples
- contract tests
- local Python ingest and chunking
- local evaluation dataset preparation
- local response-quality scoring for synthetic mock responses
- committed sample outputs and walkthrough
- mock API metadata endpoints for local RAG artifacts
- public cloud architecture notes

Deferred scope:

- embeddings
- vector indexes
- retrieval runtime
- model-based evaluation
- LangChain or similar orchestration framework
- provider-hosted knowledge base integration

The RAG governance contracts stay TypeScript-tested where they describe platform control and API contract behavior. Python is used for local AI workflow utilities: ingestion, chunking, evaluation dataset preparation, and deterministic response-quality evidence.
