# lightning-vue

Performance-focused Vue SFC style compilation with Lightning CSS.

This repository currently contains two packages:

- `@lightning-vue/compiler`
  a drop-in `@vue/compiler-sfc`-compatible compiler module whose style pipeline
  is implemented with Lightning CSS
- `@lightning-vue/utils`
  the shared low-level selector and CSS-source utilities used by the compiler

## Development

- Check everything:

```bash
pnpm ready
```

- Run tests:

```bash
pnpm test
```

- Run the compiler benchmark:

```bash
pnpm bench
```

- Build all packages:

```bash
pnpm build
```
