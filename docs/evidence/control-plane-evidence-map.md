# Control-Plane Evidence Map

P6d connects the existing mock controls into one CloudAI Control Plane evidence story. It shows how a platform team could correlate decisions, lifecycle state, safety verdicts, and human-owned delivery evidence without exposing sensitive payloads or implementing a real runtime proxy.

The map is intentionally metadata-only. It records which control produced which kind of evidence, which synthetic identifier links to that evidence, and what decision or state the control contributed.

## Why This Exists

Enterprise AI platforms need more than individual controls. They need a way to explain how controls fit together:

- Was the reusable capability admitted before use?
- Was the runtime agent action allowed, denied, paused, or sent for approval?
- Was the knowledge source active or retired?
- Did a guardrail verdict require review?
- Was AI-assisted delivery evidence reviewed by a human?
- Which supplier decision and workload-admission result were correlated before execution authority was considered?

The evidence map turns those separate answers into an auditable platform narrative.

## Evidence Lanes

| Lane | Existing source | What it proves |
|---|---|---|
| Runtime AgentOps | `shared/examples/agentops-governance/` | Agent identity, tool permission, policy verdict, approval requirement, budget state, and traceability. |
| Capability Governance | `shared/examples/agent-capability-governance/` | Capability registry state, declared permissions, scan/evaluation evidence, admission decision, and lifecycle status. |
| RAG Knowledge Lifecycle | `shared/examples/rag-knowledge-lifecycle/` | Source provenance, owner, classification, authorised knowledge-base boundary, review date, and active/paused/retired state. |
| Guardrails as a Service | `shared/examples/guardrails-as-a-service/` | Safety verdicts for synthetic PII, jailbreak, prompt-injection, high-risk, and safe signals. |
| AI-Assisted Review Evidence | `shared/examples/ai-assisted-devsecops/` | Human-owned review evidence for AI-assisted code review, threat modelling, CI failure summaries, and release-note drafts. |

The five lanes remain unchanged. A separate required
`workloadDependencyCorrelation` object connects one workload profile to its
supplier assessment, recorded supplier decision, admission result, evaluation
time, and synthetic evidence paths. It is separate because workload dependency
correlation is not another runtime or governance lane.

## Control-Plane Flow

```text
Workload supplier-dependency declaration
  -> recorded supplier decision replay
  -> admission-time supplier re-evaluation
  -> workload dependency correlation
  -> capability admission evidence
  -> runtime AgentOps decision
  -> RAG knowledge lifecycle state
  -> Guardrails as a Service verdict
  -> AI-assisted delivery review evidence
  -> CloudAI Control Plane evidence map
```

The correlation test resolves and parses every referenced synthetic JSON path,
so it proves the evidence graph is internally complete. It does not retrieve
external evidence or prove that a supplier, approval, workload, or runtime
exists. The control plane does not need to store raw prompts, tool payloads,
retrieved documents, source content, credentials, or sensitive data to show
this pattern. It can retain metadata, decision IDs, timestamps, roles, and
review states.

## Boundary

P6d does not:

- execute an agent
- call an LLM or cloud provider
- install or scan real skills
- proxy runtime traffic
- persist audit records
- query a vector store
- inspect source content
- approve a deployment
- schedule a workload or grant Kubernetes/GPU access

It demonstrates the evidence shape that a future implementation could use.

## Portfolio Use

Use this map to explain:

- how platform controls become auditable evidence
- how capability governance differs from runtime governance
- how RAG lifecycle and guardrails connect to AgentOps
- how AI-assisted delivery evidence remains human-owned
- how a CloudAI control plane can stay provider-neutral while linking AWS, Azure, GCP, GitHub, and NVIDIA-style governance patterns in future work
