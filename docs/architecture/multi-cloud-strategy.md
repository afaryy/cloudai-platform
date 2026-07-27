# Multi-Cloud Strategy

The platform is AWS-first and multi-cloud-ready. The goal is to keep control-plane concepts portable while allowing each provider adapter to use native services responsibly.

## Strategy

- Keep policies, schemas, and governance concepts provider-neutral.
- Implement AWS first using public AWS service concepts.
- Treat Azure and GCP as reference architecture mappings until implementation phases begin.
- Avoid lowest-common-denominator architecture; use provider strengths behind stable abstractions.

## Provider Readiness

- AWS: first implementation provider.
- Azure: placeholder for Azure AI Foundry, Azure OpenAI, identity, and observability mappings.
- GCP: placeholder for Vertex AI, IAM, network, and observability mappings.
