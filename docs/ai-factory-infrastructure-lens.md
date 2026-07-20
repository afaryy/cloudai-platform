# AI Factory Infrastructure Lens

An AI Factory is not just a GPU cluster. It is an integrated operating and infrastructure pattern for turning foundation models, enterprise data, AI tools, and compute capacity into repeatable business AI capability.

For this portfolio, the useful lesson is not "deploy every AI Factory component." The useful lesson is how Cloud & AI platform engineering supports the factory layer around models and agents: identity, network, encryption, delivery, governance, observability, FinOps, resilience, and evidence.

## Core Thesis

Traditional cloud architecture does not disappear. It becomes AI-ready platform architecture.

AI workloads increase pressure on every platform layer:

- larger models increase training and inference capacity needs;
- longer reasoning increases inference duration and token consumption;
- larger context windows increase memory, bandwidth, and cost pressure;
- agentic workflows create more downstream tool calls, identity decisions, audit events, and failure modes;
- production AI needs feedback loops for evaluation, monitoring, improvement, and retirement.

The platform responsibility is to make those workloads secure, governed, observable, cost-aware, and repeatable.

## AI Factory Lifecycle

The high-level lifecycle is:

```text
foundation models + enterprise data + AI tools
  -> evaluation and customization
  -> deployment and inference
  -> monitoring, audit, and cost evidence
  -> feedback and continuous improvement
```

The same lifecycle can apply to a model, RAG workflow, agent capability, or AI-assisted engineering workflow. The details differ, but the platform controls repeat.

## Platform Responsibility Mapping

| AI Factory concern | CloudAI Platform responsibility |
|---|---|
| Cloud foundation | Landing zone patterns, Terraform, backend locking, GitHub OIDC, IAM, network, KMS, secrets, and cleanup boundaries. |
| Release engineering | EKS release pattern, Helm packaging, Argo CD promotion model, release gates, rollback guidance, and evidence capture. |
| Model and agent governance | Governed model access, capability registry, skill card, scan result, evaluation evidence, admission decision, and lifecycle status. |
| RAG and data access | Source provenance, classification, authorised knowledge boundaries, retrieval metadata, citation requirements, retention, and review. |
| Runtime AgentOps | Agent identity, tool permissions, policy verdicts, human approval, traceability, budgets, pause or terminate state, and audit evidence. |
| Observability and FinOps | Token and cost estimates, request metadata, budget states, release evidence, evaluation evidence, and future telemetry export patterns. |
| Future compute plane | SageMaker AI lifecycle services and optional accelerated compute references such as HyperPod with EKS or Slurm orchestration. |

## Inference Scaling Pressure

AI Factory infrastructure is driven by more than training. Modern enterprise AI also has an inference scaling problem.

Key drivers include:

- **larger models:** more parameters and higher serving requirements;
- **longer reasoning:** more intermediate steps before a final answer;
- **larger context:** more input tokens and memory pressure;
- **agentic workflows:** more calls to tools, retrieval systems, APIs, and policy controls;
- **production feedback loops:** more telemetry, evaluation, audit, and continuous-improvement data.

This is why the portfolio includes AI FinOps, observability, AgentOps, release gates, and capacity language. They are not side topics; they are the operating controls that make AI workloads manageable at scale.

## Relationship To Current Phases

| Phase | AI Factory interpretation |
|---|---|
| P1 GenAI Gateway | Governed model-access boundary for inference requests. |
| P2 Platform Controls | Policy, validation, guardrails, request metadata, and audit-style evidence. |
| P3 RAG Governance | Controlled enterprise knowledge access with source provenance and evidence. |
| P4 EKS Release Engineering | Kubernetes packaging, promotion, rollback, and optional bounded sandbox readiness for AI services. |
| P5 AI-Assisted DevSecOps | Human-owned AI-assisted delivery with CI, review, threat-model, and release evidence. |
| P6 AI Traffic Governance | Runtime AgentOps, capability governance, RAG lifecycle, and evidence scenarios. |
| P8 Bounded Bedrock Sandbox | Narrow synthetic provider-access and Guardrail validation through short-lived identity, least privilege, manual approval, and sanitized evidence. |
| P7 AI Factory / LLMOps / GPU Stretch | Future design-first exploration of evaluation, LLMOps, accelerated compute, and AI Factory operating patterns. |

## Boundary

This repository does not currently deploy a full AI Factory.

Current boundaries:

- no real model training;
- no GPU cluster deployment;
- no HyperPod deployment;
- no persistent provider-backed AI application, provider-backed RAG runtime, or Bedrock AgentCore resource;
- no real enterprise data;
- no committed cloud account values, credentials, state, tfvars, plan files, kubeconfig, or live endpoints.

P8 has validated a bounded synthetic Bedrock model-access and Guardrail path. It is not evidence of a production AI service, broad Guardrail quality, or an AI Factory deployment.

Any later personal sandbox proof of concept must use synthetic data, explicit budget controls, manual approval, short-lived resources, teardown evidence, and no committed private values.

## Portfolio Positioning

CloudAI Platform demonstrates the platform-engineering layer of an AI Factory: secure cloud foundations, infrastructure as code, Kubernetes release engineering, governed model and agent access, RAG lifecycle controls, observability, FinOps, and evidence-based operations for AI workloads.

The career signal is:

> I build the governed platform around enterprise AI so teams can move safely from experimentation to production.
