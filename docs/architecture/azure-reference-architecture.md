# Azure Reference Architecture

Azure support is a future provider mapping track.

## Candidate Mapping Areas

- Microsoft Foundry as the unified AI application and agent development platform.
- Foundry Models sold by Azure, including Azure-hosted OpenAI models where approved, for model access.
- Azure AI Search for retrieval-augmented generation and enterprise search patterns.
- Microsoft Entra ID for identity.
- Azure Key Vault for secrets and key management.
- Azure Monitor for observability.
- Azure API Management, Azure Functions, App Service, Container Apps, or AKS for gateway and runtime patterns.
- Private Link, managed identities, and network-isolated service access for enterprise deployment patterns.

## AI Platform Considerations

The Azure mapping should keep service names current while preserving the architecture boundary:

- Microsoft Foundry is the current umbrella platform language for projects, agents, models, and AI application development.
- Azure OpenAI remains a concrete model access pattern under approved Azure model deployment and regional availability constraints.
- Azure AI Search is the reference retrieval layer for private RAG patterns.
- Azure API Management provides the enterprise API boundary for authentication, scopes, rate limits, and onboarding.
- Microsoft Entra ID, managed identities, Key Vault, Private Link, Azure Monitor, and Application Insights map directly to the secure AI enablement controls described in the control plane.

This reference architecture mapping is intentionally non-implementing in the first iteration.
