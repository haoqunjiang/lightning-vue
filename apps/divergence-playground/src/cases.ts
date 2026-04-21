export interface DivergenceCase {
  title: string;
  source: string;
  note: string;
  kind:
    | "likely-lightning-bug"
    | "likely-postcss-bug"
    | "needs-review"
    | "lightning-limit"
    | "shared-limit"
    | "agreement";
}

export const curatedCases: DivergenceCase[] = [
  {
    title: "Descendant anchor before deep-only :is() branch",
    source: `.card :is(:deep(.title)) { color: red; }`,
    note: "This now looks more like a PostCSS issue. Lightning lowers the nested deep branch into the same descendant shape as `.card :deep(.title)`, while PostCSS still leaves `:deep()` unresolved inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Descendant anchor with local prefix before deep inside :is()",
    source: `.card :is(.header :deep(.icon)) { color: red; }`,
    note: "This also now looks more like a PostCSS issue. Lightning keeps `.card` and `.header` locally scoped while preserving the deep escape on `.icon`, whereas PostCSS still leaves `:deep()` unresolved inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Nested :where(:deep(...)) inside descendant-side :is()",
    source: `.card :is(:where(:deep(.title))) { color: red; }`,
    note: "Lightning lowers the nested `:where(:deep(...))` branch into descendant semantics from `.card`, while PostCSS still preserves the unresolved carrier structure inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Carrier inside :nth-child(... of ...)",
    source: `:nth-child(2 of :deep(.foo)) { color: red; }`,
    note: "This is currently a shared limitation. Both compilers leave the carrier unresolved inside the `of` selector list.",
    kind: "shared-limit",
  },
  {
    title: "@scope roots stay global",
    source: `@scope (.scope-host) { .scope-probe { color: red; } }`,
    note: "This is a documented limitation shared with the current PostCSS path: @scope roots and limits are not scoped.",
    kind: "shared-limit",
  },
  {
    title: "Multiple local branches inside :is()",
    source: `:is(.foo, .bar) { color: red; }`,
    note: "A straightforward agreement case. Both compilers keep the `:is(...)` wrapper here because simplifying it would require expanding multiple branches.",
    kind: "agreement",
  },
  {
    title: "Global inside :is()",
    source: `:is(:global(.x)) { color: red; }`,
    note: "Both compilers keep the global branch unscoped here. Lightning also simplifies the single-branch `:is(.x)` wrapper down to `.x`.",
    kind: "agreement",
  },
  {
    title: "Mixed local and global branches inside :is()",
    source: `:is(.foo, :global(.x)) { color: red; }`,
    note: "Another agreement case. Both compilers keep the `:is(...)` wrapper here because the selector still has multiple branches after scoping.",
    kind: "agreement",
  },
  {
    title: "Bare deep branch inside :is()",
    source: `:is(:deep(.foo)) { color: red; }`,
    note: "Another agreement case. Both compilers keep the `:is(...)` wrapper in this deep-only container form.",
    kind: "agreement",
  },
];

export const defaultPlaygroundSource = `.card :deep(.title) {
  color: red;
}`;
