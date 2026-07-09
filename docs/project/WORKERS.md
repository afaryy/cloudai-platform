# Worker Roles

<!-- TODO: Future automation can map worker ownership to phases and tracks from docs/project/status.json. -->

These AI-assisted worker roles define how Codex-based development should be scoped for `cloudai-platform`. They are project operating roles, not staffing roles.

All workers must keep the repository portfolio-ready, synthetic, mock-first, and reusable.

## Principal Architect Worker

### Mission

Own control-plane architecture, provider abstraction, roadmap, and architectural consistency across phases and tracks.

### Files Owned

- `README.md`
- `docs/architecture.md`
- `docs/control-plane.md`
- `docs/cloud-provider-abstraction.md`
- `docs/multi-cloud-strategy.md`
- `docs/project/ROADMAP.md`
- `docs/project/DECISION_LOG.md`
- `docs/project/status.json`

### Should Not Touch

- Full prompt transcripts or local-only working notes.
- Provider implementation code unless reviewing architecture boundaries.
- Terraform resources unless clarifying architecture intent.

### Quality Checklist

- Architecture remains AWS-first and multi-cloud-ready.
- Control-plane responsibilities are distinct from provider adapters.
- GenAI / LLM Gateway and AI Traffic Governance are clearly separated.
- Roadmap changes stay phase-aligned and do not over-expand scope.
- Public wording is synthetic and reusable.

### Example Prompt

```text
Act as the Principal Architect Worker. Review docs/architecture.md and docs/control-plane.md for consistency with the AWS-first, multi-cloud-ready CloudAI Control Plane model. Update only portfolio-ready documentation and commit the change.
```

## AWS Platform Worker

### Mission

Own AWS implementation direction for Bedrock, API Gateway, Lambda, DynamoDB, S3, CloudWatch, IAM, and KMS.

### Files Owned

- `providers/aws/README.md`
- `providers/aws/app/`
- `providers/aws/infra/terraform/modules/api-gateway/`
- `providers/aws/infra/terraform/modules/lambda/`
- `providers/aws/infra/terraform/modules/dynamodb/`
- `providers/aws/infra/terraform/modules/s3/`
- `providers/aws/infra/terraform/modules/cloudwatch/`
- `providers/aws/infra/terraform/modules/iam/`
- `providers/aws/infra/terraform/modules/kms/`
- `docs/aws-reference-architecture.md`

### Should Not Touch

- Azure or GCP implementation beyond mapping notes.
- Local working-note files.
- Real AWS credentials, account IDs, or deployment state.
- Live deployment instructions without explicit approval.

### Quality Checklist

- Uses mock mode unless a task explicitly permits cloud interaction.
- Keeps AWS service usage based on public AWS concepts.
- Avoids real credentials, real account identifiers, and real cost.
- Documents assumptions before adding implementation.
- Keeps provider-specific logic behind adapter boundaries.

### Example Prompt

```text
Act as the AWS Platform Worker. Add portfolio-ready AWS Bedrock integration notes to providers/aws/README.md and docs/aws-reference-architecture.md. Do not add Terraform resources or real credentials. Commit the documentation update.
```

## Terraform / IaC Worker

### Mission

Own Terraform module structure, environments, validation, security notes, and future GitHub OIDC design.

### Files Owned

- `providers/aws/infra/terraform/`
- `.github/workflows/terraform-validate.yml`
- `.github/workflows/terraform-plan.yml`
- `docs/aws-reference-architecture.md`
- `docs/secure-ai-enablement.md`
- `docs/project/GAP_ANALYSIS.md`

### Should Not Touch

- Application API code.
- Real Terraform state files.
- Real backend configuration for live accounts.
- Provider credentials or secrets.

### Quality Checklist

- Terraform remains validate-only until deployment is explicitly approved.
- State files, plans, and `.terraform/` remain ignored.
- Security notes cover IAM, KMS, secrets, logging, and least privilege.
- OIDC design is documented before any live workflow is added.
- Module boundaries are small and reviewable.

### Example Prompt

```text
Act as the Terraform / IaC Worker. Add portfolio-ready Terraform module README notes for the AWS foundation placeholders and update terraform validation guidance. Do not create deployable resources. Commit the docs-only change.
```

## Application API Worker

### Mission

Own the TypeScript API, mock Bedrock client, request metadata, token estimation, and tests.

### Files Owned

- `providers/aws/app/api/`
- `providers/aws/app/mock-ai-worker/`
- `scripts/estimate-token-cost.ts`
- `scripts/ingest-sample-docs.ts`
- `shared/schemas/`
- `shared/examples/`
- Future test files for API and mock behavior.

### Should Not Touch

- Real Bedrock calls unless explicitly approved in a later phase.
- Terraform modules.
- Full prompt transcripts or local references.
- UI/frontend work unless required by an API demo.

### Quality Checklist

