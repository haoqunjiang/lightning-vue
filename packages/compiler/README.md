# Compiler SFC Lightning CSS

`@lightning-vue/compiler` is a compiler-module variant of
`@vue/compiler-sfc` whose style compiler is implemented with Lightning CSS.

> [!WARNING]
> `@lightning-vue/compiler` is in early development. Expect breaking changes,
> incomplete compatibility coverage, and behavior shifts while the style
> compiler is still being hardened.

The package re-exports the public `@vue/compiler-sfc` surface so tooling can
swap it in as a compiler-module override, but it owns its own style engine:

- `compileStyle(...)`
- `compileStyleAsync(...)`
- `compileStyleWithLightningCss(...)`

Everything outside style compilation is still passed through from
`@vue/compiler-sfc`.

## Intended Use

The main target is tooling that already accepts a compiler-module override,
such as `@vitejs/plugin-vue`:

```ts
import vue from "@vitejs/plugin-vue";
import * as compiler from "@lightning-vue/compiler";

export default {
  plugins: [vue({ compiler })],
};
```

That is the reason this package re-exports the whole compiler surface instead
of shipping only a standalone `compileStyle`.

## Style Compiler Contract

This package is intentionally strict.

It does **not** emulate the full PostCSS-based style pipeline from
`@vue/compiler-sfc`. Unsupported style options fail fast instead of silently
falling back.

Supported:

- ordinary `<style>` and `<style scoped>` compilation
- Vue selector functions such as `:deep()`, `:slotted()`, and `:global()`
- nested CSS via source normalization + Lightning CSS lowering
- `postcssOptions.map`, which is the sourcemap request shape commonly used by
  `@vitejs/plugin-vue`
- `compileStyleAsync(..., { modules: true })` for Lightning CSS's built-in CSS
  Modules support
  - supported subset:
    - default local scoping
    - Lightning CSS's default naming, which currently uses `[hash]_[local]`
    - `modulesOptions.generateScopedName` as a string pattern using only
      `[name]`, `[local]`, and `[hash]`
    - `modulesOptions.localsConvention`
  - note:
    - this stays async-only to match `@vue/compiler-sfc`'s public API contract,
      even though the underlying Lightning CSS modules transform is synchronous

Unsupported:

- `postcssPlugins`
- `postcssOptions` keys other than `map`
- `compileStyle(..., { modules: true })`
- `modules` combined with `scoped`
- CSS Modules options outside the supported Lightning CSS subset, including
  `scopeBehaviour: 'global'`, function `generateScopedName`, `hashPrefix`,
  `exportGlobals`, and `globalModulePaths`
- legacy scoped selector syntax such as `>>>`, `/deep/`, `::v-deep(...)`,
  `::v-slotted(...)`, and `::v-global(...)`; use `:deep()`, `:slotted()`, and
  `:global()` instead. These are good future codemod targets.
- `trim: false`

When those option shapes are needed, use `@vue/compiler-sfc`.

## Intentional Drifts

This package currently has a small set of intentional semantic drifts from the
current PostCSS-based `@vue/compiler-sfc` implementation.

For concrete examples and side-by-side outputs, see the divergence playground:
<https://lightning-vue.haoqun.dev/divergence/>

- **Wildcard selectors stay valid**
  - `@lightning-vue/compiler`: Keeps valid selectors such as `* + :hover` and `svg\|*` valid after scoping.
  - Current PostCSS path: Still breaks some wildcard forms.
- **Logical wrappers keep the outer local anchor**
  - `@lightning-vue/compiler`: For selectors like `:not(.foo :deep(.bar))` and `:has(.foo :deep(.bar))`, lowers the deep branch and still keeps the wrapper itself locally anchored.
  - Current PostCSS path: Now lowers the inner deep branch too, but it can still drop the outer `[data-v-*]` anchor on the wrapper, so the final selector matches a different shape.
- **`var()` animation fallbacks stay in sync**
  - `@lightning-vue/compiler`: Also renames local keyframe names when they appear in a `var()` fallback, such as `animation-name: var(--anim, foo)` or `animation: var(--anim, foo) 1s`.
  - Current PostCSS path: Can miss that fallback reference, so the fallback may still point at the old keyframe name and stop matching the renamed `@keyframes`.
- **Nested `:slotted(...)` keeps its meaning**
  - `@lightning-vue/compiler`: Keeps nested selectors under `:slotted(...)` targeting slotted content, even inside `@media`, `@supports`, and `@container`.
  - Current PostCSS path: Can lose that meaning inside nested at-rules and treat the nested rule like an ordinary local selector instead.
- **Split mixed slotted and local selector lists**
  - `@lightning-vue/compiler`: For `:slotted(.x), .y { .b {} }`, the nested `.b` is emitted as a local descendant of `.y`. It does not also get a second slotted interpretation.
  - Current PostCSS path: Can blur those branches together. A single nested rule cannot safely mean two different things at once, so split the selector list when the slotted branch and the local branch need different output.
- **CSS Modules naming differs**
  - `@lightning-vue/compiler`: Uses Lightning CSS's built-in `[hash]_[local]` pattern by default.
  - Current PostCSS path: Uses the `@vue/compiler-sfc` / `postcss-modules` default of `_<local>_<hash>_<line>`.
- **Animation detection is case-insensitive**
  - `@lightning-vue/compiler`: Treats animation declarations and `var()` fallback rewriting case-insensitively.
  - Current PostCSS path: Still uses lowercase-only heuristics, so valid inputs such as `Animation: foo 1s` and `animation-name: Var(--anim, foo)` can stop tracking the renamed local `@keyframes`.
- **Rare ambiguous animation shorthands follow CSS parsing**
  - `@lightning-vue/compiler`: In ambiguous shorthands such as `animation: paused foo 1s`, it renames the actual keyframe name `foo` and leaves `paused` alone.
  - Current PostCSS path: In rare situations, still splits the shorthand into whitespace-separated tokens and rewrites the first token that matches a local `@keyframes` name. That can rename `paused` instead of `foo`, or rename `ease` in `animation: ease 1s` when `ease` is only being used as the timing function.

## Related Packages

- `@vue/compiler-sfc`
  The default compiler-sfc package with the PostCSS-based style compiler.
- `@lightning-vue/utils`
  Shared selector and source utilities used by this package’s style pipeline.

## Dependency

This package requires `lightningcss` to be available in the dependency tree.
