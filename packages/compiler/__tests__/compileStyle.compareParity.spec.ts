import { Features, transform } from "lightningcss";
import { describe, expect, test } from "vitest";
import {
  animationScopedSource,
  compileStyle,
  compileStyleWithLightningCss,
  compileWith,
  deepSlottedGlobalSelectorSource,
  mixedRealisticScopedSource,
  nestedAtRuleScopedSource,
  nestedSelectorScopedSource,
  nestedWrappedDeepSlottedSelectorScopedSource,
  simpleScopedSource,
  wrappedDeepSelectorScopedSource,
} from "../bench/compileStyleBenchShared";

function normalizeCompiledCss(code: string) {
  return new TextDecoder().decode(
    transform({
      filename: "bench.css",
      code: new TextEncoder().encode(code),
      include: Features.Nesting,
      minify: true,
    }).code,
  );
}

function compilePair(source: string) {
  return {
    postcss: normalizeCompiledCss(compileWith(compileStyle, source)),
    lightningcss: normalizeCompiledCss(compileWith(compileStyleWithLightningCss, source)),
  };
}

describe("compileStyle compare benchmark labels", () => {
  test.each([
    ["simple selectors", simpleScopedSource],
    [":deep() / :slotted() / :global() selectors", deepSlottedGlobalSelectorSource],
    ["animation keyframes", animationScopedSource],
    ["nested selectors", nestedSelectorScopedSource],
    ["nested at-rules", nestedAtRuleScopedSource],
  ])("%s still matches after normalization", (_label, source) => {
    const { postcss, lightningcss } = compilePair(source);
    expect(lightningcss).toBe(postcss);
  });

  test.each([
    ["selectors that wrap :deep()", wrappedDeepSelectorScopedSource],
    ["mixed realistic styles", mixedRealisticScopedSource],
    [
      "nested at-rules with :slotted() and wrapped :deep()",
      nestedWrappedDeepSlottedSelectorScopedSource,
    ],
  ])("%s still differs after normalization", (_label, source) => {
    const { postcss, lightningcss } = compilePair(source);
    expect(lightningcss).not.toBe(postcss);
  });
});
