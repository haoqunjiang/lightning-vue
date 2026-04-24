import { Features, transform } from "lightningcss";
import { compileStyle as _compileStyle } from "@vue/compiler-sfc";
import {
  compileStyle as _compileStyleWithLightningCss,
  createLightningCssStyleVisitor,
} from "../src";
import {
  createCompileContext,
  createCompileSession,
  createCompileState,
  createTransformPlan,
  prepareCompileSessionForTransform,
} from "../src/compileSession";
import { analyzeLightningCssStyle } from "../src/style/lightningcss/analysis";
import { normalizeNestedStyleBlocks } from "../src/style/lightningcss/nesting/normalize";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const compileStyle = _compileStyle;
export const compileStyleWithLightningCss = _compileStyleWithLightningCss;

export const simpleScopedSource = Array.from(
  { length: 80 },
  (_, index) => `.card-${index} .title-${index}:where(:hover) > * { color: red; }`,
).join("\n");

export const deepSlottedGlobalSelectorSource = Array.from({ length: 40 }, (_, index) =>
  [
    `.root-${index} :deep(.inner-${index} .copy-${index}) { color: red; }`,
    `.root-${index} :slotted(.slot-${index} .leaf-${index}) { color: blue; }`,
    `.root-${index} :deep(.branch-${index}) { color: green; }`,
    `.root-${index} :global(.external-${index} .leaf-${index}) { color: black; }`,
  ].join("\n"),
).join("\n");

export const nestedSelectorScopedSource = Array.from(
  { length: 40 },
  (_, index) =>
    `.card-${index} {
  color: red;
  .title-${index} {
    color: blue;
  }
  &.active-${index} {
    color: green;
  }
  > .meta-${index} {
    color: black;
  }
}`,
).join("\n");

