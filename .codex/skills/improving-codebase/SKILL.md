---
name: improving-codebase
description: "Improves maintainability, performance, and architecture in lightning-vue. Use for non-trivial refactors, benchmark-driven optimization, harness work, or design cleanup that must preserve baseline suites, compare repeated measurements, update architecture docs, and keep phase boundaries observable."
---

# Improving the Codebase

Use this skill for non-trivial refactors, maintainability work, performance work,
or architecture cleanup anywhere in this repo.

## Non-negotiables

- Preserve existing baseline tests and baseline benches.
- If the current evaluation surface is too weak, add a supplemental harness
  instead of rewriting the baseline.
- Prefer the narrowest relevant validation commands after each meaningful
  iteration.
- Always run `git diff --check` after meaningful code changes.
- After structural refactors, update the relevant `ARCHITECTURE.md` or design
  doc.
- If the design cannot be explained concisely in that doc, keep
  refining it.
- If a multi-stage flow becomes hard to reason about, add or update a trace
  harness that makes each stage observable instead of relying on debugger-only
  understanding.
- If planning and applying are interleaved so tightly that the algorithm is
  hard to explain, extract an explicit planning stage and trace both the plan
  and the final applied result.
- If a trace becomes useful for interactive debugging, move it into a real
  debug surface under `src/` and build any playground on top of that surface
  instead of duplicating the trace logic in the app.
- If the work turns into internal playground or debug-UI design, also follow
  `.codex/skills/designing-internal-playgrounds/SKILL.md`.

## Baseline

Before performance work:

- save a comparison baseline for the target area
- do not overwrite it casually in the same optimization session
- if the target area lacks a focused harness or benchmark, add one
  supplementally first

Prefer repeated runs with a saved comparison artifact over one-off benchmark
output.

## Iteration Loop

After each meaningful change:

- run the narrowest relevant `check` and `test` commands for the touched area
- run `git diff --check`

If the change can affect performance:

- run repeated comparisons against the saved baseline
- prefer the aggregated median result

If the change affects architecture or phase structure:

- update the relevant `ARCHITECTURE.md`
- explain the design in plain language
- make the important stage boundaries observable in a supplemental trace harness
  when the code lacks one

If the change affects maintainer-facing wording such as docs, comments, debug
strings, trace titles, or benchmark labels:

- review the touched wording for clarity after the code settles
- prefer direct statements over contrast-heavy phrasing
- avoid stock patterns such as `not X but Y`, `intentionally`, and `rather than`
  unless they add real information that a simpler sentence would lose

## How To Read The Benchmarks

- Prefer repeated median comparisons over a single run.
- Prefer end-to-end metrics over microbench wins.
- Use microbenches to locate cost, not to declare success.
- If the results are mixed, keep digging until you can explain the tradeoff.

## Explainability Loop

When you update the design, the architecture doc should answer:

- what the phase boundaries are
- what state crosses those boundaries
- where complexity is isolated
- what invariants future refactors must preserve

Warning signs:

- the same fact is rediscovered in multiple phases
- correctness depends on hidden side channels
- a helper can fan out but pretends to return one result
- planning decisions only exist as temporary locals inside the apply phase
- the design only makes sense when described with vague terms
- a phase boundary cannot be shown in a trace or snapshot

If one of those is true, keep refactoring.

## Stop Criteria

Do not stop unless all of these are true:

- the relevant correctness loop is green
- `git diff --check` is green
- the target performance path is better or neutral, or the tradeoff is explicit
  and justified
- the relevant architecture doc matches the current design after major refactors

For maintainability-focused refactors, performance should be at least neutral.
For performance-focused refactors, correctness and explainability must stay
intact.
