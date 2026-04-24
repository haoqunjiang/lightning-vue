import { analyzeCssNestingStructure, type CssNestingStructureSummary } from "@lightning-vue/utils";
import { hasCssVarsBinding } from "../cssVars";
import { registerScopedKeyframeRename } from "./keyframeNames";

export type LightningCssNestedStructure = CssNestingStructureSummary;
export type SourceScopeMode = "parsed" | "simple";

export interface LightningCssStyleAnalysis {
  hasAnimationDeclarations: boolean;
  nested: LightningCssNestedStructure;
  hasScopedSelectorSpecials: boolean;
  hasVBind: boolean;
  keyframes: Record<string, string>;
}

export function hasNestedStructure(nested: LightningCssNestedStructure): boolean {
  return nested.hasNestedSelectorChildren || nested.hasNestedAtRuleChildren;
}

export function deriveSourceScopeMode(
  analysis: Pick<LightningCssStyleAnalysis, "hasScopedSelectorSpecials">,
): SourceScopeMode {
  return analysis.hasScopedSelectorSpecials ? "parsed" : "simple";
}

export function canPrepareLocalNestedSource(
  analysis: Pick<LightningCssStyleAnalysis, "hasScopedSelectorSpecials" | "nested">,
): boolean {
  return !analysis.hasScopedSelectorSpecials && analysis.nested.hasNestedSelectorChildren;
}

export function needsNestedStyleNormalization(analysis: LightningCssStyleAnalysis): boolean {
  return (
    analysis.nested.hasNestedSelectorChildren ||
    (analysis.hasScopedSelectorSpecials &&
      analysis.nested.hasNestedSelectorDescendantsInAtRuleChildren)
  );
}

export function deriveAnalysisAfterNestedNormalization(
  analysis: LightningCssStyleAnalysis,
  options: {
    introducedScopedSelectorSpecials: boolean;
  },
): LightningCssStyleAnalysis {
  if (!options.introducedScopedSelectorSpecials) {
    return analysis;
  }

  return {
    ...analysis,
    hasScopedSelectorSpecials: true,
  };
}

export function analyzeLightningCssStyle(source: string, id: string): LightningCssStyleAnalysis {
  const shortId = id.replace(/^data-v-/, "");
  const mayContainKeyframesPrelude = /@(?:-\w+-)?keyframes\b/i.test(source);
  const analysis: LightningCssStyleAnalysis = {
    hasAnimationDeclarations: /animation/i.test(source),
    nested: {
      hasNestedSelectorChildren: false,
      hasNestedAtRuleChildren: false,
      hasNestedSelectorDescendantsInAtRuleChildren: false,
      hasMixedNestedChildren: false,
    },
    hasScopedSelectorSpecials:
      source.includes(":deep(") || source.includes(":slotted(") || source.includes(":global("),
    hasVBind: hasCssVarsBinding(source),
    keyframes: Object.create(null),
  };

  analysis.nested = analyzeCssNestingStructure(
    source,
    mayContainKeyframesPrelude
      ? (prelude) => {
          if (prelude.blockKind === "keyframes") {
            registerScopedKeyframeRename(prelude.normalizedPrelude, shortId, analysis.keyframes);
          }
        }
      : undefined,
  );

  return analysis;
}
