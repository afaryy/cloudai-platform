# Roadmap

<!-- TODO: Future automation can generate this roadmap from docs/project/status.json. -->

## Phases

| Phase | Name | Status | Outcome |
| --- | --- | --- | --- |
| P0 | Foundation | In progress | Public-safe repo structure, architecture docs, project controls, mock-first guardrails. |
| P1 | AWS GenAI MVP | Not started | Mock GenAI / LLM Gateway and AWS-first integration shape. |
| P2 | Platform Controls | Not started | Policy, approval, audit, and control-plane schemas. |
| P3 | RAG Governance | Not started | Governed retrieval and synthetic data-access examples. |
| P4 | EKS Release Engineering | Placeholder | Helm, Argo CD, and EKS release engineering examples. |
| P5 | AI-assisted DevSecOps | Placeholder | AI-assisted delivery pattern with CI and security controls. |
| P6 | AI Traffic Gateway Research | Research | Agent, tool, workflow, retrieval, and data-access governance research. |
| P7 | LLMOps / GPU Stretch | Stretch | Evaluation, LLMOps, and GPU sandbox exploration. |

## Track Alignment

| Track | Name | Primary phases |
| --- | --- | --- |
| Track A | AWS GenAI Platform Starter | P0, P1, P2 |
| Track B | AI Release Engineering on EKS | P4 |
| Track C | AI-assisted DevSecOps Pattern | P5 |
| Track D | AI Traffic Gateway and Kubernetes-native Agent Runtime Research | P2, P6 |
| Track E | LLMOps / GPU Sandbox | P7 |

## Delivery Rule

Do not build all tracks at once. Advance one small, reviewable phase at a time, keeping mock mode and public safety as defaults.
