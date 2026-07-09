# Commit and Branch Convention

<!-- TODO: Future automation can validate commit scopes against docs/project/status.json phases and tracks. -->

Use Conventional Commits with a phase-oriented scope. Keep commits small, portfolio-ready, and tied to one reviewable change.

## Commit Format

```text
type(scope): short imperative summary
```

Use lowercase type and scope values. Prefer a scope that combines the phase with the work area, such as `p1-api` or `p2-iam`.

## Commit Types

- `feat`: New user-visible capability.
- `fix`: Bug fix.
- `docs`: Documentation-only change.
- `infra`: Infrastructure, Terraform, provider scaffolding, or platform foundation change.
- `ci`: GitHub Actions and automation.
- `test`: Tests and fixtures.
- `security`: Security, IAM, KMS, secrets, policy, or project-scope change.
- `ops`: Operations, runbooks, release, reliability, or observability operations change.
- `finops`: Cost, token estimation, usage reporting, or allocation change.
- `refactor`: Internal restructuring without behavior change.
- `chore`: Repository maintenance or housekeeping.

## Examples

- `feat(p1-api): add mock Bedrock chat endpoint`
- `fix(p1-api): validate empty prompt input`
- `docs(p0-charter): add public safety boundary`
- `infra(p1-terraform): scaffold AWS dev environment`
- `ci(p2-github-actions): add terraform validation workflow`
- `test(p1-api): add token estimator unit tests`
- `security(p2-iam): document OIDC and least privilege pattern`
- `ops(p3-observability): add request metadata logging notes`
- `finops(p3-cost): add token cost estimator`
- `chore(p0-repo): initialise workspace structure`

## Branch Naming

Use a short prefix, phase, and work-area name.

```text
type/pN-short-description
```

## Branch Examples

- `feature/p0-project-foundation`
- `feature/p1-mock-bedrock-api`
- `feature/p2-terraform-skeleton`
- `feature/p3-finops-observability`
- `feature/p4-eks-release-skeleton`
- `fix/p1-token-estimator`
- `docs/p0-project-scope-boundary`

## Commit Safety Rules

- Keep local-only working folders out of git.
- Keep full prompt transcripts out of git.
- Keep secrets, credentials, account IDs, screenshots, non-public links, and generated local artifacts out of git.
- Keep mock mode as the default unless a task explicitly approves real cloud work.
- Update `docs/project/JOURNEY_LOG.md` when a change materially advances a phase or track.
