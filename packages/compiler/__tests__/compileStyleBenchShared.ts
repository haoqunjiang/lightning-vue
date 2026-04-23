import { Features, transform } from "lightningcss";
import { compileStyle as _compileStyle } from "@vue/compiler-sfc";
import {
  compileStyle as _compileStyleWithLightningCss,
  createLightningCssStyleVisitor,
} from "../src";
import { analyzeLightningCssStyle } from "../src/style/lightningcss/analysis";
import { normalizeNestedStyleBlocks } from "../src/style/lightningcss/nesting/normalize";
import { scopeLightningCssSource } from "../src/style/lightningcss/scoped/source";

export const compileStyle = _compileStyle;
export const compileStyleWithLightningCss = _compileStyleWithLightningCss;

export const simpleScopedSource = Array.from(
  { length: 80 },
  (_, index) => `.card-${index} .title-${index}:where(:hover) > * { color: red; }`,
).join("\n");

export const vueScopedFunctionSource = Array.from({ length: 40 }, (_, index) =>
  [
    `.root-${index} :deep(.inner-${index} .copy-${index}) { color: red; }`,
    `.root-${index} :slotted(.slot-${index} .leaf-${index}) { color: blue; }`,
    `:is(.root-${index} :deep(.branch-${index})) { color: green; }`,
    `.root-${index} :global(.external-${index} .leaf-${index}) { color: black; }`,
  ].join("\n"),
).join("\n");

export const nestedScopedSource = Array.from(
  { length: 40 },
  (_, index) =>
    `.card-${index} {
  color: red;
  @media (max-width: 800px) {
    color: blue;
    .title-${index} {
      color: green;
    }
  }
  .body-${index} {
    color: black;
  }
}`,
).join("\n");

export const nestedCarrierScopedSource = Array.from({ length: 20 }, (_, index) =>
  [
    `:slotted(.slot-${index}) {
  .inner-${index} { color: red; }
  @media (max-width: 800px) {
    .leaf-${index} { color: blue; }
  }
}`,
    `:not(:deep(.branch-${index})) {
  .copy-${index} { color: green; }
}`,
    `.root-${index} {
  :global(.external-${index}) { color: black; }
}`,
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
    code: new TextEncoder().encode(source),
    nonStandard: {
      deepSelectorCombinator: true,
    },
    ...options,
  }).code;
}

export function compileWithLightningCssUsingNormalizedNestedScoping(source: string) {
  const normalizedSource = normalizeNestedStyleBlocks(source, "bench.css").code;
  const analysis = analyzeLightningCssStyle(normalizedSource, "data-v-bench");
  const scopedSource = scopeLightningCssSource(
    normalizedSource,
    "data-v-bench",
    analysis.hasScopedSelectorSpecials,
  );

  return transformWithLightningCss(scopedSource, {
    include: analysis.hasNestedStyleRules ? Features.Nesting : undefined,
    visitor: createLightningCssStyleVisitor({
      analysis,
      id: "data-v-bench",
      scoped: true,
      selectorsScopedInSource: true,
    }),
  });
}

export const normalizedNestedSource = normalizeNestedStyleBlocks(
  nestedScopedSource,
  "bench.css",
).code;

export const loweredNormalizedNestedSource = new TextDecoder().decode(
  transformWithLightningCss(normalizedNestedSource, {
    include: Features.Nesting,
  }),
);

export function warmupCompileBenchSuite() {
  compileWith(compileStyleWithLightningCss, ".warmup { color: red; }");
  transformWithLightningCss(".warmup { color: red; }");
  transformWithLightningCss(".warmup { color: red; }", { visitor: {} });
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
