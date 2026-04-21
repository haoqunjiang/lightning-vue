---
name: scoped-selector-loop
description: Use when working on scoped selector maintainability or performance in lightning-vue, especially under packages/compiler/src/style/lightningcss/scoped, related nesting/source-pipeline code, or the scoped selector harness. Enforces the iteration loop: preserve baseline suites, run the scoped correctness checks after each meaningful change, use the median benchmark compare instead of one-off ratio lines, and update ARCHITECTURE.md after structural refactors.
---

# Scoped Selector Loop

Use this skill when changing the scoped-style pipeline, especially:

- `packages/compiler/src/style/lightningcss/scoped/**`
- `packages/compiler/src/style/lightningcss/nesting/**`
- `packages/compiler/src/stylePipeline.ts`
- `packages/compiler/__tests__/scopedSelector*`
- `packages/compiler/ARCHITECTURE.md`

## Non-negotiables

- Do not modify existing baseline tests or baseline benches just to make iteration easier.
- Add supplemental tests, traces, or benches instead.
- Do not trust a single Vitest `x faster` summary line.
- After any structural refactor, update `packages/compiler/ARCHITECTURE.md`.
- If the design cannot be explained clearly and concisely in `ARCHITECTURE.md`, keep refining it.

## Baseline

Before performance work, make sure a saved compare baseline exists:

```bash
node tools/bench-scoped-selector.mjs --runs 3 --out /tmp/lightning-vue-before.json --focus 'scoped selector|vue selector functions|nested selectors'
```

Do not overwrite that file casually in the middle of the same optimization session. It is the comparison anchor.

## Iteration Loop

After each meaningful code change:

```bash
pnpm --filter @lightning-vue/compiler check
pnpm --filter @lightning-vue/compiler test -- __tests__/compileStyle.spec.ts __tests__/nestedNormalization.spec.ts __tests__/scopedSelector.trace.spec.ts
git diff --check
```

If the change can affect performance, also run:

```bash
node tools/bench-scoped-selector.mjs --runs 3 --compare /tmp/lightning-vue-before.json --focus 'scoped selector|vue selector functions|nested selectors'
```

## How To Read The Benchmarks

Prefer the aggregated median compare at the end.

Watch these first:

- `lightningcss vue selector functions`
- `lightningcss nested selectors`
- `scope source vue selector functions`
- `rewrite carrier selectors`
- `rewrite structured selectors`
- `place scope attributes on expanded carriers`

Interpretation rules:

- End-to-end target metrics matter more than microbench wins.
- A source-path win that loses the end-to-end metric is not enough.
- Use the microbenches to locate cost, not to declare success.
- If results are mixed, keep digging until you can explain the tradeoff.

## Maintainability Loop

When you change the design, force yourself to explain it plainly in `packages/compiler/ARCHITECTURE.md`.

The explanation should answer:

- what the phase boundaries are
- what state crosses each boundary
- why the expensive path is isolated
- why the common path stays cheap

Warning signs:

- you need to describe behavior with vague terms only
- the same fact is rediscovered in multiple phases
- a helper can fan out but pretends to return one result
- correctness depends on hidden side channels

If one of those is true, keep refactoring.

## Stop Criteria

Do not stop unless all of these are true:

- the scoped correctness loop is green
- `git diff --check` is green
- the median compare is better or neutral on the target path you changed
- `ARCHITECTURE.md` matches the current design after major refactors

For maintainability-focused refactors, performance must be at least neutral.
For performance-focused refactors, correctness and explainability must stay intact.
