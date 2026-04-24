import { bench, describe } from "vitest";
import {
  animationScopedSource,
  compileStyleWithLightningCss,
  compileWith,
  deepSlottedGlobalSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleScopedSource,
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

  bench("lightningcss nested at-rules", () => {
    compileWith(compileStyleWithLightningCss, nestedAtRuleScopedSource);
  });

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
