# Status Model

<!-- TODO: Future automation can validate status values against docs/project/status.json. -->

Use these status values across project tracking files.

- `not-started`: Work is identified but not begun.
- `in-progress`: Work has started and remains incomplete.
- `blocked`: Work cannot proceed without a decision or dependency.
- `placeholder`: Structure exists but implementation is intentionally deferred.
- `research`: Work is exploratory and not committed to implementation yet.
- `stretch`: Work is intentionally beyond the current delivery horizon.
- `documented`: Concept is described but not implemented.
- `active`: Control or guardrail is in force.
- `complete`: Work is finished for the current phase.

## Source of Truth

`docs/project/status.json` is the source of truth for phase completion, track completion, readiness, and open gaps.

Markdown files provide human-readable summaries and should be updated whenever `status.json` changes until generation automation exists.
