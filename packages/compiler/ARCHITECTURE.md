# Architecture

`@lightning-vue/compiler` is a drop-in style-compiler replacement for
`@vue/compiler-sfc`.

Its job is narrow but difficult:

- keep the public `compiler-sfc` style API
- preserve Vue scoped-style semantics
- use Lightning CSS for the expensive CSS work
- stay faster than the PostCSS-based pipeline on the common cases

The important consequence is that this package is **not** a pure Lightning CSS
visitor implementation.

It is a **source-first compiler pipeline** with three kinds of work:

1. cheap source analysis and source rewrites
2. a Lightning CSS transform
3. an optional post-transform animation cleanup stage

That shape is more complex than a single AST pass, but it consistently
benchmarks better for Vue SFC styles.

## What This Package Owns

This package only replaces style compilation:

- `compileStyle(...)`
- `compileStyleAsync(...)`
- `compileStyleWithLightningCss(...)`

Everything else is re-exported from `@vue/compiler-sfc`.

The main entrypoint is
[src/compileStyle.ts](./src/compileStyle.ts).

The browser-facing entrypoint is
[src/browser.ts](./src/browser.ts). The Node and browser compilers keep their
option validation, runtime loading, and preprocessing policy separate, but they
share the same middle pipeline in
[src/compileSession/](./src/compileSession/):

- build a `CompileSession`
- prepare source-only rewrites
- derive a `TransformPlan` and run Lightning CSS
- finalize the public `SFCStyleCompileResults`

## First Principles

There are three constraints that drive the design:

1. Lightning CSS understands CSS, but it does not understand Vue-specific
   selector semantics such as `:deep(...)`, `:slotted(...)`, and `:global(...)`.
2. Vue scoped styles are not “just add `[data-v-xxx]` everywhere”.
   Nested rules, deep boundaries, slot scope, and global escapes all affect
   where the scope attribute is allowed to appear.
3. For performance, we do not want every stylesheet to pay for a full AST-based
   scoped rewrite when most styles are ordinary local selectors.

So the package is built around a simple rule:

- do the cheapest correct thing first
- only escalate to heavier work when the stylesheet actually needs it

## End-to-End Flow

```mermaid
flowchart TD
  A[Raw SFC style source] --> B[Validate options<br/>preprocess if needed]
  B --> C[Reject legacy Vue scoped syntax]
  C --> D[Analyze source<br/>nested? carriers? animation? keyframes?]
  D --> E[Rewrite v-bind CSS vars]
  E --> F{scoped + nested rules?}
  F -- yes --> G[Normalize nested blocks in source]
  F -- no --> H
  G --> H[Try source-level selector scoping]
  H --> I[Lightning CSS transform<br/>lower nesting, CSS modules, serialize]
  I --> J{local keyframes renamed?}
  J -- yes --> K[Rewrite normalized animation references]
  J -- no --> L
  K --> L[Assemble final result]
```

The fast path is:

- no preprocessors
- no nested rules
- no scoped selector specials
- no local keyframes

That path stays almost entirely in cheap source rewrites plus one Lightning CSS
transform.

## The Stages

### 1. Validate and Preprocess

`compileStyle.ts` first validates the supported option surface. This package is
strict: unsupported PostCSS-specific features fail fast. There is no silent
fallback.

If the style uses Sass, Less, or Stylus, preprocessing runs before any CSS
analysis so the rest of the pipeline always sees plain CSS.

`browser.ts` applies the same style-option philosophy, but with a narrower
surface:

- no preprocessors
- no CSS modules
- no PostCSS-specific plugin pipeline

After that edge-specific validation, it rejoins the same shared compile-session flow
as the Node entrypoint.

### 2. Reject Legacy Vue Scoped Syntax

Legacy syntax such as `>>>`, `/deep/`, or `::v-deep` is rejected early in
[scoped/legacy.ts](./src/style/lightningcss/scoped/legacy.ts).

This is a deliberate maintenance choice. Supporting the old syntax would add
parsing branches to the hot path for no real benefit.

### 3. Analyze the Source

[analysis.ts](./src/style/lightningcss/analysis.ts) is a cheap routing stage.
It answers:

- does this stylesheet contain nested style rules?
- does it contain modern Vue scope carriers?
- does it contain animation declarations?
- which local `@keyframes` names will be renamed?
- does it contain `v-bind(...)`?

This stage exists so later work can stay conditional instead of unconditional.

### 4. Rewrite `v-bind(...)`

`v-bind(...)` CSS vars are still handled at the source layer. This is cheap,
stable, and easy to map back to original source locations.

### 5. Normalize Nested Blocks

