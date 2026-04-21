# lightning-vue

Performance-focused Vue SFC style compilation with Lightning CSS.

`lightning-vue` is a monorepo around a Lightning CSS-backed replacement for the
PostCSS-based style pipeline in `@vue/compiler-sfc`.

The main package is:

- [`@lightning-vue/compiler`](./packages/compiler/README.md)
  a compiler-module variant of `@vue/compiler-sfc` whose style compiler is
  implemented with Lightning CSS

The repo also contains:

- [`@lightning-vue/utils`](./packages/utils/README.md)
  shared selector and source-rewrite utilities used by the compiler
- internal playgrounds and example apps used to inspect behavior, compare
  outputs, and debug intentional drifts

## Packages

### `@lightning-vue/compiler`

Use this when you want a drop-in compiler-module override for tools that
already support swapping the SFC compiler, such as `@vitejs/plugin-vue`.

```ts
import vue from "@vitejs/plugin-vue";
import * as compiler from "@lightning-vue/compiler";

export default {
  plugins: [vue({ compiler })],
};
```

See [packages/compiler/README.md](./packages/compiler/README.md) for the full
contract, supported options, and intentional drifts from the current
PostCSS-based Vue compiler.

### `@lightning-vue/utils`

Use this when you want the lower-level selector parsing/stringifying and CSS
source-rewrite utilities without depending on the compiler package.

See [packages/utils/README.md](./packages/utils/README.md) for the boundary and
API surface.

## Apps in This Repo

The apps under [`apps/`](./apps/) are not published packages. They are private
development tools and examples that help validate the compiler:

- [`apps/sfc-playground`](./apps/sfc-playground)
  interactive Vue SFC playground powered by `@lightning-vue/compiler`
- [`apps/divergence-playground`](./apps/divergence-playground)
  gallery + live comparison tool for compiler drifts and correctness wins
- [`apps/ir-playground`](./apps/ir-playground)
  debug UI for the scoped-style IR and related trace surfaces
- [`apps/vite-app`](./apps/vite-app)
  minimal Vite example wired to the compiler

They are useful for contributors and for inspecting behavior, but they are not
part of the public package surface.

## Requirements

- Node `>=22.12.0`
- pnpm `10.33.0`

This repo uses a pinned `vite-plus` toolchain through the workspace catalog.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the full local readiness loop:

```bash
pnpm ready
```

Useful narrower commands:

- check everything:

```bash
pnpm check
```

- run tests:

```bash
pnpm test
```

- build all packages and apps:

```bash
pnpm build
```

- run the compiler benchmark:

```bash
pnpm bench
```

- start the playgrounds:

```bash
pnpm dev:playground
pnpm dev:divergence
pnpm dev:ir
pnpm dev:example
```

## Current Scope

`lightning-vue` is intentionally narrower than the full PostCSS-based Vue style
pipeline. The compiler favors:

- stronger CSS correctness on the supported path
- explicit failures for unsupported style options instead of silent fallbacks
- observable internal stages, trace harnesses, and playgrounds for debugging

If you need full compatibility with every `@vue/compiler-sfc` style option,
keep using `@vue/compiler-sfc`.

## Repository Notes

- License: [MIT](./LICENSE)
- Compiler architecture notes:
  [packages/compiler/ARCHITECTURE.md](./packages/compiler/ARCHITECTURE.md)
- Utils architecture notes:
  [packages/utils/ARCHITECTURE.md](./packages/utils/ARCHITECTURE.md)
