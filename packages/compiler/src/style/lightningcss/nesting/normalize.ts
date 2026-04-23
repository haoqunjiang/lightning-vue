import type { RawSourceMap } from "@vue/compiler-core";
import { type CssBlockNode, parseCssBlockTree } from "@lightning-vue/utils";
import MagicString from "magic-string";
import merge from "merge-source-map";
import { warnOnce } from "../../../warn";
import {
  createAtRuleNormalizationInstructions,
  createInitialNestedNormalizationContext,
  createStyleRuleNormalizationInstructions,
  type AtRuleNormalizationInstructions,
  type BlockDecorationInstructions,
  type NestedNormalizationContext,
  type StyleRuleNormalizationInstructions,
} from "./instructions";
import { wrapPreludeInNoInjectCarrier, wrapTopLevelTextSegments } from "./text";

export interface NormalizeNestedStyleBlocksResult {
  code: string;
  introducedScopedSelectorSpecials: boolean;
  map: RawSourceMap | undefined;
  normalized: boolean;
}

interface ApplyBlockDecorationResult {
  changed: boolean;
  introducedScopedSelectorSpecials: boolean;
}

export function normalizeNestedStyleBlocks(
  source: string,
  filename: string,
  map?: RawSourceMap,
  sourceMap: boolean = !!map,
): NormalizeNestedStyleBlocksResult {
  // Apply the block-local instructions from `instructions.ts` before selector
  // scoping so the later scoped rewrite sees explicit `& { ... }`
  // declaration blocks instead of mixed declaration/rule bodies.
  const s = new MagicString(source);
  let normalized = false;
  let introducedScopedSelectorSpecials = false;

  const noteResult = (result: ApplyBlockDecorationResult) => {
    normalized ||= result.changed;
    introducedScopedSelectorSpecials ||= result.changed && result.introducedScopedSelectorSpecials;
  };

  for (const block of parseCssBlockTree(source)) {
    noteResult(normalizeNestedBlock(block, s, source, createInitialNestedNormalizationContext()));
  }

  if (!normalized) {
    return {
      code: source,
      introducedScopedSelectorSpecials: false,
      map,
      normalized,
    };
  }

  if (!sourceMap) {
    return {
      code: s.toString(),
      introducedScopedSelectorSpecials,
      map: undefined,
      normalized,
    };
  }

  const nextMap = s.generateMap({
    source: filename,
    includeContent: true,
    hires: true,
  });

  return {
    code: s.toString(),
    introducedScopedSelectorSpecials,
    map: map
      ? (merge(map, nextMap) as RawSourceMap)
      : (JSON.parse(nextMap.toString()) as RawSourceMap),
    normalized,
  };
}

function normalizeNestedBlock(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  context: NestedNormalizationContext,
): ApplyBlockDecorationResult {
  switch (block.blockKind) {
    case "style":
      return applyStyleRuleNormalizationInstructions(
        block,
        s,
        source,
        createStyleRuleNormalizationInstructions(block, context),
      );
    case "at-rule":
      return applyAtRuleNormalizationInstructions(
        block,
        s,
        source,
        createAtRuleNormalizationInstructions(block, context),
      );
    default:
      return {
        changed: false,
        introducedScopedSelectorSpecials: false,
      };
  }
}

function normalizeChildBlocks(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  styleContext: NestedNormalizationContext,
  atRuleContext: NestedNormalizationContext,
): ApplyBlockDecorationResult {
  let changed = false;
  let introducedScopedSelectorSpecials = false;

  for (const child of block.children) {
    const childResult = normalizeNestedBlock(
      child,
      s,
      source,
      child.blockKind === "style" ? styleContext : atRuleContext,
    );
    changed ||= childResult.changed;
    introducedScopedSelectorSpecials ||= childResult.introducedScopedSelectorSpecials;
  }

  return {
    changed,
    introducedScopedSelectorSpecials,
  };
}

function applyStyleRuleNormalizationInstructions(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  instructions: StyleRuleNormalizationInstructions,
): ApplyBlockDecorationResult {
  if (instructions.warningMessage) {
    warnOnce(instructions.warningMessage);
  }

  const decoration = applyBlockDecorationInstructions(block, s, source, instructions);
  const children = normalizeChildBlocks(
    block,
    s,
    source,
    instructions.childStyleContext,
    instructions.childAtRuleContext,
  );

  return {
    changed: decoration.changed || children.changed,
    introducedScopedSelectorSpecials:
      decoration.introducedScopedSelectorSpecials || children.introducedScopedSelectorSpecials,
  };
}

function applyAtRuleNormalizationInstructions(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  instructions: AtRuleNormalizationInstructions,
): ApplyBlockDecorationResult {
  const decoration = applyBlockDecorationInstructions(block, s, source, instructions);
  const children = normalizeChildBlocks(
    block,
    s,
    source,
    instructions.childStyleContext,
    instructions.childAtRuleContext,
  );

  return {
    changed: decoration.changed || children.changed,
    introducedScopedSelectorSpecials:
      decoration.introducedScopedSelectorSpecials || children.introducedScopedSelectorSpecials,
  };
}

function applyBlockDecorationInstructions(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  instructions: BlockDecorationInstructions,
): ApplyBlockDecorationResult {
  let changed = false;
  let introducedScopedSelectorSpecials = false;

  // Context-only parent rules should not receive the normal scope attribute
  // themselves. They only provide nesting context for the explicit `& { ... }`
  // wrapper blocks that we synthesize below.
  if (instructions.disableCurrentRuleInjection) {
    const wrappedPrelude = wrapPreludeInNoInjectCarrier(block, s);
    changed ||= wrappedPrelude;
    introducedScopedSelectorSpecials ||= wrappedPrelude;
  }

  if (instructions.declarationWrapperPrelude) {
    const wrappedTopLevelText = wrapTopLevelTextSegments(
      block,
      s,
      source,
      instructions.declarationWrapperPrelude,
    );
    changed ||= wrappedTopLevelText;
    introducedScopedSelectorSpecials ||=
      wrappedTopLevelText && instructions.declarationWrapperPrelude.includes(":global(");
  }

  return {
    changed,
    introducedScopedSelectorSpecials,
  };
}