If the style is both `scoped` and nested, the package normalizes nested blocks
**before** selector scoping in
[nesting/normalize.ts](./src/style/lightningcss/nesting/normalize.ts).

This is one of the most important design decisions in the package.

The normalizer does not lower nesting syntax to final flat CSS. Instead, it
rewrites the source into a shape that later selector scoping can reason about.

Example:

```css
.foo {
  color: red;
  .bar {
    color: blue;
  }
}
```

is normalized into the equivalent of:

```css
:global(.foo) {
  & {
    color: red;
  }
  .bar {
    color: blue;
  }
}
```

Why that odd shape?

- the parent `.foo` rule is acting as a **nesting boundary**
- its own declarations still need to compile to `.foo[data-v] { ... }`
- but its nested descendants should compile to `.foo .bar[data-v]`, not
  `.foo[data-v] .bar[data-v]`

So the normalizer:

- analyzes the nesting context established by each selector in
  [nesting/contextAnalysis.ts](./src/style/lightningcss/nesting/contextAnalysis.ts)
- builds explicit block-local rewrite instructions in
  [nesting/instructions.ts](./src/style/lightningcss/nesting/instructions.ts)
- applies those instructions source-to-source in
  [nesting/normalize.ts](./src/style/lightningcss/nesting/normalize.ts)

Those plans cover four decisions:

- whether declarations need an explicit `& { ... }` wrapper
- whether the current rule becomes context-only
- which context child style rules and child at-rules inherit
- whether declaration-only nested at-rules must be hoisted out

This stage stays source-based because it benchmarks better than the AST-heavy
alternative for carrier-heavy nested styles.

## The Scoped Selector Model

The scoped rewrite is the conceptual core of the package.

### Scope Carriers

The modern Vue carriers are defined in
[scopeCarriers.ts](./src/style/lightningcss/scopeCarriers.ts):

- `:deep(...)`
- `:slotted(...)`
- `:global(...)`

These are not rewritten directly into final selectors. Instead, the compiler
first lowers them into an internal selector form.

### Why There Is an Internal Marker IR

Vue scoping needs intermediate signals that do not exist in real CSS:

- “this branch must not receive the normal scope attribute”
- “the deep boundary is here; do not move the injection anchor past this point”

So the scoped selector pipeline uses two temporary internal marker attributes:

- `[__VUE_SCOPE_NO_INJECT__]`
- `[__VUE_SCOPE_DEEP__]`

They are never emitted in final CSS. They only exist during rewriting.

Do not confuse these with the **source-level no-inject carrier** used by
nested normalization. The normalizer rewrites a context-only selector like
`.foo` into `:global(.foo)` because `:global(...)` is already a real Vue escape
hatch meaning “keep this selector branch, but do not inject local scope onto
it”. Later, when that source is parsed for scoped rewriting, `:global(...)`
lowers into the internal `[__VUE_SCOPE_NO_INJECT__]` marker.

### The Scoped Selector Pipeline

The scoped rewrite is split into:

- [scoped/rewrite.ts](./src/style/lightningcss/scoped/rewrite.ts)
- [scoped/selector/direct.ts](./src/style/lightningcss/scoped/selector/direct.ts)
- [scoped/selector/expansion.ts](./src/style/lightningcss/scoped/selector/expansion.ts)
- [scoped/selector/placement/](./src/style/lightningcss/scoped/selector/placement)

There are two selector paths:

- **direct path**
  selectors with no Vue carriers can inject `[data-v-xxx]` immediately
- **expanded path**
  selectors with `:deep(...)`, `:slotted(...)`, `:global(...)`, or mixed
  `:is(...)` / `:where(...)` structure first become explicit internal states

The expanded path has three stages:

1. **expansion**
2. **placement**
3. **cleanup**

#### 1. Expansion

Expansion turns Vue syntax into ordinary selector states plus internal markers.

Examples:

```css
:global(.btn);
```

becomes conceptually:

```css
[__VUE_SCOPE_NO_INJECT__] .btn
```

meaning:

- keep `.btn`
- do not inject `[data-v-xxx]` onto this selector branch

```css
.panel: deep(.title);
```

becomes conceptually:

```css
.panel [__VUE_SCOPE_DEEP__] .title
```

meaning:

- scope the `.panel` side normally
- everything to the right of the deep boundary is outside normal local scoping

`:slotted(...)` is the one eager special case:

- its inner selector is immediately given the slot scope attribute
- then a no-inject marker is prepended so the later placement phase does not
  inject a second scope attribute on top of it

Expansion produces an explicit `ExpandedScopedSelector` state:

- `selector`
- `deep`
- `placement`

