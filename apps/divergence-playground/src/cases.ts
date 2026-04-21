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
    note: "This now looks more like a PostCSS issue. Lightning lowers the selector to the same descendant shape as `.a:deep(.foo)`, while PostCSS still leaves `:deep()` unresolved inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Compound local anchor with descendant deep branch",
    source: `.a:is(.b :deep(.c)) { color: red; }`,
    note: "This also now looks more like a PostCSS issue. Lightning keeps `.a` and `.b` locally scoped while preserving the deep escape on `.c`, whereas PostCSS still leaves `:deep()` unresolved inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Multiple deep branches inside :is()",
    source: `.a:is(:deep(.b), :deep(.c)) { color: red; }`,
    note: "Lightning now keeps both deep branches as descendants of the local `.a` anchor, while PostCSS still leaves the two `:deep()` branches unresolved inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Nested :where(:deep(...)) inside :is()",
    source: `.a:is(:where(:deep(.b))) { color: red; }`,
    note: "Lightning lowers the nested `:where(:deep(...))` branch into descendant semantics from `.a`, while PostCSS still preserves the unresolved carrier structure inside `:is()`.",
    kind: "likely-postcss-bug",
  },
  {
    title: "Ancestor before bare deep branch in :is()",
    source: `.shell :is(:deep(.foo)) { color: red; }`,
    note: "This now looks more like a PostCSS issue. Lightning matches the existing `.shell :deep(.foo)` lowering shape, while PostCSS leaves :deep() unresolved inside :is().",
    kind: "likely-postcss-bug",
  },
  {
    title: "Nested same-element branch before mixed deep/local :is()",
    source: `.root:is(.a:is(:deep(.b), .c)) { color: red; }`,
    note: "This is a known Lightning limitation for now. The nested `.a` branch still targets the same element as `.root`, but the current lowering can add an extra local scope attribute there. Matching stays the same, while specificity may become higher than in the PostCSS output.",
    kind: "lightning-limit",
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

export const defaultPlaygroundSource = `:is(:deep(.a .b .c))
{
  color: red;
}`;
