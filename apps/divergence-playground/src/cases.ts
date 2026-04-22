export interface DivergenceCase {
  title: string;
  source: string;
  note: string;
  kind:
    | "likely-lightning-bug"
    | "correctness-win"
    | "needs-review"
    | "lightning-limit"
    | "shared-limit"
    | "agreement";
}

export const curatedCases: DivergenceCase[] = [
  {
    title: "Descendant-side :is() keeps a local prefix scoped",
    source: `.card :is(.header :deep(.icon)) { color: red; }`,
    note: "The lightning-vue compiler keeps `.header` locally scoped before the deep escape on `.icon`. The current PostCSS path now lowers the deep branch too, but it still leaves `.header` unscoped inside `:is()`.",
    kind: "correctness-win",
  },
  {
    title: "Nested deep override under a local card",
    source: `.card {
  color: red;
  :deep(.title) { color: blue; }
}`,
    note: "The lightning-vue compiler normalizes the nested rule first, then applies the deep escape so the local `.card` declaration and the deep descendant land on separate final rules. The older PostCSS path still leaves the nested structure in place here.",
    kind: "correctness-win",
  },
  {
    title: "Nested global override beside a local branch",
    source: `.card {
  :global(.title) { color: blue; }
  .copy { color: red; }
}`,
    note: "The lightning-vue compiler preserves the global override while still scoping the local nested branch after nesting normalization. The older PostCSS path keeps the nested block structure, so the final scoped behavior is less explicit.",
    kind: "correctness-win",
  },
  {
    title: "Nested slot-scoped descendant under a slotted card",
    source: `:slotted(.card) {
  .title { color: red; }
}`,
    note: "The lightning-vue compiler keeps the nested descendant on the slot-scoped side after nesting normalization, instead of falling back to ordinary local scoping on `.title`.",
    kind: "correctness-win",
  },
  {
    title: "Logical wrapper keeps the outer local anchor",
    source: `:not(.foo :deep(.bar)) { color: red; }`,
    note: "The lightning-vue compiler keeps the `:not(...)` wrapper itself locally anchored after lowering the inner deep branch. The current PostCSS path now lowers `.bar` too, but it still drops the outer scope anchor on the wrapper.",
    kind: "correctness-win",
  },
  {
    title: "Leading deep branch before a local descendant",
    source: `:not(:deep(.foo)) .bar { color: red; }`,
    note: "The lightning-vue compiler keeps `.bar` as the local target after the deep branch. The current PostCSS path now rewrites the deep branch too, but it scopes the `.foo` side instead, so the selector matches a different shape.",
    kind: "correctness-win",
  },
  {
    title: "Wildcard sibling selector stays valid",
    source: `* + :hover { color: red; }`,
    note: "The lightning-vue compiler preserves the valid wildcard+sibling form and scopes the hovered selector itself. The older PostCSS path still collapses the wildcard side and shifts the scope anchor.",
    kind: "correctness-win",
  },
  {
    title: "Nested media rule keeps slot context",
    source: `:slotted(.card) {
  @media print {
    .title { color: red; }
  }
}`,
    note: "The lightning-vue compiler carries slot context through the nested conditional rule, so the descendant still stays on the slot-scoped side inside `@media`. The older PostCSS path re-enters ordinary local scoping inside the nested block.",
    kind: "correctness-win",
  },
  {
    title: "Animation fallback name is rewritten inside var()",
    source: `@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation-name: var(--anim, fade);
}`,
    note: "The lightning-vue compiler renames the local keyframe in the `var()` fallback too, so the declaration still points at the scoped `@keyframes` name. The older PostCSS path renames the keyframe block but leaves the fallback untouched.",
    kind: "correctness-win",
  },
  {
    title: "Mixed slotted and local branches in one nested rule",
    source: `:slotted(.x), .y {
  .b { color: red; }
}`,
    note: "This mixed list is handled conservatively. The nested `.b` stays locally scoped instead of taking different scoping behavior from each branch. Split the selector list if the branches need to behave differently.",
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
    note: "Both compilers keep the global branch unscoped here. The lightning-vue compiler also simplifies the single-branch `:is(.x)` wrapper down to `.x`.",
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
