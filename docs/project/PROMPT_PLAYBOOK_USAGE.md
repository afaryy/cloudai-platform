# Prompt Playbook Usage

## Purpose

The prompting playbook is used to plan project prompts and keep work phase-aligned. It is a planning aid, not a public record of every raw prompt sent during execution.

## Workflow

1. Planned prompts are stored in the prompting playbook.
2. Actual prompts may differ during execution as scope, safety checks, or repository state changes.
3. Raw actual prompts may be saved privately under `_private/prompt-logs/`.
4. Raw prompts must not be committed.
5. Public summaries are recorded in `docs/project/PROMPT_EXECUTION_LOG.md`.
6. Sprint reviews should update `docs/project/JOURNEY_LOG.md`, `docs/project/GAP_ANALYSIS.md`, and `docs/project/PROGRESS_DASHBOARD.md`.

## Public Summary Rules

- Summarize intent, outcome, changed files, deviations, safety checks, and next action.
- Keep entries synthetic and employer-neutral.
- Do not paste raw prompt text.
- Do not include private file paths except the generic ignored folder path `_private/prompt-logs/`.
- Do not include employer-specific content, private reference excerpts, internal names, tickets, metrics, links, screenshots, credentials, or proprietary implementation details.
