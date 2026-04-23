import { bench, describe } from "vitest";
import {
  animationFallbackScopedSource,
  animationScopedSource,
  logicalWrapperScopedSource,
  mixedRealisticScopedSource,
  nestedAtRuleCarrierScopedSource,
  nestedAtRuleScopedSource,
  nestedSelectorScopedSource,
  simpleScopedSource,
  transformWithLightningCss,
  vueScopedFunctionSource,
  warmupCompileBenchSuite,
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
    transformWithLightningCss(vueScopedFunctionSource);
  });

  bench("lightningcss nested at-rules", () => {
    transformWithLightningCss(nestedAtRuleScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformWithLightningCss(animationScopedSource);
  });

  bench("lightningcss logical wrappers", () => {
    transformWithLightningCss(logicalWrapperScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformWithLightningCss(mixedRealisticScopedSource);
  });

  bench("lightningcss nested :deep() / :slotted() selectors inside at-rules", () => {
    transformWithLightningCss(nestedAtRuleCarrierScopedSource);
  });

  bench("lightningcss animation var() fallbacks and vendor-prefixed keyframes", () => {
    transformWithLightningCss(animationFallbackScopedSource);
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
    transformWithLightningCssNoOpVisitor(vueScopedFunctionSource);
  });

  bench("lightningcss nested at-rules", () => {
    transformWithLightningCssNoOpVisitor(nestedAtRuleScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformWithLightningCssNoOpVisitor(animationScopedSource);
  });

  bench("lightningcss logical wrappers", () => {
    transformWithLightningCssNoOpVisitor(logicalWrapperScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformWithLightningCssNoOpVisitor(mixedRealisticScopedSource);
  });

  bench("lightningcss nested :deep() / :slotted() selectors inside at-rules", () => {
    transformWithLightningCssNoOpVisitor(nestedAtRuleCarrierScopedSource);
  });

  bench("lightningcss animation var() fallbacks and vendor-prefixed keyframes", () => {
    transformWithLightningCssNoOpVisitor(animationFallbackScopedSource);
  });
});
