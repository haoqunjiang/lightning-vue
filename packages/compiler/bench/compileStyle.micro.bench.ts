import { bench, describe } from "vitest";
import { Features } from "lightningcss";
import { createLightningCssStyleVisitor } from "../src";
import { analyzeLightningCssStyle } from "../src/style/lightningcss/analysis";
import {
  applyPlannedAnimationReferenceRewrites,
  planNormalizedAnimationReferenceRewrites,
  rewriteNormalizedAnimationReferences,
} from "../src/style/lightningcss/scoped/animation";
import { normalizeNestedStyleBlocks } from "../src/style/lightningcss/nesting/normalize";
import { scopeLightningCssSource } from "../src/style/lightningcss/scoped/source";
import {
  animationScopedSource,
  deepSlottedGlobalSelectorSource,
  loweredNormalizedNestedAtRuleSource,
  loweredNormalizedNestedMixedSource,
  loweredNormalizedNestedSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleScopedSource,
  nestedMixedScopedSource,
  nestedSelectorScopedSource,
  nestedWrappedDeepSlottedSelectorScopedSource,
  normalizedNestedAtRuleSource,
  normalizedNestedMixedSource,
  normalizedNestedSelectorSource,
  simpleScopedSource,
  transformWithLightningCss,
  warmupCompileBenchSuite,
  wrappedDeepSelectorScopedSource,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();
const animationKeyframes = analyzeLightningCssStyle(
  animationScopedSource,
  "data-v-bench",
).keyframes;
const plannedAnimationRewrites = planNormalizedAnimationReferenceRewrites(
  animationScopedSource,
  animationKeyframes,
);

describe("lightningcss micro: transform breakdown", () => {
  bench("transform only simple selectors", () => {
    transformWithLightningCss(simpleScopedSource);
  });

  bench("transform + no-op visitor simple selectors", () => {
    transformWithLightningCss(simpleScopedSource, { visitor: {} });
  });

  bench("transform + scoped visitor simple selectors", () => {
    transformWithLightningCss(simpleScopedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(simpleScopedSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: source preparation", () => {
  bench("analyze style simple selectors", () => {
    analyzeLightningCssStyle(simpleScopedSource, "data-v-bench");
  });

  bench("analyze style :deep() / :slotted() / :global() selectors", () => {
    analyzeLightningCssStyle(deepSlottedGlobalSelectorSource, "data-v-bench");
  });

  bench("scope source simple selectors", () => {
    scopeLightningCssSource(simpleScopedSource, "data-v-bench", false);
  });

  bench("scope source :deep() / :slotted() / :global() selectors", () => {
    scopeLightningCssSource(deepSlottedGlobalSelectorSource, "data-v-bench", true);
  });
});

describe("lightningcss micro: animation finalization", () => {
  bench("analyze style animation keyframes", () => {
    analyzeLightningCssStyle(animationScopedSource, "data-v-bench");
  });

  bench("plan normalized animation reference rewrites", () => {
    planNormalizedAnimationReferenceRewrites(animationScopedSource, animationKeyframes);
  });

  bench("apply planned animation reference rewrites", () => {
    applyPlannedAnimationReferenceRewrites(animationScopedSource, plannedAnimationRewrites);
  });

  bench("rewrite normalized animation references", () => {
    rewriteNormalizedAnimationReferences(animationScopedSource, animationKeyframes);
  });
});

describe("lightningcss micro: transform breakdown with :deep() / :slotted() / :global() selectors", () => {
  bench("transform only :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCss(deepSlottedGlobalSelectorSource);
  });

  bench("transform + no-op visitor :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCss(deepSlottedGlobalSelectorSource, { visitor: {} });
  });

  bench("transform + scoped visitor :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCss(deepSlottedGlobalSelectorSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(deepSlottedGlobalSelectorSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: transform breakdown with selectors that wrap :deep()", () => {
  bench("transform only selectors that wrap :deep()", () => {
    transformWithLightningCss(wrappedDeepSelectorScopedSource);
  });

  bench("transform + no-op visitor selectors that wrap :deep()", () => {
    transformWithLightningCss(wrappedDeepSelectorScopedSource, { visitor: {} });
  });

  bench("transform + scoped visitor selectors that wrap :deep()", () => {
    transformWithLightningCss(wrappedDeepSelectorScopedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(wrappedDeepSelectorScopedSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: transform breakdown with nested at-rules that use :slotted() and wrapped :deep()", () => {
  bench("transform only nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCss(nestedWrappedDeepSlottedSelectorScopedSource);
  });

  bench("transform + include nesting nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCss(nestedWrappedDeepSlottedSelectorScopedSource, {
      include: Features.Nesting,
    });
  });

  bench("transform + scoped visitor nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCss(nestedWrappedDeepSlottedSelectorScopedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(
          nestedWrappedDeepSlottedSelectorScopedSource,
          "data-v-bench",
        ),
        id: "data-v-bench",
        scoped: true,
      }),
      include: Features.Nesting,
    });
  });
});

