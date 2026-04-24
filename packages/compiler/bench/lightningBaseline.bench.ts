import { bench, describe } from "vitest";
import {
  animationScopedSource,
  deepSlottedGlobalSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleParityCases,
  nestedMixedScopedSource,
  nestedSelectorScopedSource,
  nestedWrappedDeepSlottedSelectorScopedSource,
  simpleScopedSource,
  transformWithLightningCss,
  warmupCompileBenchSuite,
  wrappedDeepSelectorScopedSource,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

function transformWithLightningCssNoOpVisitor(source: string) {
  return transformWithLightningCss(source, { visitor: {} });
}

describe("lightningcss baseline: raw engine throughput", () => {
  bench("lightningcss simple selectors", () => {
    transformWithLightningCss(simpleScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    transformWithLightningCss(nestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCss(deepSlottedGlobalSelectorSource);
  });

  for (const { label, source } of nestedAtRuleParityCases) {
    bench(`lightningcss ${label}`, () => {
      transformWithLightningCss(source);
    });
  }

  bench("lightningcss mixed nested selectors and at-rules", () => {
    transformWithLightningCss(nestedMixedScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformWithLightningCss(animationScopedSource);
  });

  bench("lightningcss selectors that wrap :deep()", () => {
    transformWithLightningCss(wrappedDeepSelectorScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformWithLightningCss(mixedRealisticScopedSource);
  });

  bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCss(nestedWrappedDeepSlottedSelectorScopedSource);
  });
});

describe("lightningcss baseline: no-op visitor throughput", () => {
  bench("lightningcss simple selectors", () => {
    transformWithLightningCssNoOpVisitor(simpleScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    transformWithLightningCssNoOpVisitor(nestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCssNoOpVisitor(deepSlottedGlobalSelectorSource);
  });

  for (const { label, source } of nestedAtRuleParityCases) {
    bench(`lightningcss ${label}`, () => {
      transformWithLightningCssNoOpVisitor(source);
    });
  }

  bench("lightningcss mixed nested selectors and at-rules", () => {
    transformWithLightningCssNoOpVisitor(nestedMixedScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformWithLightningCssNoOpVisitor(animationScopedSource);
  });

  bench("lightningcss selectors that wrap :deep()", () => {
    transformWithLightningCssNoOpVisitor(wrappedDeepSelectorScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformWithLightningCssNoOpVisitor(mixedRealisticScopedSource);
  });

  bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCssNoOpVisitor(nestedWrappedDeepSlottedSelectorScopedSource);
  });
});
