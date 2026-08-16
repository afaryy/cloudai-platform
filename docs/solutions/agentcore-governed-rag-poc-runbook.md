# AgentCore Governed RAG POC Runbook

## Status

**Local implementation and mock-only validation complete.** No AgentCore,
Gateway, Runtime, knowledge base, provider retrieval, or AWS resource has been
created by this POC.

This runbook is for a personal Sydney sandbox using only self-authored,
synthetic material. It is not production-ready guidance.

## Objective

Demonstrate a read-only knowledge assistant where deterministic platform
controls decide access, source lifecycle, disablement, and approval boundaries.
The model may only return a cited answer or a safe abstention.

## Mandatory Controls

- Fixed region: `ap-southeast-2`.
- Gateway-only Runtime entry; direct Runtime access is denied.
- Synthetic source material only.
- Citations required for answers; missing evidence returns an abstention.
- No tools, writes, browser access, code execution, durable memory, or
  autonomous actions.
- Metadata-only evidence; no raw prompts, answers, credentials, identifiers,
  endpoints, or account details in the repository.
- Separate manual approval for preflight/deployment and teardown.
- Terraform is the sole infrastructure definition; GitHub Actions with OIDC is
  the sole resource-creation or update path.

## Synthetic Validation Cases

| Scenario | Expected outcome |
| --- | --- |
| Active approved source | Cited answer |
| Insufficient evidence | Abstention with `insufficient_evidence` |
| Retired source | Denied before retrieval |
| Disabled workload | Disabled before retrieval |
| Prompt-attack-shaped request | Denied before retrieval |
| Direct Runtime bypass | Denied before retrieval |

## Local Validation

Run the local suite:

```bash
CI=true corepack pnpm@11.7.0 --dir providers/aws/app/agentcore-rag-runtime test
```

This validates contracts, HTTP boundary, deterministic admission, sanitized
provider failures, citations-or-abstention behaviour, and confirmation gates.
It does not make an AWS call.

## Sandbox Sequence

1. Review this runbook, the architecture design, cost boundary, and teardown owner.
2. Run the read-only preflight and resolve every blocked category.
3. Run `terraform-agentcore-rag-sandbox` in `validate` mode through GitHub
   Actions; this requires no AWS credentials.
4. Review `bootstrap-plan`, then use the approved `bootstrap-apply` mode to
   create only ECR and the required IAM roles.
5. Run `build-agentcore-rag-image` to publish one immutable image digest using
   its dedicated OIDC role. Store the digest only in the protected GitHub
   Environment.
6. Review `deploy-plan`, then obtain a fresh approval for `deploy-apply`.
7. Validate the six scenarios through the Gateway and retain only sanitized evidence.
8. Obtain separate teardown approval, destroy in the recorded dependency order,
   and record sanitized closure evidence.

Do not create, update, or destroy AgentCore resources from a local terminal.
The GitHub Actions workflows provide the reviewed and auditable delivery path.

If Bootstrap reports an AWS permission denial, use the scoped
[IAM remediation policy](agentcore-bootstrap-iam-remediation.md) before
retrying. Do not replace it with an administrator policy.

## Evidence and Teardown

Use the [evidence template](../evidence/templates/agentcore-governed-rag-poc-evidence.md).
The completed [read-only preflight evidence](../evidence/agentcore-governed-rag-preflight-evidence.md)
records only pass/blocked categories and no identity details.
The teardown order is: Gateway target, Gateway, Runtime, knowledge base/data
source, then synthetic storage. Do not mark the POC live-validated until both
scenario evidence and teardown evidence are complete.

## Portfolio Statement

> Built and locally validated a governed AgentCore RAG control path with
> synthetic data, gateway-only admission, deterministic safety boundaries,
> citations-or-abstention behaviour, metadata-safe evidence, and
> confirmation-gated sandbox controls.

## Future Retrieval Evolution

Classic RAG, GraphRAG, and Agentic RAG solve different problems. This POC does
not claim that agentic retrieval is automatically better. It establishes a
reliable governed retrieval baseline first; a later GraphRAG or Agentic RAG
exercise must demonstrate a distinct relationship-reasoning or multi-step
retrieval requirement and retain the same access, citation, evaluation, and
human-control boundaries.
