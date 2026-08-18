# AgentCore Governed RAG POC Runbook

## Status

**Deployment and primary functional validation complete.** The synthetic
Knowledge Base, AgentCore Runtime, Gateway, and Runtime target were created
through the protected GitHub Actions/Terraform path. Direct Bedrock preflight
and IAM-authenticated Gateway evidence passed in run
[32144157616](https://github.com/afaryy/cloudai-platform/actions/runs/32144157616).
Teardown and additional scenario coverage remain separately gated.

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
7. Run the protected `ingest` mode and wait for `COMPLETE` before querying.
8. Run the protected `invoke` mode and retain only the sanitized synthetic response artifact.
9. Extend the invocation matrix to the six deterministic scenarios only after the active cited-answer path passes.
10. Obtain separate teardown approval, destroy in the recorded dependency order,
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
source, then synthetic storage. The active cited-answer path is live validated;
teardown evidence is a separate closure record and is not implied by deployment
success.

## Portfolio Statement

> Built and validated a governed AgentCore RAG control path with
> synthetic data, gateway-only admission, deterministic safety boundaries,
> citations-or-abstention behaviour, metadata-safe evidence, and
> confirmation-gated sandbox controls. Deployed and functionally validated the
> same path through Terraform and GitHub Actions with a protected Knowledge Base
> ingestion job, direct Bedrock preflight, and IAM-authenticated Gateway evidence.

## Future Retrieval Evolution

Classic RAG, GraphRAG, and Agentic RAG solve different problems. This POC does
not claim that agentic retrieval is automatically better. It establishes a
reliable governed retrieval baseline first; a later GraphRAG or Agentic RAG
exercise must demonstrate a distinct relationship-reasoning or multi-step
retrieval requirement and retain the same access, citation, evaluation, and
human-control boundaries.
