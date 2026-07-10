# Demo Index

This index helps readers find the runnable and reviewable examples in the repository.

The examples are synthetic and local-first. They are intended to show platform engineering patterns without requiring cloud setup, provider deployments, embeddings, vector databases, or model calls.

## Current Demos

| Demo | Status | What it shows | Start here |
|---|---|---|---|
| Mock GenAI API | Implemented locally under AWS provider app | TypeScript mock API, request metadata, policy profile examples, token guardrail, synthetic responses, and RAG workflow metadata endpoints | `providers/aws/app/api/README.md` |
| Governed RAG Python Flow | Implemented locally under examples | Python ingest, chunk export, evaluation dataset preparation, mock responses, and deterministic score report | `examples/rag-pattern/python/DEMO_WALKTHROUGH.md` |

## Local Demo Flow

```text
Mock GenAI API
  -> demonstrates governed model-access API behavior
  -> exposes local RAG workflow metadata at /rag/status and /rag/artifacts

Governed RAG Python Flow
  -> demonstrates local retrieval evidence and response-quality scoring artifacts
```

These demos are complementary:

- The TypeScript API represents the platform control and model-access layer.
- The Python RAG flow represents local AI workflow utilities for ingest, evaluation preparation, and quality evidence.
- The RAG metadata endpoints connect the two through documented artifact paths, not runtime coupling.

## Deferred Example Tracks

The following folders are placeholders for later phases:

- `examples/ai-assisted-devsecops-pattern/`
- `examples/ai-release-engineering-on-eks/`
- `examples/kubernetes-agent-runtime-exploration/`

They are intentionally not implemented in this phase.

## Run Locally

For the mock GenAI API:

```bash
cd providers/aws/app/api
pnpm install
pnpm run build
pnpm test
pnpm run dev
```

For the Python RAG flow:

```bash
PYTHONPATH=examples/rag-pattern/python python3 -m unittest discover -s examples/rag-pattern/python/tests
```

See `examples/rag-pattern/python/DEMO_WALKTHROUGH.md` for the full RAG flow commands.

## Current Boundary

Included:

- local mock API behavior
- local synthetic RAG artifacts
- deterministic sample outputs
- unit tests
- walkthrough documentation

Deferred:

- real provider deployments
- embeddings
- vector indexes
- retrieval runtime
- model-based evaluation
- EKS release examples
- agent runtime examples
