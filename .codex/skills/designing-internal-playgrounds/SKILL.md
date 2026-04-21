---
name: designing-internal-playgrounds
description: "Designs or refines internal playgrounds, debug UIs, trace viewers, and inspector panels in lightning-vue. Use when a tool needs clearer primary paths, contextual controls, readable code surfaces, and a clean split between documentation views and live editing."
---

# Designing Internal Playgrounds

Use this skill for internal tools such as:

- playgrounds
- debug UIs
- trace viewers
- inspector panels
- architecture/demo surfaces for compiler internals

Start by following:

- `.codex/skills/improving-codebase/SKILL.md`

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

### Keep documentation and live editing distinct

If a page serves both as:

- visual documentation
- and an editable playground

do not blur those roles into one ambiguous surface.

Use a clear split:

- a gallery or reference section for static cases
- a playground section for live editing

Bridge them with a deliberate action such as `Open in playground` or
`Load this case`, instead of making every reference card silently editable.

The reader should always know whether they are:

- looking at a documented reference
- or changing a live draft

Also:

- do not duplicate the same entry action in multiple places
- if the gallery is the documented way to start from a case, let the gallery
  own that action instead of adding a second, worse case-picker inside the
  playground
- if a whole card exists for one action, make the card itself visibly clickable
  instead of pairing a passive card with a tiny secondary button
- if a case type matters semantically, let that state reach the whole surface,
  not just a badge or chip

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
- static reference snippets should stay only as tall as their actual line count
- traces want width more than height
- code comparison panes need enough width to show selector structure
- result panes should prefer stable height plus scrolling over page jumpiness
- text-heavy panels should not be squeezed into decorative side-by-side grids

If one pane is code-like and another is long-form trace text, they do not need
the same proportions.

Also:

- do not make hero copy artificially narrow in a utilitarian tool
- do not make code cards tall just to make the grid look balanced
- if code is hard to scan, width usually matters more than symmetry
- if the main interaction is "choose a reference and inspect the result",
  gallery cards should optimize for scan width and immediate click affordance

### Typography should fit the tool

Default to clean, utilitarian type choices for engineering tools.

Do not reach for decorative serif display faces unless they truly help the
page. A trace viewer, compiler playground, or comparison tool usually reads
better with one disciplined sans family and clear weight changes.

Prefer the platform UI stack first. It is usually the least distracting choice
for this kind of surface.

If typography starts calling attention to itself, it is probably doing too much
for this kind of UI.

Reserve stronger weight for a few anchors only:

- the main page title
- section titles
- one key label inside a panel when needed

If chips, buttons, labels, headings, and card titles are all bold, nothing is.

### Contrast is part of clarity

Internal tools do not need loud marketing colors, but they do need enough tonal
separation to make different roles legible.

If the page has:

- reference vs editable areas
- match vs divergence states
- primary vs secondary panels

those distinctions should show up in color and surface treatment, not only in
labels.

If a state changes how the user reads the item, it should usually affect the
whole panel or card, not only a badge.

Subtlety is good only until it starts hiding the structure.

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
- whether the page is also serving as visual documentation

If the page is both documentation and a tool, identify both paths explicitly:

- how someone reads the references
- how someone starts experimenting

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

### 5. Review for blurred roles

Check for:

- reference examples that look editable even though they are meant as docs
- a live editor that feels like just another reference card
- a gallery that is too sparse to be useful as documentation
- two different controls that both try to answer "how do I start from a case?"
- code panes that are readable only after horizontal or vertical fighting
- section colors so subtle that gallery/playground states blur together

If any of those are true, the page structure is still doing too little work.

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
- documentation vs playground roles are visually and behaviorally distinct
- secondary tools feel secondary
- manual/advanced controls are revealed by context instead of imposed upfront
- trace-heavy panels are readable at a glance
- code snippets are sized for their real line count and width
- the page no longer jumps badly when examples change
- check/build/diff are green

If the page still needs chat explanation to make sense, keep redesigning.
