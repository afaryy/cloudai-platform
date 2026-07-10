# Governed RAG Pattern

This example documents a mock governance contract for Retrieval-Augmented Generation (RAG).

It does not implement retrieval, embeddings, a vector database, or a RAG API endpoint. The purpose is to define the request and response evidence that a future governed RAG flow should produce.

## Contract Files

Schemas:

- `shared/schemas/rag-governance/rag-request.schema.json`
- `shared/schemas/rag-governance/rag-response.schema.json`

Synthetic examples:

- `shared/examples/rag-governance/rag-request.allowed.json`
- `shared/examples/rag-governance/rag-response.governed.json`
- `shared/examples/rag-governance/rag-egress-blocked.json`

## Governance Intent

The contract captures:

- data classification for the request
- allowed knowledge base boundaries
- required retrieval metadata
- citation requirements
- data egress decisions
- audit metadata

This lets the project discuss RAG governance before adding retrieval infrastructure.

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
- public cloud architecture notes

Deferred scope:

- document ingestion
- chunking
- embeddings
- vector indexes
- retrieval runtime
- LangChain or similar orchestration framework
- provider-hosted knowledge base integration

Python workflow utilities may be added later for ingestion, chunking, eval data preparation, or LLMOps experiments. The current contract stays TypeScript-tested because it belongs to the platform control and API contract layer.
