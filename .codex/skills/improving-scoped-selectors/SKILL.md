---
name: improving-scoped-selectors
description: "Improves scoped selector behavior and performance in lightning-vue. Use for changes under packages/compiler/src/style/lightningcss/scoped, adjacent nesting or compileSession code, or scoped-selector harnesses that need the scoped correctness loop, benchmark baselines, and architecture checks."
---

# Improving Scoped Selectors

Use this skill when changing the scoped-style pipeline, especially:

- `packages/compiler/src/style/lightningcss/scoped/**`
- `packages/compiler/src/style/lightningcss/nesting/**`
- `packages/compiler/src/compileSession/**`
- `packages/compiler/__tests__/scopedSelector*`
- `packages/compiler/ARCHITECTURE.md`

Start by following:

- `.codex/skills/improving-codebase/SKILL.md`

This skill only adds the scoped-selector-specific triggers, commands, metrics,
and architecture prompts.

## Baseline

Before scoped-selector performance work, make sure a saved compare baseline
exists:

```bash
node tools/bench-scoped-selector.mjs --runs 3 --out /tmp/lightning-vue-before.json --focus 'scoped selector|vue selector functions|nested selectors'
```

Do not overwrite that file casually in the middle of the same optimization
session. It is the scoped-selector comparison anchor.

## Iteration Loop

Use this scoped correctness loop after each meaningful change:

```bash
pnpm --filter @lightning-vue/compiler check
pnpm --filter @lightning-vue/compiler test -- __tests__/compileStyle.spec.ts __tests__/nestedNormalization.spec.ts __tests__/nestingNormalization.trace.spec.ts __tests__/scopedSelector.trace.spec.ts __tests__/compileSession.trace.spec.ts
git diff --check
```

If the change can affect scoped-selector performance, also run:

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

## Explainability Loop

When you change the scoped selector design, force yourself to explain it plainly
in `packages/compiler/ARCHITECTURE.md`.

The explanation should answer:

- what the phase boundaries are
- what state crosses each boundary
- where planning ends and application begins
- why the expensive path is isolated
- why the common path stays cheap
- how the trace harness makes those boundaries observable
- whether the trace logic should live in a reusable debug surface instead of
  only inside `__tests__`

Warning signs:

- you need to describe behavior with vague terms only
- the same fact is rediscovered in multiple phases
- a helper can fan out but pretends to return one result
- correctness depends on hidden side channels

If one of those is true, keep refactoring.

## Stop Criteria

In addition to the repo-wide stop criteria, do not stop unless all of these are
true:

- the scoped correctness loop is green
- `git diff --check` is green
- the median compare is better or neutral on the target path you changed
- `ARCHITECTURE.md` matches the current design after major refactors
