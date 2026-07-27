# GCP Reference Architecture

GCP support is a future provider mapping track.

## Candidate Mapping Areas

- Gemini Enterprise Agent Platform, Vertex AI, and Model Garden for model, agent, and ML platform capabilities.
- Agent Runtime, Agent Gateway, Agent Identity, Agent Registry, tracing, logging, evaluation, and governance policy patterns for future agent governance mapping.
- Vector Search and managed retrieval services for RAG and enterprise search patterns.
- Cloud IAM for identity.
- Cloud KMS and Secret Manager for encryption and secrets.
- Cloud Logging and Cloud Monitoring for observability.
- Cloud Run, Cloud Functions, or GKE for runtime patterns.
- Private Service Connect and VPC Service Controls for private connectivity and data perimeter patterns.

## AI Platform Considerations

The GCP mapping should acknowledge current Google platform terminology while keeping the provider adapter generic:

- Gemini Enterprise Agent Platform is the current umbrella language for agent, generative AI, and ML platform capabilities in Google documentation.
- Vertex AI and Model Garden remain important service concepts for model discovery, training, deployment, prediction, and migration references.
- Agent Gateway, Agent Runtime, Agent Identity, Agent Registry, tracing, policy, and evaluation concepts map well to the repo's AI traffic governance layer.
- Vector Search, Cloud Storage, BigQuery, Cloud Run, GKE, IAM, Cloud KMS, Secret Manager, Cloud Logging, and Cloud Monitoring provide concrete service mappings behind the provider adapter.

This reference architecture mapping is intentionally non-implementing in the first iteration.
