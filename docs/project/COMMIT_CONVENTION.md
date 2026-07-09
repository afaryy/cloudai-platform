# Commit Convention

<!-- TODO: Future automation can validate commit scopes against docs/project/status.json phases and tracks. -->

Use Conventional Commit style with phase or track scopes where useful.

## Types

- `docs:` documentation-only changes.
- `feat:` new user-visible capability.
- `fix:` bug fix.
- `chore:` tooling, repository maintenance, or non-runtime updates.
- `test:` tests and fixtures.
- `ci:` GitHub Actions and automation.

## Suggested Scopes

- `p0`, `p1`, `p2`, `p3`, `p4`, `p5`, `p6`, `p7`
- `track-a`, `track-b`, `track-c`, `track-d`, `track-e`
- `safety`, `finops`, `observability`, `governance`

## Examples

- `docs(p0): update project control pack`
- `docs(track-a): add aws genai gateway notes`
- `ci(p0): add markdown validation check`
- `feat(p1): add mock gateway health endpoint`
