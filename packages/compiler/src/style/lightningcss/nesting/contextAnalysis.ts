import type { Selector, SelectorComponent } from "lightningcss";
import { parseSelectorListFromString } from "@lightning-vue/utils";
import { isScopeCarrierSelector, scopeCarrierParserOptions } from "../scopeCarriers";

// This module answers one question for nested source normalization:
// when a nested selector becomes the parent boundary for later descendants,
// does that boundary stay local, switch to deep context, switch to slot
// context, or contain mixed branches that force conservative handling?
export type NestedScopeContext = "deep" | "none" | "slotted";

export interface NestedScopeAnalysis {
  context: NestedScopeContext;
  hasMixedBranches: boolean;
}

function createNestedScopeAnalysis(
  context: NestedScopeContext,
  hasMixedBranches = false,
): NestedScopeAnalysis {
  return {
    context,
    hasMixedBranches,
  };
}

/**
 * Returns the nesting context established for later nested descendants.
 *
 * This is broader than “deep context”: it also tracks slot context and mixed
 * branch lists like `:is(:deep(.x), .y)` that force normalization to keep the
 * current rule in ordinary local mode.
 */
export function analyzeSelectorNestingContext(prelude: string): NestedScopeAnalysis {
  try {
    return collapseNestedScopeContexts(
      parseSelectorListFromString(prelude, scopeCarrierParserOptions).map(
        selectorContainsDeepContext,
      ),
    );
  } catch {
    return createNestedScopeAnalysis(detectFallbackNestingContext(prelude));
  }
}

function selectorContainsDeepContext(selector: Selector): NestedScopeAnalysis {
  return selector.reduce<NestedScopeAnalysis>(mergeNestedScopeAnalyses, none());
}

function componentContainsDeepContext(component: SelectorComponent): NestedScopeAnalysis {
  switch (component.type) {
    case "combinator":
      return none();
    case "pseudo-class":
      return analyzePseudoClassContext(component);
    case "pseudo-element":
      return analyzePseudoElementContext(component);
    default:
      return none();
  }
}

function analyzePseudoClassContext(
  component: Extract<SelectorComponent, { type: "pseudo-class" }>,
): NestedScopeAnalysis {
  if (isScopeCarrierSelector(component)) {
    return createNestedScopeAnalysis(
      component.name === "deep" ? "deep" : component.name === "slotted" ? "slotted" : "none",
    );
  }

  switch (component.kind) {
    case "is":
    case "where":
      // `:is()` and `:where()` are selector containers used by nesting
      // lowering, so deep/slot carriers inside their branches still establish
      // the context seen by later nested descendants.
      return collapseNestedScopeContexts(component.selectors.map(selectorContainsDeepContext));
    case "has":
    case "not":
      // These pseudos are selector containers, but a nested `:deep(...)` or
      // `:slotted(...)` inside one of their argument branches does not make
      // the outer rule itself a deep/slot scoping boundary for child nested
      // rules.
      return none();
    default:
      return none();
  }
}

function analyzePseudoElementContext(
  component: Extract<SelectorComponent, { type: "pseudo-element" }>,
): NestedScopeAnalysis {
  if (component.kind === "slotted") {
    // Standard shadow-DOM `::slotted()` is not Vue's slot carrier syntax.
    // It stays an ordinary selector component and does not put nested rules
    // into Vue's slot context.
    return none();
  }

  return none();
}
function detectFallbackNestingContext(prelude: string): NestedScopeContext {
  if (prelude.includes(":deep(")) {
    return "deep";
  }

  return prelude.includes(":slotted(") ? "slotted" : "none";
}

function none(): NestedScopeAnalysis {
  return createNestedScopeAnalysis("none");
}

function mergeNestedScopeAnalyses(
  analysis: NestedScopeAnalysis,
  component: SelectorComponent,
): NestedScopeAnalysis {
  const componentAnalysis = componentContainsDeepContext(component);
  return {
    context: combineNestedScopeContexts(analysis.context, componentAnalysis.context),
    hasMixedBranches: analysis.hasMixedBranches || componentAnalysis.hasMixedBranches,
  };
}

function combineNestedScopeContexts(
  left: NestedScopeContext,
  right: NestedScopeContext,
): NestedScopeContext {
  if (left === "deep" || right === "deep") {
    return "deep";
  }

  if (left === "slotted" || right === "slotted") {
    return "slotted";
  }

  return "none";
}

function collapseNestedScopeContexts(
  analyses: readonly NestedScopeAnalysis[],
): NestedScopeAnalysis {
  const [first = none(), ...rest] = analyses;

  if (rest.every((analysis) => analysis.context === first.context)) {
    return createNestedScopeAnalysis(
      first.context,
      first.hasMixedBranches || rest.some((analysis) => analysis.hasMixedBranches),
    );
  }

  return createNestedScopeAnalysis("none", true);
}
