import { bench, describe } from "vitest";
import {
  animationFallbackScopedSource,
  animationScopedSource,
  compileStyle,
  compileStyleWithLightningCss,
  compileWith,
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

describe("compileStyle comparison: parity cases", () => {
  describe("simple selectors", () => {
    bench("lightningcss simple selectors", () => {
      compileWith(compileStyleWithLightningCss, simpleScopedSource);
    });

    bench("postcss simple selectors", () => {
      compileWith(compileStyle, simpleScopedSource);
    });
  });

  describe("nested selectors", () => {
    bench("lightningcss nested selectors", () => {
      compileWith(compileStyleWithLightningCss, nestedSelectorScopedSource);
    });

    bench("postcss nested selectors", () => {
      compileWith(compileStyle, nestedSelectorScopedSource);
    });
  });

  describe(":deep() / :slotted() / :global() selectors", () => {
    bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
      compileWith(compileStyleWithLightningCss, vueScopedFunctionSource);
    });

    bench("postcss :deep() / :slotted() / :global() selectors", () => {
      compileWith(compileStyle, vueScopedFunctionSource);
    });
  });

  describe("nested at-rules", () => {
    bench("lightningcss nested at-rules", () => {
      compileWith(compileStyleWithLightningCss, nestedAtRuleScopedSource);
    });

    bench("postcss nested at-rules", () => {
      compileWith(compileStyle, nestedAtRuleScopedSource);
    });
  });

  describe("animation keyframes", () => {
    bench("lightningcss animation keyframes", () => {
      compileWith(compileStyleWithLightningCss, animationScopedSource);
    });

    bench("postcss animation keyframes", () => {
      compileWith(compileStyle, animationScopedSource);
    });
  });
});

describe("compileStyle comparison: non-parity cases", () => {
  describe("logical wrappers", () => {
    bench("lightningcss logical wrapper selectors", () => {
      compileWith(compileStyleWithLightningCss, logicalWrapperScopedSource);
    });

    bench("postcss logical wrapper selectors", () => {
      compileWith(compileStyle, logicalWrapperScopedSource);
    });
  });

  describe("mixed realistic styles", () => {
    bench("lightningcss mixed realistic styles", () => {
      compileWith(compileStyleWithLightningCss, mixedRealisticScopedSource);
    });

    bench("postcss mixed realistic styles", () => {
      compileWith(compileStyle, mixedRealisticScopedSource);
    });
  });

  describe("nested :deep() / :slotted() selectors inside at-rules", () => {
    bench("lightningcss nested :deep() / :slotted() selectors inside at-rules", () => {
      compileWith(compileStyleWithLightningCss, nestedAtRuleCarrierScopedSource);
    });

    bench("postcss nested :deep() / :slotted() selectors inside at-rules", () => {
      compileWith(compileStyle, nestedAtRuleCarrierScopedSource);
    });
  });

  describe("animation var() fallbacks and vendor-prefixed keyframes", () => {
    bench("lightningcss animation var() fallbacks and vendor-prefixed keyframes", () => {
      compileWith(compileStyleWithLightningCss, animationFallbackScopedSource);
    });

    bench("postcss animation var() fallbacks and vendor-prefixed keyframes", () => {
      compileWith(compileStyle, animationFallbackScopedSource);
    });
  });
});
