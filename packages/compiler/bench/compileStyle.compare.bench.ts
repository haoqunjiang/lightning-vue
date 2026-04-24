import { bench, describe } from "vitest";
import {
  animationScopedSource,
  compileStyle,
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

describe("compileStyle comparison: parity cases", () => {
  describe("simple selectors", () => {
    bench("lightningcss simple selectors", () => {
      compileWith(compileStyleWithLightningCss, simpleScopedSource);
    });

    bench("postcss simple selectors", () => {
      compileWith(compileStyle, simpleScopedSource);
    });
  });

  describe(":deep() / :slotted() / :global() selectors", () => {
    bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
      compileWith(compileStyleWithLightningCss, deepSlottedGlobalSelectorSource);
    });

    bench("postcss :deep() / :slotted() / :global() selectors", () => {
      compileWith(compileStyle, deepSlottedGlobalSelectorSource);
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

  describe("animation keyframes", () => {
    bench("lightningcss animation keyframes", () => {
      compileWith(compileStyleWithLightningCss, animationScopedSource);
    });

    bench("postcss animation keyframes", () => {
      compileWith(compileStyle, animationScopedSource);
    });
  });

  for (const { label, source } of nestedAtRuleParityCases) {
    describe(label, () => {
      bench(`lightningcss ${label}`, () => {
        compileWith(compileStyleWithLightningCss, source);
      });

      bench(`postcss ${label}`, () => {
        compileWith(compileStyle, source);
      });
    });
  }

  describe("mixed nested selectors and at-rules", () => {
    bench("lightningcss mixed nested selectors and at-rules", () => {
      compileWith(compileStyleWithLightningCss, nestedMixedScopedSource);
    });

    bench("postcss mixed nested selectors and at-rules", () => {
      compileWith(compileStyle, nestedMixedScopedSource);
    });
  });
});

describe("compileStyle comparison: non-parity cases", () => {
  describe("selectors that wrap :deep()", () => {
    bench("lightningcss selectors that wrap :deep()", () => {
      compileWith(compileStyleWithLightningCss, wrappedDeepSelectorScopedSource);
    });

    bench("postcss selectors that wrap :deep()", () => {
      compileWith(compileStyle, wrappedDeepSelectorScopedSource);
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

  describe("nested at-rules with :slotted() and wrapped :deep()", () => {
    bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
      compileWith(compileStyleWithLightningCss, nestedWrappedDeepSlottedSelectorScopedSource);
    });

    bench("postcss nested at-rules with :slotted() and wrapped :deep()", () => {
      compileWith(compileStyle, nestedWrappedDeepSlottedSelectorScopedSource);
    });
  });
});
