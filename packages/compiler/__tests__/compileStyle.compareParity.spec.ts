import { Features, transform } from "lightningcss";
import { describe, expect, test } from "vitest";
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
    [":deep() / :slotted() / :global() selectors", vueScopedFunctionSource],
    ["animation keyframes", animationScopedSource],
    ["nested selectors", nestedSelectorScopedSource],
    ["nested at-rules", nestedAtRuleScopedSource],
  ])("%s still matches after normalization", (_label, source) => {
    const { postcss, lightningcss } = compilePair(source);
    expect(lightningcss).toBe(postcss);
  });

  test.each([
    ["animation var() fallbacks and vendor-prefixed keyframes", animationFallbackScopedSource],
    ["logical wrappers", logicalWrapperScopedSource],
    ["nested :deep() / :slotted() selectors inside at-rules", nestedAtRuleCarrierScopedSource],
    ["mixed realistic styles", mixedRealisticScopedSource],
  ])("%s still differs after normalization", (_label, source) => {
    const { postcss, lightningcss } = compilePair(source);
    expect(lightningcss).not.toBe(postcss);
  });
});
