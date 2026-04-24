import { bench, describe } from "vitest";
import {
  animationScopedSource,
  createNoOpLightningCssSelectorVisitor,
  deepSlottedGlobalSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleParityCases,
  nestedMixedScopedSource,
  nestedSelectorScopedSource,
  nestedWrappedDeepSlottedSelectorScopedSource,
  prepareLightningCssTransformCeiling,
  simpleScopedSource,
  transformPreparedLightningCssCode,
  transformWithLightningCssCode,
  warmupCompileBenchSuite,
  wrappedDeepSelectorScopedSource,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

function transformWithLightningCssNoOpSelectorVisitor(source: string) {
  return transformWithLightningCssCode(source, {
    visitor: createNoOpLightningCssSelectorVisitor(),
  });
}

const preparedSimpleScopedSource = prepareLightningCssTransformCeiling(simpleScopedSource);
const preparedNestedSelectorScopedSource = prepareLightningCssTransformCeiling(
  nestedSelectorScopedSource,
);
const preparedDeepSlottedGlobalSelectorSource = prepareLightningCssTransformCeiling(
  deepSlottedGlobalSelectorSource,
);
const preparedNestedAtRuleParityCases = nestedAtRuleParityCases.map(({ label, source }) => ({
  label,
  prepared: prepareLightningCssTransformCeiling(source),
}));
const preparedNestedMixedScopedSource =
  prepareLightningCssTransformCeiling(nestedMixedScopedSource);
const preparedAnimationScopedSource = prepareLightningCssTransformCeiling(animationScopedSource);
const preparedWrappedDeepSelectorScopedSource = prepareLightningCssTransformCeiling(
  wrappedDeepSelectorScopedSource,
);
const preparedMixedRealisticScopedSource = prepareLightningCssTransformCeiling(
  mixedRealisticScopedSource,
);
const preparedNestedWrappedDeepSlottedSelectorScopedSource = prepareLightningCssTransformCeiling(
  nestedWrappedDeepSlottedSelectorScopedSource,
);

describe("lightningcss baseline: raw transform throughput", () => {
  bench("lightningcss simple selectors", () => {
    transformWithLightningCssCode(simpleScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    transformWithLightningCssCode(nestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCssCode(deepSlottedGlobalSelectorSource);
  });

  for (const { label, source } of nestedAtRuleParityCases) {
    bench(`lightningcss ${label}`, () => {
      transformWithLightningCssCode(source);
    });
  }

  bench("lightningcss mixed nested selectors and at-rules", () => {
    transformWithLightningCssCode(nestedMixedScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformWithLightningCssCode(animationScopedSource);
  });

  bench("lightningcss selectors that wrap :deep()", () => {
    transformWithLightningCssCode(wrappedDeepSelectorScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformWithLightningCssCode(mixedRealisticScopedSource);
  });

  bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCssCode(nestedWrappedDeepSlottedSelectorScopedSource);
  });
});

describe("lightningcss baseline: Lightning CSS on compiler handoff", () => {
  bench("lightningcss simple selectors", () => {
    transformPreparedLightningCssCode(preparedSimpleScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    transformPreparedLightningCssCode(preparedNestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    transformPreparedLightningCssCode(preparedDeepSlottedGlobalSelectorSource);
  });

  for (const { label, prepared } of preparedNestedAtRuleParityCases) {
    bench(`lightningcss ${label}`, () => {
      transformPreparedLightningCssCode(prepared);
    });
  }

  bench("lightningcss mixed nested selectors and at-rules", () => {
    transformPreparedLightningCssCode(preparedNestedMixedScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformPreparedLightningCssCode(preparedAnimationScopedSource);
  });

  bench("lightningcss selectors that wrap :deep()", () => {
    transformPreparedLightningCssCode(preparedWrappedDeepSelectorScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformPreparedLightningCssCode(preparedMixedRealisticScopedSource);
  });

  bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
    transformPreparedLightningCssCode(preparedNestedWrappedDeepSlottedSelectorScopedSource);
  });
});

describe("lightningcss baseline: no-op selector visitor throughput", () => {
  bench("lightningcss simple selectors", () => {
    transformWithLightningCssNoOpSelectorVisitor(simpleScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    transformWithLightningCssNoOpSelectorVisitor(nestedSelectorScopedSource);
  });

  bench("lightningcss :deep() / :slotted() / :global() selectors", () => {
    transformWithLightningCssNoOpSelectorVisitor(deepSlottedGlobalSelectorSource);
  });

  for (const { label, source } of nestedAtRuleParityCases) {
    bench(`lightningcss ${label}`, () => {
      transformWithLightningCssNoOpSelectorVisitor(source);
    });
  }

  bench("lightningcss mixed nested selectors and at-rules", () => {
    transformWithLightningCssNoOpSelectorVisitor(nestedMixedScopedSource);
  });

  bench("lightningcss animation keyframes", () => {
    transformWithLightningCssNoOpSelectorVisitor(animationScopedSource);
  });

  bench("lightningcss selectors that wrap :deep()", () => {
    transformWithLightningCssNoOpSelectorVisitor(wrappedDeepSelectorScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    transformWithLightningCssNoOpSelectorVisitor(mixedRealisticScopedSource);
  });

  bench("lightningcss nested at-rules with :slotted() and wrapped :deep()", () => {
    transformWithLightningCssNoOpSelectorVisitor(nestedWrappedDeepSlottedSelectorScopedSource);
  });
});
