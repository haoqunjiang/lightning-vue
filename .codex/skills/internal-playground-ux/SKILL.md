---
name: internal-playground-ux
description: Use when designing or refactoring internal playgrounds, debug UIs, inspector panels, or trace viewers in lightning-vue. Focus on progressive disclosure, content-shaped layout, quiet controls, reader-first copy, and building playgrounds on top of real debug surfaces instead of duplicated app logic.
---

# Internal Playground UX

Use this skill for internal tools such as:

- playgrounds
- debug UIs
- trace viewers
- inspector panels
- architecture/demo surfaces for compiler internals

Start by following:

- `.codex/skills/codebase-improvement-loop/SKILL.md`

This skill adds the UX-specific design rules that came out of redesigning the
IR playground.

## Core Principles

### Let context explain controls

Do not front-load controls, copy, or mode switches.

Controls should appear where their purpose is already obvious from the nearby
panel, result, or interaction. If a user has to read a general explanation to
understand a control, the control is in the wrong place.

Examples:

- Prefer a small `Type your own` action inside a selector panel over a global
  `Manual selector` checkbox.
- Prefer stage-local view switches over global tabs when the meaning of the
  switch depends on that stage.

### Progressive disclosure is not only hidden panels

Scrolling is also disclosure.

Do not collapse secondary sections by default if simply being lower on the page
already makes them secondary. Use `<details>` or other hiding mechanisms only
when they reduce real noise.

Examples:

- A primary walkthrough can live above always-open labs.
- Marker explanations can live in a local disclosure block because they are
  only needed while reading that panel.

### Name things from the reader's point of view

Avoid labels that leak implementation vocabulary before the reader has the
context to care.

Prefer:

- `Normalization`
- `Compiled output`
- `Selector inspector`
- `Trace`
- `Result`

Avoid labels like:

- `Prepared CSS`
- `Carrier notes`
- `Open a stage`
- `From source`

unless the surrounding panel already makes those phrases obviously meaningful.

### Layout follows content shape

Do not force visual symmetry on asymmetric content.

Rules:

- short editable sources should stay short
- traces want width more than height
- result panes should prefer stable height plus scrolling over page jumpiness
- text-heavy panels should not be squeezed into decorative side-by-side grids

If one pane is code-like and another is long-form trace text, they do not need
the same proportions.

### Hierarchy should come from structure, not decoration

Do not try to make the UI "clear" with:

- too many pills
- heavy shadows
- random bolding
- lots of uppercase labels
- repeated explainer blocks

Instead use:

- calmer spacing
- fewer control styles
- consistent panel rhythm
- restrained typography
- local context lines instead of giant guide sections

## Workflow

### 1. Find the primary path

Before editing anything, identify:

- the main thing the user is trying to inspect
- the minimum path from input to answer
- which panels are primary
- which panels are labs or optional deep dives

The page should have one obvious primary path.

### 2. Push controls down to where they matter

For every control, ask:

- what nearby output does this affect?
- can the user understand that from placement alone?
- does this need to be visible before the user reaches that part of the page?

If not, move it down or hide it behind a lighter action.

### 3. Rewrite copy after the layout is right

Do not polish copy before the structure is settled.

When rewriting copy:

- cut phrases like `this is`, `here you can`, `use this to`
- let headings and placement do part of the explanatory work
- prefer short context lines over dense guide blocks
- explain implementation-specific markers only next to the panel that shows
  them

### 4. Review for over-design

Check for:

- too many button groups
- more than one kind of "special" emphasis competing at once
- secondary sections louder than the main path
- controls that appear before the user has reason to care about them
- card heights that jump badly between examples

If any of those are true, simplify again.

## Validation Loop

After meaningful UI changes:

```bash
pnpm --filter ir-playground check
pnpm --filter ir-playground build
git diff --check
```

If the touched app is not `ir-playground`, run the equivalent narrow check/build
commands for that app instead.

Treat dependency-originated warnings separately from UX regressions. Do not
paper over packaging problems with runtime hacks when the real boundary is in
the build or import graph.

## Stop Criteria

Do not stop until all of these are true:

- the main path is obvious without reading a long guide block
- secondary tools feel secondary
- manual/advanced controls are revealed by context instead of imposed upfront
- trace-heavy panels are readable at a glance
- the page no longer jumps badly when examples change
- check/build/diff are green

If the page still needs chat explanation to make sense, keep redesigning.
