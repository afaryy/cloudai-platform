# RAG Knowledge Lifecycle

Governed RAG needs lifecycle control as well as retrieval metadata. A source must have clear provenance, owner, classification, authorised knowledge-base boundary, retention decision, review date, and lifecycle state before it can support a new governed response.

## Lifecycle Contract

`shared/schemas/rag-knowledge-lifecycle/knowledge-source-lifecycle.schema.json` documents a metadata-only source record. The synthetic fixtures show an active demo handbook and a retired legacy handbook.

Lifecycle states are `active`, `paused`, and `retired`.

## Runtime Invariant

The mock RAG route resolves the requested knowledge base through a small local lifecycle registry before returning a response. An active source can support the existing synthetic governed response. A retired or paused source is rejected with a lifecycle-specific validation error.

This demonstrates the control principle: a retired source cannot produce a new governed RAG response.

## Boundary

The registry is local and synthetic. It does not ingest documents, enforce document ACLs, query a vector store, call a model, persist lifecycle state, or access enterprise data.