That state is the handoff between expansion and placement.

It exists so placement does not have to rediscover the same facts from raw
selector syntax on every pass.

`placement` is one named plan value, not two unrelated flags:

- `direct`
  place scope immediately
- `rewrite-nested`
  place scope immediately, then revisit nested `:is(...)` / `:where(...)`
- `normalize-and-rewrite`
  split mixed same-element / descendant structure before placement, then do the
  same nested rewrite pass

One subtle rule is important here: an inner `normalize-and-rewrite` plan does
not automatically escape through an outer `:deep(...)` boundary. Once a branch
has already crossed into the unscoped side of an outer deep carrier, placement
still needs nested cleanup, but it must not re-normalize the outer selector as
if that inner branch were still local.

When placement later recurses into a bare nested selector, it runs one small
classifier to recover that same plan from syntax. Keeping that as one contract
avoids asking separate helpers for separate facts about the same selector.

Placement does **not** keep carrying that whole state afterward.

Once a real scope attribute has been inserted, the remaining contract is just:

- `selector`
- `deep`

That smaller post-placement result is what cleanup consumes. This keeps the
phase boundary honest: cleanup should not depend on placement-time control
fields that no longer matter.

#### 2. Placement

Once a selector is in the expanded form, the compiler can decide where to
insert the real scope attribute:

- normal scope: `[data-v-xxx]`
- slot scope: `[data-v-xxx-s]`
- no injection

The key idea is the **injection anchor**:

- find the rightmost selector component that should still belong to the local
  branch
- insert the scope attribute immediately after it
- stop searching once a deep marker has been crossed

Example:

```css
.panel [__VUE_SCOPE_DEEP__] .title
```

gets its anchor frozen at `.panel`, so the final effect is:

```css
.panel[data-v-xxx] .title
```

not:

```css
.panel .title[data-v-xxx]
```

and not:

```css
.panel[data-v-xxx] .title[data-v-xxx]
```

Placement itself is split further:

- [placement/structure.ts](./src/style/lightningcss/scoped/selector/placement/structure.ts)
  decides whether selector structure must split before anchor selection
- [placement/compound.ts](./src/style/lightningcss/scoped/selector/placement/compound.ts)
  owns compound-level anchor checks and idempotent “already scoped?” logic
- [placement/nested.ts](./src/style/lightningcss/scoped/selector/placement/nested.ts)
  rewrites nested `:is(...)` / `:where(...)` branches after outer placement
- [placement/index.ts](./src/style/lightningcss/scoped/selector/placement/index.ts)
  coordinates placement itself, with one entrypoint for expanded selector
  states and one for bare nested selectors encountered during placement

That split matters because the two callers are on different sides of the phase
boundary:

- expansion hands placement a full `ExpandedScopedSelector`
- nested placement recursion hands it a bare `Selector`, which is first
  classified and only then routed through the same placement machinery

The two ideas to keep in mind are:

- selector placement plan answers:
  can placement act directly, or must it normalize structure first, and will
  nested containers need a second pass afterward?
- nested scope context answers:
  are we still on the local side, or already after `:deep(...)`, inside
  `:slotted(...)`, or fully unscoped?

Those are different questions, and separating them is what keeps the placement
code understandable.

#### 3. Cleanup

After the real scope attributes have been placed, the temporary markers are
removed recursively, including inside selector containers such as `:is(...)`,
`:where(...)`, `:has(...)`, and `:not(...)`.

At that point the selector is ordinary CSS again.

## Source-Level Scoping vs Visitor Scoping

The package prefers source-level scoping in
[scoped/source.ts](./src/style/lightningcss/scoped/source.ts).

That path is used when:

- the style is `scoped`
- CSS Modules are not enabled
- the source rewrite succeeds

It has two subpaths:

- **direct prelude rewrite**
  when analysis says there are no Vue carriers, `scopeSelectorPrelude(...)` from
  `@lightning-vue/utils` can inject `[data-v-xxx]` very cheaply
- **parsed source rewrite**
  when carriers are present, selectors are parsed and the full scoped rewrite
  pipeline runs

If source scoping cannot handle the stylesheet, the compiler falls back to
visitor-based selector rewriting inside Lightning CSS.

That fallback exists for correctness, but the source path is the performance
target.

## Observability

The codebase keeps the major style stages observable in tests instead of making
them debugger-only concepts:

- `compileSession.trace.spec.ts`
  traces the shared compile session, transform plan, and final result
- `nestingNormalization.trace.spec.ts`
  traces nested-block instructions and the final normalized source
- `scopedSelector.trace.spec.ts`
  traces selector expansion, placement, cleanup, and final scoped selectors

