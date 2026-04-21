---
name: designing-internal-playgrounds
description: "Designs or refines internal playgrounds, debug UIs, trace viewers, and inspector panels in lightning-vue. Use when a tool needs a clearer primary path, better reference-vs-editing separation, more readable code surfaces, and calmer technical-doc style UI."
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

This skill adds the UX rules that held up after repeated redesign passes on the
IR playground and divergence playground.

## Core Principles

### Default to a docs-like tool, not a product page

Most internal playgrounds in this repo should feel closer to technical
documentation than to a marketing site.

That usually means:

- a short hero
- calm platform typography
- restrained surfaces
- flatter section framing
- readable code width
- clear visual semantics

Do not add decorative gradients, oversized shells, or display typography unless
the page truly benefits from them.

### Keep reference and editing distinct

If a page is both:

- visual documentation
- and an editable tool

keep those roles separate.

Preferred structure:

- a reference gallery or case library
- a distinct live playground below or beside it

The user should always know whether they are:

- reading a documented example
- or editing a draft

Do not blur those roles into one ambiguous card grid.

### Let context explain controls

Do not front-load controls, copy, or mode switches.

Controls should appear where their purpose is obvious from the nearby panel or
result. If the user has to read a general explanation to understand a control,
the control is in the wrong place.

Prefer:

- a local action inside the relevant panel
- a card-level entry action for reference examples
- one obvious start path instead of duplicated pickers

### Important states must affect the whole surface

If a case type changes how the user should read an item, that state should
shape the whole card or panel, not only a badge.

Use:

- surface tint
- border tone
- small chip or label support

Do not hide important meaning in a tiny badge while the rest of the surface
looks neutral.

Neutral states should stay visually quiet. Agreement or baseline states should
not steal emphasis from wins, bugs, or limits.

### Layout follows content shape

Do not force symmetry on content that wants different proportions.

Rules:

- trace-like text wants width
- code comparisons want width and stable height
- short editable inputs should stay short
- reference snippets should be only as tall as their content needs
- result panes should usually scroll internally instead of stretching the page

If code is hard to scan, width is usually the first thing to fix.

### Typography should stay utilitarian

Prefer the platform UI stack first.

For internal docs-like tools:

- body copy around `14px` is usually the right default
- one lead line can step up to `16px`
- headings can be stronger, but most labels should stay restrained
- add `-webkit-font-smoothing: antialiased;` at the page baseline

Do not make every paragraph feel like hero copy. Do not let chips, buttons,
labels, and headings all compete with the same emphasis weight.

If typography calls attention to itself, it is probably doing too much.

### Geometry should match the information density

A restrained palette does not pair well with oversized soft geometry.

For technical playgrounds:

- keep corner radii moderate
- prefer flatter section framing
- avoid wrapping every section in a giant rounded shell
- use tint and border before reaching for large shadows

If the UI feels soft or toy-like, the problem is often geometry rather than
color.

### Copy should sound like interface, not narration

Write labels and context lines from the reader's point of view.

Avoid:

- filler like `this is`, `here you can`, `use this to`
- implementation vocabulary before the reader has context
- thesis-style notes that repeat the same argument case after case

Prefer:

- short section titles
- one concise context line
- notes that say what the example demonstrates

## Workflow

### 1. Identify the page's actual role

Before editing, decide whether the page is primarily:

- a reference surface
- an editor
- a trace viewer
- or a combination

If it serves more than one role, define the primary path first and make the
other roles clearly secondary.

### 2. Fix structure before polishing copy

First solve:

- where the user starts
- how they move from reference to experiment
- where outputs appear
- which controls are truly primary

Only then tighten copy and styling.

### 3. Review for common failure modes

Check for:

- hero sections carrying too much explanatory load
- duplicated entry actions
- controls appearing before the user has reason to care
- code panes that are too narrow
- cards that are too tall or too soft
- too little breathing room at the page edges
- states visible only through badges
- too much bold text

If any of those are true, simplify again.

### 4. Only codify lessons after they survive critique

Do not update this skill after every small styling tweak.

Only record a lesson when it clearly generalizes and survives a few rounds of
real feedback. Avoid turning one temporary direction into a rule too early.

When updating the skill:

- capture the stable principle, not the transient patch
- prefer one strong rule over several eager micro-rules
- remove or rewrite rules that no longer match the best design

## Validation Loop

After meaningful UI changes:

```bash
pnpm --filter ir-playground check
pnpm --filter ir-playground build
git diff --check
```

If the touched app is not `ir-playground`, run the equivalent narrow
check/build commands for that app instead.

Treat dependency-originated warnings separately from UX regressions.

## Stop Criteria

Do not stop until all of these are true:

- the main path is obvious without a long guide block
- reference and editing roles are distinct
- important states are visible at surface level
- code and trace panes are readable without fighting the layout
- the page feels like a technical tool, not a softened product mockup
- typography is calm and appropriately scaled
- the outer page gutters feel intentional
- checks/build/diff are green

If the page still needs chat explanation to feel coherent, keep redesigning.
