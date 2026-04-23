import { bench, describe } from "vitest";
import {
  animationFallbackScopedSource,
  animationScopedSource,
  compileStyleWithLightningCss,
  compileWith,
  compileWithLightningCssUsingNormalizedNestedScoping,
  logicalWrapperScopedSource,
  mixedRealisticScopedSource,
  nestedAtRuleCarrierScopedSource,
  nestedAtRuleScopedSource,
  nestedSelectorScopedSource,
  simpleScopedSource,
  vueScopedFunctionSource,
  warmupCompileBenchSuite,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

describe("compileStyle internal: lightningcss end to end", () => {
  bench("lightningcss simple selectors", () => {
    compileWith(compileStyleWithLightningCss, simpleScopedSource);
  });

  bench("lightningcss nested at-rules", () => {
    compileWith(compileStyleWithLightningCss, nestedAtRuleScopedSource);
  });

  bench("lightningcss logical wrappers", () => {
    compileWith(compileStyleWithLightningCss, logicalWrapperScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    compileWith(compileStyleWithLightningCss, animationScopedSource);
  });

  bench("lightningcss animation var() fallbacks and vendor-prefixed keyframes", () => {
    compileWith(compileStyleWithLightningCss, animationFallbackScopedSource);
  });

  bench("lightningcss nested :deep() / :slotted() selectors inside at-rules", () => {
    compileWith(compileStyleWithLightningCss, nestedAtRuleCarrierScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    compileWith(compileStyleWithLightningCss, nestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    compileWith(compileStyleWithLightningCss, vueScopedFunctionSource);
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

  bench("lightningcss nested :deep() / :slotted() selectors inside at-rules (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(nestedAtRuleCarrierScopedSource);
  });

  bench("lightningcss mixed realistic styles (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(mixedRealisticScopedSource);
  });
});
