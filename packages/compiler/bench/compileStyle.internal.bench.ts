import { bench, describe } from "vitest";
import {
  animationScopedSource,
  compileStyleWithLightningCss,
  compileWith,
  deepSlottedGlobalSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleParityCases,
  nestedMixedScopedSource,
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

  for (const { label, source } of nestedAtRuleParityCases) {
    bench(`lightningcss ${label}`, () => {
      compileWith(compileStyleWithLightningCss, source);
    });
  }

  bench("lightningcss mixed nested selectors and at-rules", () => {
    compileWith(compileStyleWithLightningCss, nestedMixedScopedSource);
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
