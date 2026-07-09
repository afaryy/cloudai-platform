# Prompt Playbook Usage

## Purpose

The prompting playbook is used to plan project prompts and keep work phase-aligned. It is a planning aid, not a public record of every full prompt sent during execution.

## Workflow

1. Planned prompts are stored in the prompting playbook.
2. Actual prompts may differ during execution as scope, safety checks, or repository state changes.
3. Full actual prompts may be saved in a local ignored workspace.
4. Full prompt transcripts should stay out of git.
5. Public summaries are recorded in `docs/project/PROMPT_EXECUTION_LOG.md`.
6. Sprint reviews should update `docs/project/JOURNEY_LOG.md`, `docs/project/GAP_ANALYSIS.md`, and `docs/project/PROGRESS_DASHBOARD.md`.

## Public Summary Rules

- Summarize intent, outcome, changed files, deviations, safety checks, and next action.
- Keep entries synthetic and reusable.
- Do not paste full prompt text.
- Do not include local file paths.
- Do not include organization-specific content, local note excerpts, non-public names, tickets, metrics, links, screenshots, credentials, or non-public implementation details.
