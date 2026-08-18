# AgentCore Governed RAG POC — Sanitized Evidence Template

## Scope

- Date and time window:
- Operator:
- Region: `ap-southeast-2`
- Synthetic source confirmation: yes/no
- Deployment approval recorded separately: yes/no
- Teardown approval recorded separately: yes/no

## Preflight Categories

| Category | Pass / blocked | Notes without identifiers |
| --- | --- | --- |
| Node runtime |  |  |
| AgentCore CLI |  |  |
| AWS identity |  |  |
| Knowledge-base access |  |  |
| Budget and tags |  |  |
| Teardown owner |  |  |

## Scenario Outcomes

| Scenario | Outcome | Citation present | Control decision | Timestamp |
| --- | --- | --- | --- | --- |
| Active approved source |  |  |  |  |
| Insufficient evidence |  |  |  |  |
| Retired source |  |  |  |  |
| Disabled workload |  |  |  |  |
| Prompt-attack-shaped request |  |  |  |  |
| Direct Runtime bypass |  |  |  |  |

## Behavioural Evaluation Cases

These cases are shared local-contract evidence unless a later protected
validation explicitly records a different evidence level. Denied-tool and
human-approval cases use the existing AgentOps policy contract; they are not
claims that the current read-only RAG Runtime executes tools or owns approval.

| Case | Expected outcome | Expected reason | Evidence level |
| --- | --- | --- | --- |
| Citation missing | Abstain | `insufficient_evidence` | Local contract |
| Stale source | Denied before retrieval | `knowledge_source_retired` | Local contract |
| Provider timeout | Abstain | `retrieval_unavailable` | Local contract |
| Denied tool | Denied before execution | `tool_not_allowed` | Local contract |
| Human-approval boundary | Approval required | `human_approval_required` | Local contract |

The canonical fixture is
[`shared/examples/agentcore-rag-poc/behavioral-evaluation-cases.json`](../../../shared/examples/agentcore-rag-poc/behavioral-evaluation-cases.json).

## Closure

- Aggregate cost range only:
- Runtime / Gateway / knowledge-source teardown result:
- Synthetic storage teardown result:
- Remaining resource categories: none / explain safely
- Evidence reviewed:

Do not add ARNs, account IDs, endpoint URLs, credentials, raw prompts, raw
answers, provider error text, screenshots with private details, state, or logs.