- Mock mode is the default.
- Request metadata includes synthetic request IDs and safe labels.
- Token estimation uses synthetic pricing assumptions unless otherwise approved.
- Tests cover mock success, validation failure, and safety boundaries.
- No secrets, credentials, or real user data appear in examples.

### Example Prompt

```text
Act as the Application API Worker. Design a mock TypeScript GenAI gateway API with request metadata and token estimation. Use synthetic examples only, add tests, and commit the implementation.
```

## Security & Governance Worker

### Mission

Own the public safety boundary, IAM, KMS, secrets, responsible AI checklist, and policy documentation.

### Files Owned

- `docs/project/PUBLIC_SAFETY_BOUNDARY.md`
- `docs/secure-ai-enablement.md`
- `docs/responsible-ai-checklist.md`
- `docs/governed-model-access.md`
- `docs/ai-traffic-governance.md`
- `shared/policies/`
- `providers/aws/infra/terraform/modules/iam/`
- `providers/aws/infra/terraform/modules/kms/`
- `providers/aws/infra/terraform/modules/secrets/`

### Should Not Touch

- Full prompt transcripts except to confirm they remain ignored.
- Real secrets, credentials, or account-specific policy.
- Environment-specific access patterns.
- Runtime implementation outside security review scope.

### Quality Checklist

- Local-only working folders remain ignored and unstaged.
- Public docs do not contain restricted text, screenshots, credentials, or restricted names.
- IAM and KMS guidance is least-privilege and provider-public.
- Responsible AI checklist is clear and actionable.
- Policy docs distinguish documented intent from implemented enforcement.

### Example Prompt

```text
Act as the Security & Governance Worker. Review public safety, responsible AI, and governed model access docs for gaps. Update only portfolio-ready docs and commit the change.
```

## FinOps & Observability Worker

### Mission

Own token cost estimation, request IDs, logs, metrics, dashboards, and runbooks.

### Files Owned

- `docs/ai-finops.md`
- `docs/observability.md`
- `docs/operations-runbook.md`
- `scripts/estimate-token-cost.ts`
- `shared/schemas/`
- Future dashboard and telemetry examples.

### Should Not Touch

- Real cloud billing data.
- Real provider usage metrics.
- Secrets or account identifiers.
- Deployment automation unless adding observability documentation.

### Quality Checklist

- Cost examples are synthetic and clearly labeled.
- Request IDs and labels are safe for public examples.
- Observability docs cover logs, metrics, traces, evaluation, and audit events.
- Runbooks stay mock-first until runtime exists.
- Dashboards use synthetic data only.

### Example Prompt

```text
Act as the FinOps & Observability Worker. Define synthetic token-cost and request-observability fields for the mock gateway. Update docs and schemas only, then commit.
```

## AI DevOps / EKS Release Worker

### Mission

Own GitHub Actions, Helm, rollout, rollback, probes, PodDisruptionBudget, EKS notes, and failure modes.

### Files Owned

- `.github/workflows/`
- `helm/`
- `argocd/`
- `providers/aws/infra/terraform/modules/eks/`
- `docs/ai-release-engineering-on-eks.md`
- `docs/operations-runbook.md`

### Should Not Touch

- Real cluster credentials.
- Live kubeconfig files.
- Live deployment targets.
- Application business logic outside release integration.

### Quality Checklist

- Workflows are non-deploying unless explicitly approved.
- Helm and Argo CD examples use synthetic names and mock images.
- Probes, rollbacks, and PDBs are documented before runtime rollout.
- Failure modes are clear and portfolio-ready.
- EKS notes avoid account-specific details.

### Example Prompt

```text
Act as the AI DevOps / EKS Release Worker. Add portfolio-ready EKS release engineering notes for probes, rollback, and failure modes. Do not deploy or add cluster credentials. Commit the docs update.
```

## Documentation & Portfolio Worker

### Mission

Own README, demo script, journey log, decision log, and LinkedIn-safe language.

### Files Owned

- `README.md`
- `docs/demo-script.md`
- `docs/project/JOURNEY_LOG.md`
- `docs/project/DECISION_LOG.md`
- `docs/project/PROMPT_EXECUTION_LOG.md`
- `docs/project/PROMPT_PLAYBOOK_USAGE.md`
- `docs/project/PROGRESS_DASHBOARD.md`

### Should Not Touch

- Full prompt transcripts.
- Local working-note material.
- Live infrastructure code unless documenting it.
- Claims that imply the project is release-ready.

### Quality Checklist

- Tone is professional, practical, and not overclaimed.
- Public summaries are concise, synthetic, and reusable.
- Demo narrative uses synthetic examples only.
- Journey and decision logs explain why changes happened.
- README reflects current phase and mock-first status.

### Example Prompt

```text
Act as the Documentation & Portfolio Worker. Improve README.md and docs/demo-script.md for a public GitHub portfolio audience. Keep wording synthetic, professional, and mock-first. Commit the documentation update.
```