These traces cover the phase boundaries and cross-phase state. They do not try
to mirror every implementation detail.

For interactive debugging, the scoped-selector and nesting traces are also
available from the compiler's debug surface:

- `@lightning-vue/compiler/debug`

The internal IR playground uses that same debug surface, so the tracing logic
stays in one place.

## What Lightning CSS Is Responsible For

After source rewrites, Lightning CSS is used for the parts it is good at:

- parsing CSS
- lowering nesting
- serializing normalized CSS
- CSS Modules compilation
- any remaining selector visitor work when source scoping did not finish it

The style visitor stays small. See
[visitor.ts](./src/style/lightningcss/visitor.ts).

The package does **not** try to encode all Vue semantics inside the Lightning
CSS visitor. That approach was simpler conceptually, but slower in practice.

## Why Animation Uses a Different Strategy

Animation/keyframe handling is the main case where the package relies more on
Lightning CSS.

When scoped local keyframes are renamed:

- the source analysis records the keyframe rename map
- Lightning CSS does the expensive parsing and normalization first
- the package then plans and applies a narrow post-transform source rewrite in
  [scoped/animation/](./src/style/lightningcss/scoped/animation)
- that rewrite has two small stages:
  - a small planning pass that finds explicit rewrite spans in normalized CSS
  - a small apply pass that patches either a string or a `MagicString`
- [debug/animation.ts](./src/debug/animation.ts) shows that stage directly
- the compile-session trace shows its before/after boundary

Animation declarations benefit from Lightning CSS normalization. Unlike nested
selector semantics, preserving raw authored source shape here was not worth the
complexity. The remaining rewrite stays small because it only tracks normalized
keyframe names.

## Why This Package Is Not Simpler

If simplicity were the only goal, we would likely choose one of these designs:

- everything in a Lightning CSS AST visitor
- everything as source-to-source rewriting

The package does neither. It uses a hybrid:

- source-based routing and rewriting on the hot path
- Lightning CSS for parsing, lowering, serialization, and CSS Modules
- a tiny post-transform fixup where that is cheaper than preserving source
  trivia

That means more moving parts, but it preserves the performance properties we
care about:

- cheap common-case scoped styles
- fast nested carrier-heavy styles
- fewer expensive visitor passes
- predictable sourcemap behavior across preprocessors and rewrites

## Module Guide

### `src/compileStyle.ts`

Top-level orchestration:

- validate
- preprocess
- create the shared compile session
- run the shared compile-session flow

### `src/compileSession/`

Shared compile-session stages used by both the Node and browser entrypoints:

- `session.ts`
  compile context, initial mutable state, and session creation
- `prepare.ts`
  pre-transform source preparation
- `transform.ts`
  transform-plan derivation, source scoping, and Lightning CSS transform setup
- `finalize.ts`
  animation cleanup and public result assembly
- `modules.ts`
  CSS modules result normalization

### `src/style/lightningcss/analysis.ts`

Cheap source feature detection and keyframe rename collection.

### `src/style/lightningcss/scopeCarriers.ts`

The syntax contract for modern Vue scope carriers.

### `src/style/lightningcss/nesting/`

Source-based nested normalization:

- `contextAnalysis.ts`
  nested deep/slot/local context analysis
- `instructions.ts`
  block-local normalization instructions
- `normalize.ts`
  source rewrite that applies those plans

### `src/style/lightningcss/scoped/`

Vue-specific scoped-style policy.

Important submodules:

- `rewrite.ts`
  selector-pipeline entrypoint
- `selector/direct.ts`
  cheap no-carrier path
- `selector/expansion.ts`
  carrier expansion into explicit selector states
- `selector/placement/`
  structure normalization, compound checks, nested rewriting, and cleanup
- `source.ts`
  parsed source-level scoping
- `legacy.ts`
  early legacy-syntax rejection

### `src/style/lightningcss/scoped/animation/`

Post-transform scoped keyframe and animation declaration rewrite.

### `src/style/preprocessors.ts`

Sass / Less / Stylus integration kept for `compiler-sfc` compatibility.

## Boundary With `@lightning-vue/utils`

`@lightning-vue/utils` owns generic mechanics:

- selector parsing/stringifying
- source-level selector rewriting
- block tree walking
- source text range helpers

This package owns Vue policy:

- what `:deep(...)`, `:slotted(...)`, and `:global(...)` mean
- where scope may be injected
- how nested context propagates
- when a selector branch becomes context-only
- which compatibility choices are accepted or rejected

That boundary is deliberate. Moving Vue policy down into the utility package
would make the shared layer harder to reason about and harder to reuse.
