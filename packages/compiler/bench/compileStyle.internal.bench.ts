import { bench, describe } from "vitest";
import {
  animationScopedSource,
  compileStyleWithLightningCss,
  compileWith,
  compileWithLightningCssUsingNormalizedNestedScoping,
  deepSlottedGlobalSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleScopedSource,
  nestedSelectorScopedSource,
  nestedWrappedDeepSlottedSelectorScopedSource,
  simpleScopedSource,
  warmupCompileBenchSuite,
  wrappedDeepSelectorScopedSource,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

describe("compileStyle internal: lightningcss end to end", () => {
  bench("lightningcss simple selectors", () => {
    compileWith(compileStyleWithLightningCss, simpleScopedSource);
  });

  bench("lightningcss nested at-rules", () => {
    compileWith(compileStyleWithLightningCss, nestedAtRuleScopedSource);
  });

  bench("lightningcss selectors that wrap :deep()", () => {
    compileWith(compileStyleWithLightningCss, wrappedDeepSelectorScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    compileWith(compileStyleWithLightningCss, animationScopedSource);
  });
  bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
    compileWith(compileStyleWithLightningCss, nestedWrappedDeepSlottedSelectorScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    compileWith(compileStyleWithLightningCss, nestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    compileWith(compileStyleWithLightningCss, deepSlottedGlobalSelectorSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    compileWith(compileStyleWithLightningCss, mixedRealisticScopedSource);
  });
});

describe("compileStyle internal: normalized source path", () => {
  bench("lightningcss nested at-rules (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(nestedAtRuleScopedSource);
  });

  bench("lightningcss nested selectors (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(nestedSelectorScopedSource);
  });

  bench("lightningcss nested at-rules with :slotted() and wrapped :deep() (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(
      nestedWrappedDeepSlottedSelectorScopedSource,
    );
  });

  bench("lightningcss mixed realistic styles (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(mixedRealisticScopedSource);
  });
});
