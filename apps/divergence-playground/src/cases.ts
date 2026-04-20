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
    title: "Compound local anchor before deep inside :is()",
    source: `.a:is(:deep(.foo)) { color: red; }`,
    note: "Both current outputs look questionable. PostCSS leaves :deep() unresolved inside :is(), while Lightning collapses the selector to a same-element compound even though `.a:deep(.foo)` lowers to a descendant match.",
    kind: "needs-review",
  },
  {
    title: "Compound local anchor with descendant deep branch",
    source: `.a:is(.b :deep(.c)) { color: red; }`,
    note: "Both outputs need review. PostCSS still leaves :deep() unresolved, while Lightning drops the deep carrier and also drops local scoping from `.b`.",
    kind: "needs-review",
  },
  {
    title: "Ancestor before bare deep branch in :is()",
    source: `.shell :is(:deep(.foo)) { color: red; }`,
    note: "This now looks more like a PostCSS issue. Lightning matches the existing `.shell :deep(.foo)` lowering shape, while PostCSS leaves :deep() unresolved inside :is().",
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
    note: "A simple agreement case. Both compilers keep the `:is(...)` wrapper here because simplifying it would require expanding multiple branches.",
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
    note: "A second agreement case. Both compilers keep the `:is(...)` wrapper here because the selector still has multiple branches after scoping.",
    kind: "agreement",
  },
  {
    title: "Bare deep branch inside :is()",
    source: `:is(:deep(.foo)) { color: red; }`,
    note: "Another agreement case. Both compilers keep the `:is(...)` wrapper in this deep-only container form.",
    kind: "agreement",
  },
];

export const defaultPlaygroundSource = `.a:is(:deep(.foo)) { color: red; }`;