export const animationScopedSource = Array.from({ length: 20 }, (_, index) =>
  [
    `.anim-name-${index} { animation-name: fade-${index}; }`,
    `.anim-short-${index} { animation: fade-${index} 1s linear; }`,
    `.anim-webkit-${index} { -webkit-animation: fade-${index} 1s linear; }`,
    `@keyframes fade-${index} {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
    `@-webkit-keyframes fade-${index} {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  ].join("\n"),
).join("\n");

function createNestedAtRuleScopedSource(selectorForIndex: (index: number) => string, length = 40) {
  return Array.from(
    { length },
    (_, index) =>
      `${selectorForIndex(index)} {
  color: red;
  @media (max-width: 800px) {
    color: blue;
  }
  @supports (display: grid) {
    display: grid;
  }
  @container card-${index} (inline-size > 30rem) {
    color: green;
  }
}`,
  ).join("\n");
}

export const nestedAtRuleSimpleSelectorScopedSource = createNestedAtRuleScopedSource(
  (index) => `.card-${index}`,
);

export const nestedAtRuleCompoundSelectorScopedSource = createNestedAtRuleScopedSource(
  (index) => `.card-${index}.is-active-${index}[data-state="open"]`,
);

export const nestedAtRuleDescendantSelectorScopedSource = createNestedAtRuleScopedSource(
  (index) => `.layout-${index} .card-${index} > .body-${index}`,
);

export const nestedAtRuleRealisticSelectorScopedSource = Array.from({ length: 30 }, (_, index) =>
  [
    `.layout-${index} > .panel-${index}:where([data-open]) {
  color: red;
  @media (max-width: 800px) {
    color: blue;
  }
  @supports (display: grid) {
    display: grid;
  }
}`,
    `.toolbar-${index} :is(button, a)[aria-current="page"] {
  color: green;
  @media (hover: hover) {
    color: black;
  }
  @container toolbar-${index} (inline-size > 32rem) {
    color: purple;
  }
}`,
  ].join("\n"),
).join("\n");

export const nestedAtRuleScopedSource = nestedAtRuleSimpleSelectorScopedSource;

export const nestedAtRuleParityCases = [
  {
    label: "nested at-rules with simple selectors",
    source: nestedAtRuleSimpleSelectorScopedSource,
  },
  {
    label: "nested at-rules with compound selectors",
    source: nestedAtRuleCompoundSelectorScopedSource,
  },
  {
    label: "nested at-rules with descendant selectors",
    source: nestedAtRuleDescendantSelectorScopedSource,
  },
  {
    label: "nested at-rules with realistic selectors",
    source: nestedAtRuleRealisticSelectorScopedSource,
  },
] as const;

export const nestedMixedScopedSource = Array.from(
  { length: 30 },
  (_, index) =>
    `.card-${index} {
  color: red;
  .title-${index} {
    color: blue;
  }
  @media (max-width: 800px) {
    color: green;
    .meta-${index} {
      color: black;
    }
  }
  @supports (display: grid) {
    display: grid;
    .grid-${index} {
      color: purple;
    }
  }
}`,
).join("\n");

export const wrappedDeepSelectorScopedSource = Array.from({ length: 20 }, (_, index) =>
  [
    `:not(.foo-${index} :deep(.bar-${index})) { color: red; }`,
    `:has(.foo-${index} :deep(.bar-${index})) { color: blue; }`,
    `:not(:deep(.foo-${index})) .bar-${index} { color: green; }`,
    `.card-${index} :is(.header-${index} :deep(.icon-${index})) { color: black; }`,
  ].join("\n"),
).join("\n");

export const mixedRealisticScopedSource = Array.from({ length: 20 }, (_, index) =>
  [
    `.card-${index} .title-${index}:where(:hover) > * { color: red; }`,
    `.panel-${index} {
  color: red;
  .body-${index} { color: blue; }
  @media (max-width: 800px) {
    .meta-${index} { color: green; }
  }
}`,
    `:slotted(.slot-${index}) {
  .item-${index} { color: orange; }
}`,
    `:not(:deep(.remote-${index})) {
  .copy-${index} { color: purple; }
}`,
    `.wrapper-${index} {
  :global(.external-${index}) { color: black; }
}`,
  ].join("\n"),
).join("\n");

export const nestedWrappedDeepSlottedSelectorScopedSource = Array.from({ length: 20 }, (_, index) =>
  [
    `:slotted(.slot-${index}) {
  @media (max-width: 800px) {
    .leaf-${index} { color: red; }
  }
  @supports (display: grid) {
    .grid-${index} { color: blue; }
  }
  @container card-${index} (inline-size > 30rem) {
    .item-${index} { color: green; }
  }
}`,
    `:not(:deep(.branch-${index})) {
  @media print {
    .copy-${index} { color: purple; }
  }
}`,
  ].join("\n"),
).join("\n");

export function compileWith(compile: typeof compileStyle, source: string) {
  const result = compile({
    source,
    filename: "bench.css",
    id: "data-v-bench",
    scoped: true,
  });

  if (result.errors.length) {
    throw result.errors[0];
  }

  return result.code;
}

export function transformWithLightningCss(
  source: string,
  options: Omit<Parameters<typeof transform>[0], "filename" | "code"> = {},
) {
  return transform({
    filename: "bench.css",
    code: textEncoder.encode(source),
    nonStandard: {
      deepSelectorCombinator: true,
    },
    ...options,
  }).code;
}

export function transformWithLightningCssCode(
  source: string,
  options: Omit<Parameters<typeof transform>[0], "filename" | "code"> = {},
) {
  return textDecoder.decode(transformWithLightningCss(source, options));
}

export function createNoOpLightningCssSelectorVisitor() {
  return {
    Selector() {},
  };
}

type LightningCssTransformOptions = Omit<Parameters<typeof transform>[0], "filename" | "code">;

export interface PreparedLightningCssTransform {
  code: string;
  options: LightningCssTransformOptions;
}

export function prepareLightningCssTransformCeiling(source: string): PreparedLightningCssTransform {
  const context = createCompileContext({
    source,
    filename: "bench.css",
    id: "data-v-bench",
    scoped: true,
  });
  const state = createCompileState(source, undefined, context);
  const session = createCompileSession(context, state);

  if (!prepareCompileSessionForTransform(session)) {
    throw state.errors[0] ?? new Error("Failed to prepare benchmark source");
  }

  const plan = createTransformPlan(session);
  const options: LightningCssTransformOptions = plan.includeNesting
    ? {
        include: Features.Nesting,
      }
    : {};

  if (!plan.selectorsScopedInSource) {
    options.visitor = createNoOpLightningCssSelectorVisitor();
  }

  return {
    code: plan.code,
    options,
  };
}

export function transformPreparedLightningCssCode(prepared: PreparedLightningCssTransform) {
  return transformWithLightningCssCode(prepared.code, prepared.options);
}

export const normalizedNestedSelectorSource = normalizeNestedStyleBlocks(
  nestedSelectorScopedSource,
  "bench.css",
).code;

export const normalizedNestedAtRuleSource = normalizeNestedStyleBlocks(
  nestedAtRuleScopedSource,
  "bench.css",
).code;

export const normalizedNestedMixedSource = normalizeNestedStyleBlocks(
  nestedMixedScopedSource,
  "bench.css",
).code;

export const loweredNormalizedNestedSelectorSource = new TextDecoder().decode(
  transformWithLightningCss(normalizedNestedSelectorSource, {
    include: Features.Nesting,
  }),
);

export const loweredNormalizedNestedAtRuleSource = new TextDecoder().decode(
  transformWithLightningCss(normalizedNestedAtRuleSource, {
    include: Features.Nesting,
  }),
);

export const loweredNormalizedNestedMixedSource = new TextDecoder().decode(
  transformWithLightningCss(normalizedNestedMixedSource, {
    include: Features.Nesting,
  }),
);

export function warmupCompileBenchSuite() {
  compileWith(compileStyleWithLightningCss, ".warmup { color: red; }");
  transformWithLightningCss(".warmup { color: red; }");
  transformWithLightningCssCode(".warmup { color: red; }");
  transformWithLightningCssCode(".warmup { color: red; }", {
    visitor: createNoOpLightningCssSelectorVisitor(),
  });
  transformPreparedLightningCssCode(prepareLightningCssTransformCeiling(".warmup { color: red; }"));
  transformWithLightningCss(".warmup { color: red; }", {
    visitor: createLightningCssStyleVisitor({
      analysis: analyzeLightningCssStyle(".warmup { color: red; }", "data-v-bench"),
      id: "data-v-bench",
      scoped: false,
    }),
  });
  transformWithLightningCss(".warmup { color: red; }", {
    visitor: createLightningCssStyleVisitor({
      analysis: analyzeLightningCssStyle(".warmup { color: red; }", "data-v-bench"),
      id: "data-v-bench",
      scoped: true,
    }),
  });
}
