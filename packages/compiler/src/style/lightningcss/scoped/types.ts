import type { Selector, SelectorComponent, SelectorList } from "lightningcss";

export type AttributeSelector = Extract<SelectorComponent, { type: "attribute" }>;
export type CombinatorSelector = Extract<SelectorComponent, { type: "combinator" }>;
export type PseudoClassSelector = Extract<SelectorComponent, { type: "pseudo-class" }>;
export type PseudoElementSelector = Extract<SelectorComponent, { type: "pseudo-element" }>;
export type ScopeInjectMode = "none" | "normal" | "slot";

export type SelectorContainerSelector = PseudoClassSelector & {
  kind: "has" | "is" | "not" | "where";
  selectors: SelectorList;
};

export type ScopeContainerSelector = SelectorContainerSelector & {
  kind: "is" | "where";
  selectors: SelectorList;
};

export interface ScopedSelectorHelpers {
  deepMarker: AttributeSelector;
  descendantCombinator: CombinatorSelector;
  noInjectMarker: AttributeSelector;
  scopeAttribute: AttributeSelector;
  slotScopeAttribute: AttributeSelector;
}

export interface ScopedStyleTransformContext {
  helpers: ScopedSelectorHelpers;
  id: string;
}

// The placement phase only needs one plan value from expansion:
// - `direct`: place scope immediately
// - `rewrite-nested`: place directly, then revisit nested scope containers
// - `normalize-and-rewrite`: split mixed same-element/descendant structure
//   before placement, then revisit nested scope containers
export type SelectorPlacementPlan = "direct" | "rewrite-nested" | "normalize-and-rewrite";

export interface ExpandedScopedSelector {
  deep: boolean;
  placement: SelectorPlacementPlan;
  selector: Selector;
}

export interface PlacedScopedSelector {
  deep: boolean;
  selector: Selector;
}

export function placementPlanNeedsNestedRewrite(plan: SelectorPlacementPlan): boolean {
  return plan !== "direct";
}

export function placementPlanNeedsNormalization(plan: SelectorPlacementPlan): boolean {
  return plan === "normalize-and-rewrite";
}
