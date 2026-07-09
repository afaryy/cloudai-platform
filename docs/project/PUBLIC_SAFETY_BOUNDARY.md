# Public Safety Boundary

<!-- TODO: Future automation can validate public-safety checklist fields from docs/project/status.json. -->

This project is designed for a public GitHub portfolio.

## Do Not Include

- Employer-specific content.
- Internal project names, repository names, or namespaces.
- Screenshots, tickets, dashboards, or private diagrams.
- Real company data, metrics, incidents, or architecture.
- Secrets, credentials, account IDs, tokens, private URLs, or keys.
- Proprietary implementation details.
- Raw prompt logs or private reference text.

## Local Private References

Private reference documents may be kept locally in `_private/` for personal orientation only. The `_private/` folder is ignored by git and must not be staged, committed, copied into public docs, or used as a source for verbatim text.

Raw prompts belong under `_private/prompt-logs/` when they are saved locally. Raw prompts may contain private context, local paths, temporary reasoning, or private reference details, so they must not be committed.

Public prompt logs must be summarized and sanitized. Do not copy employer-specific content, private reference text, internal names, tickets, metrics, links, screenshots, credentials, or proprietary implementation details into public prompt logs.

## Public Content Rules

- Use synthetic examples.
- Use public cloud documentation concepts.
- Keep mock mode as the default.
- Avoid real cloud cost unless explicitly requested and reviewed.
- Keep architecture generic and employer-neutral.
- Clearly label placeholders and future work.
