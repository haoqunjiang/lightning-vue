import type { CssBlockNode } from "@lightning-vue/utils";
import { getPropagatedDeclarationWrapper } from "./atRules";
import type { NestedScopeContext } from "./contextAnalysis";
import { analyzeSelectorNestingContext } from "./contextAnalysis";
import { preludeIsPureGlobalCarrier } from "../scopeCarriers";
import { createNoInjectAmpPrelude } from "./text";

// Nested normalization is easiest to reason about in two steps:
// 1. analyze what each block means for later descendants
// 2. apply those decisions as a source rewrite
//
// This module owns the first step. The apply phase lives in `normalize.ts`.
export interface NestedNormalizationContext {
  inheritedContext: NestedScopeContext;
  propagatedDeclarationWrapper: string | null;
}

export interface BlockDecorationInstructions {
  declarationWrapperPrelude: string | null;
  disableCurrentRuleInjection: boolean;
}

export interface ChildNormalizationInstructions {
  childAtRuleContext: NestedNormalizationContext;
  childStyleContext: NestedNormalizationContext;
}

export interface StyleRuleNormalizationInstructions
  extends BlockDecorationInstructions, ChildNormalizationInstructions {
  blockKind: "style";
  warningMessage: string | null;
}

export interface AtRuleNormalizationInstructions
  extends BlockDecorationInstructions, ChildNormalizationInstructions {
  blockKind: "at-rule";
}

export type NestedBlockNormalizationInstructions =
  | StyleRuleNormalizationInstructions
  | AtRuleNormalizationInstructions;

export function createInitialNestedNormalizationContext(): NestedNormalizationContext {
  return {
    inheritedContext: "none",
    propagatedDeclarationWrapper: null,
  };
}

export function createNestedBlockNormalizationInstructions(
  block: CssBlockNode,
  context: NestedNormalizationContext,
): NestedBlockNormalizationInstructions | null {
  switch (block.blockKind) {
    case "style":
      return createStyleRuleNormalizationInstructions(block, context);
    case "at-rule":
      return createAtRuleNormalizationInstructions(block, context);
    default:
      return null;
  }
}

export function createStyleRuleNormalizationInstructions(
  block: CssBlockNode,
  context: NestedNormalizationContext,
): StyleRuleNormalizationInstructions {
  const ownContextAnalysis = analyzeSelectorNestingContext(block.normalizedPrelude);
  const inheritsContext = context.inheritedContext !== "none";
  const hasDirectNestedStyleRules = block.children.some((child) => child.blockKind === "style");
  const shouldWrapDeclarations = hasDirectNestedStyleRules && ownContextAnalysis.context === "none";
  const declarationWrapperPrelude = shouldWrapDeclarations
    ? shouldUseNoInjectDeclarationWrapper(block.normalizedPrelude, inheritsContext)
      ? createNoInjectAmpPrelude()
      : "&"
    : null;
  const inheritedContextForChildren = inheritsContext
    ? context.inheritedContext
    : ownContextAnalysis.context;

  // Examples:
  //
  // `.card { color: red; .title { ... } }`
  //   -> wrap declarations with `& { ... }`
  //   -> disable current-rule injection so `.card` acts as a nesting boundary
  //
  // `:deep(.shell) { color: red; .title { ... } }`
  //   -> keep the current rule injectable
  //   -> push `deep` context into children so later descendants stay unscoped
  return {
    blockKind: "style",
    warningMessage:
      hasDirectNestedStyleRules && ownContextAnalysis.hasMixedBranches
        ? "Mixed selector branches that combine Vue deep/slotted carriers with ordinary local branches under nested rules are handled conservatively. Descendants stay locally scoped; split the selector list into separate rules for precise behavior."
        : null,
    declarationWrapperPrelude,
    disableCurrentRuleInjection: inheritsContext || shouldWrapDeclarations,
    ...createChildNormalizationInstructions(inheritedContextForChildren, declarationWrapperPrelude),
  };
}

export function createAtRuleNormalizationInstructions(
  block: CssBlockNode,
  context: NestedNormalizationContext,
): AtRuleNormalizationInstructions {
  const propagatedDeclarationWrapper = getPropagatedDeclarationWrapper(
    block.normalizedPrelude,
    context.propagatedDeclarationWrapper,
  );

  // Conditional wrappers such as `@media` do not change deep/slot/local
  // context themselves. They only forward the current context and, when
  // relevant, the declaration wrapper for child declarations.
  return {
    blockKind: "at-rule",
    declarationWrapperPrelude: propagatedDeclarationWrapper,
    disableCurrentRuleInjection: false,
    ...createChildNormalizationInstructions(context.inheritedContext, propagatedDeclarationWrapper),
  };
}

function shouldUseNoInjectDeclarationWrapper(prelude: string, inheritsContext: boolean): boolean {
  return inheritsContext || (prelude.includes(":global(") && preludeIsPureGlobalCarrier(prelude));
}

function createChildNormalizationInstructions(
  inheritedContext: NestedScopeContext,
  declarationWrapperPrelude: string | null,
): ChildNormalizationInstructions {
  return {
    childAtRuleContext: {
      // Conditional wrappers like `@media` should not change whether the
      // nested subtree is still in deep/slot context. They only guard when the
      // nested selector applies.
      inheritedContext,
      propagatedDeclarationWrapper: declarationWrapperPrelude,
    },
    childStyleContext: {
      inheritedContext,
      propagatedDeclarationWrapper: null,
    },
  };
}