describe("lightningcss micro: mixed realistic source path", () => {
  bench("analyze style mixed realistic styles", () => {
    analyzeLightningCssStyle(mixedRealisticScopedSource, "data-v-bench");
  });

  bench("normalize nested style blocks mixed realistic styles", () => {
    normalizeNestedStyleBlocks(mixedRealisticScopedSource, "bench.css");
  });

  bench("scope source mixed realistic styles", () => {
    scopeLightningCssSource(mixedRealisticScopedSource, "data-v-bench", true);
  });
});

describe("lightningcss micro: nested selector normalization", () => {
  bench("transform + include nesting nested selectors", () => {
    transformWithLightningCss(nestedSelectorScopedSource, {
      include: Features.Nesting,
    });
  });

  bench("transform only nested selectors", () => {
    transformWithLightningCss(nestedSelectorScopedSource);
  });

  bench("transform + no-op visitor nested selectors", () => {
    transformWithLightningCss(nestedSelectorScopedSource, { visitor: {} });
  });

  bench("normalize nested selector blocks", () => {
    normalizeNestedStyleBlocks(nestedSelectorScopedSource, "bench.css");
  });

  bench("transform + include nesting normalized nested selectors", () => {
    transformWithLightningCss(normalizedNestedSelectorSource, {
      include: Features.Nesting,
    });
  });

  bench("scope source normalized nested selectors", () => {
    scopeLightningCssSource(normalizedNestedSelectorSource, "data-v-bench", true);
  });

  bench("scope source lowered normalized nested selectors", () => {
    scopeLightningCssSource(loweredNormalizedNestedSelectorSource, "data-v-bench", true);
  });

  bench("transform + scoped visitor normalized nested selectors", () => {
    transformWithLightningCss(normalizedNestedSelectorSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(normalizedNestedSelectorSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
      include: Features.Nesting,
    });
  });

  bench("transform + scoped visitor lowered normalized nested selectors", () => {
    transformWithLightningCss(loweredNormalizedNestedSelectorSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(loweredNormalizedNestedSelectorSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: nested at-rule normalization", () => {
  bench("scope source normalized nested at-rules", () => {
    scopeLightningCssSource(normalizedNestedAtRuleSource, "data-v-bench", true);
  });

  bench("normalize nested at-rule blocks", () => {
    normalizeNestedStyleBlocks(nestedAtRuleScopedSource, "bench.css");
  });

  bench("transform only nested at-rules", () => {
    transformWithLightningCss(nestedAtRuleScopedSource);
  });

  bench("transform + include nesting nested at-rules", () => {
    transformWithLightningCss(nestedAtRuleScopedSource, {
      include: Features.Nesting,
    });
  });

  bench("transform + include nesting normalized nested at-rules", () => {
    transformWithLightningCss(normalizedNestedAtRuleSource, {
      include: Features.Nesting,
    });
  });

  bench("transform + no-op visitor nested at-rules", () => {
    transformWithLightningCss(nestedAtRuleScopedSource, { visitor: {} });
  });

  bench("scope source lowered normalized nested at-rules", () => {
    scopeLightningCssSource(loweredNormalizedNestedAtRuleSource, "data-v-bench", true);
  });

  bench("transform + scoped visitor normalized nested at-rules", () => {
    transformWithLightningCss(normalizedNestedAtRuleSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(normalizedNestedAtRuleSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
      include: Features.Nesting,
    });
  });

  bench("transform + scoped visitor lowered normalized nested at-rules", () => {
    transformWithLightningCss(loweredNormalizedNestedAtRuleSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(loweredNormalizedNestedAtRuleSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: nested mixed normalization", () => {
  bench("normalize mixed nested selectors and at-rules", () => {
    normalizeNestedStyleBlocks(nestedMixedScopedSource, "bench.css");
  });

  bench("scope source normalized mixed nested selectors and at-rules", () => {
    scopeLightningCssSource(normalizedNestedMixedSource, "data-v-bench", true);
  });

  bench("transform only mixed nested selectors and at-rules", () => {
    transformWithLightningCss(nestedMixedScopedSource);
  });

  bench("transform + include nesting mixed nested selectors and at-rules", () => {
    transformWithLightningCss(nestedMixedScopedSource, {
      include: Features.Nesting,
    });
  });

  bench("transform + include nesting normalized mixed nested selectors and at-rules", () => {
    transformWithLightningCss(normalizedNestedMixedSource, {
      include: Features.Nesting,
    });
  });

  bench("scope source lowered normalized mixed nested selectors and at-rules", () => {
    scopeLightningCssSource(loweredNormalizedNestedMixedSource, "data-v-bench", true);
  });
});
