import type { RawSourceMap } from "@vue/compiler-core";
import { type CssBlockNode, parseCssBlockTree, scopeSelectorPrelude } from "@lightning-vue/utils";
import MagicString from "magic-string";
import merge from "merge-source-map";
import { warnOnce } from "../../../warn";
import {
  createInitialNestedNormalizationContext,
  createNestedBlockNormalizationInstructions,
  type BlockDecorationInstructions,
  type ChildNormalizationInstructions,
  type NestedNormalizationContext,
  type NestedBlockNormalizationInstructions,
} from "./instructions";
import {
  overwriteBlockPrelude,
  wrapPreludeInNoInjectCarrier,
  wrapTopLevelTextSegments,
} from "./text";

export interface NormalizeNestedStyleBlocksResult {
  code: string;
  introducedScopedSelectorSpecials: boolean;
  map: RawSourceMap | undefined;
  normalized: boolean;
  preparedLocalSource: boolean;
}

interface ApplyBlockDecorationResult {
  changed: boolean;
  introducedScopedSelectorSpecials: boolean;
}

interface PreparedLocalScopeBlockPlan {
  block: CssBlockNode;
  children: PreparedLocalScopeBlockPlan[];
  declarationWrapperPreludeRewrite: string | null;
  preludeRewrite: string | null;
  warningMessage: string | null;
}

export interface NormalizeNestedStyleBlocksOptions {
  preparedLocalScopeId?: string;
}

export function normalizeNestedStyleBlocks(
  source: string,
  filename: string,
  map?: RawSourceMap,
  sourceMap: boolean = !!map,
  options?: NormalizeNestedStyleBlocksOptions,
): NormalizeNestedStyleBlocksResult {
  // Apply the block-local instructions from `instructions.ts` before selector
  // scoping so the later scoped rewrite sees explicit `& { ... }`
  // declaration blocks instead of mixed declaration/rule bodies.
  const s = new MagicString(source);
  const roots = parseCssBlockTree(source);
  let normalized = false;
  let introducedScopedSelectorSpecials = false;
  let preparedLocalSource = false;

  const noteResult = (result: ApplyBlockDecorationResult) => {
    normalized ||= result.changed;
    introducedScopedSelectorSpecials ||= result.changed && result.introducedScopedSelectorSpecials;
  };

  const preparedLocalScopePlan = options?.preparedLocalScopeId
    ? createPreparedLocalScopePlan(roots, options.preparedLocalScopeId)
    : null;

  if (preparedLocalScopePlan) {
    for (const blockPlan of preparedLocalScopePlan) {
      const result = applyPreparedLocalScopePlan(blockPlan, s, source);
      normalized ||= result.changed;
    }
    preparedLocalSource = normalized;
  } else {
    for (const block of roots) {
      noteResult(normalizeNestedBlock(block, s, source, createInitialNestedNormalizationContext()));
    }
  }

  if (!normalized) {
    return {
      code: source,
      introducedScopedSelectorSpecials: false,
      map,
      normalized,
      preparedLocalSource: false,
    };
  }

  if (!sourceMap) {
    return {
      code: s.toString(),
      introducedScopedSelectorSpecials,
      map: undefined,
      normalized,
      preparedLocalSource,
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
    preparedLocalSource,
  };
}

function createPreparedLocalScopePlan(
  roots: CssBlockNode[],
  id: string,
): PreparedLocalScopeBlockPlan[] | null {
  const plans: PreparedLocalScopeBlockPlan[] = [];
  for (const block of roots) {
    const plannedBlock = createPreparedLocalScopePlanForBlock(
      block,
      createInitialNestedNormalizationContext(),
      id,
    );
    if (!plannedBlock) {
      return null;
    }
    plans.push(plannedBlock);
  }
  return plans;
}

function createPreparedLocalScopePlanForBlock(
  block: CssBlockNode,
  context: NestedNormalizationContext,
  id: string,
): PreparedLocalScopeBlockPlan | null {
  const instructions = createNestedBlockNormalizationInstructions(block, context);
  if (!instructions) {
    return null;
  }

  const preludeRewrite =
    block.blockKind === "style" && !instructions.disableCurrentRuleInjection
      ? (scopeSelectorPrelude(block.normalizedPrelude, id) ?? null)
      : null;
  if (block.blockKind === "style" && !instructions.disableCurrentRuleInjection && !preludeRewrite) {
    return null;
  }

  const declarationWrapperPreludeRewrite = instructions.declarationWrapperPrelude
    ? (scopeSelectorPrelude(instructions.declarationWrapperPrelude, id) ?? null)
    : null;
  if (instructions.declarationWrapperPrelude && !declarationWrapperPreludeRewrite) {
    return null;
  }

  const children: PreparedLocalScopeBlockPlan[] = [];
  for (const child of block.children) {
    const plannedChild = createPreparedLocalScopePlanForBlock(
      child,
      getChildNormalizationContext(child.blockKind, instructions),
      id,
    );
    if (!plannedChild) {
      return null;
    }
    children.push(plannedChild);
  }

  return {
    block,
    children,
    declarationWrapperPreludeRewrite,
    preludeRewrite,
    warningMessage: "warningMessage" in instructions ? instructions.warningMessage : null,
  };
}

function applyPreparedLocalScopePlan(
  blockPlan: PreparedLocalScopeBlockPlan,
  s: MagicString,
  source: string,
): { changed: boolean } {
  if (blockPlan.warningMessage) {
    warnOnce(blockPlan.warningMessage);
  }

  let changed = false;
  if (blockPlan.preludeRewrite) {
    changed ||= overwriteBlockPrelude(blockPlan.block, s, blockPlan.preludeRewrite);
  }

  if (blockPlan.declarationWrapperPreludeRewrite) {
    changed ||= wrapTopLevelTextSegments(
      blockPlan.block,
      s,
      source,
      blockPlan.declarationWrapperPreludeRewrite,
    );
  }

  for (const child of blockPlan.children) {
    const childResult = applyPreparedLocalScopePlan(child, s, source);
    changed ||= childResult.changed;
  }

  return { changed };
}

function normalizeNestedBlock(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  context: NestedNormalizationContext,
): ApplyBlockDecorationResult {
  const instructions = createNestedBlockNormalizationInstructions(block, context);
  if (!instructions) {
    return {
      changed: false,
      introducedScopedSelectorSpecials: false,
    };
  }

  return applyNestedBlockNormalizationInstructions(block, s, source, instructions);
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
      getChildNormalizationContext(child.blockKind, {
        childStyleContext: styleContext,
        childAtRuleContext: atRuleContext,
      }),
    );
    changed ||= childResult.changed;
    introducedScopedSelectorSpecials ||= childResult.introducedScopedSelectorSpecials;
  }

  return {
    changed,
    introducedScopedSelectorSpecials,
  };
}

function applyNestedBlockNormalizationInstructions(
  block: CssBlockNode,
  s: MagicString,
  source: string,
  instructions: NestedBlockNormalizationInstructions,
): ApplyBlockDecorationResult {
  if ("warningMessage" in instructions && instructions.warningMessage) {
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

function getChildNormalizationContext(
  blockKind: CssBlockNode["blockKind"],
  instructions: ChildNormalizationInstructions,
): NestedNormalizationContext {
  return blockKind === "style" ? instructions.childStyleContext : instructions.childAtRuleContext;
}
