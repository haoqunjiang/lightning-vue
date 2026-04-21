import type { Selector, SelectorComponent, SelectorList } from "lightningcss";
import { extend } from "@vue/shared";
import { parseSelectorListFromTokens } from "@lightning-vue/utils";
import type { ScopeCarrierKind } from "../../scopeCarriers";
import { isScopeCarrierSelector, scopeCarrierParserOptions } from "../../scopeCarriers";
import { cloneAttribute, cloneCombinator, isCombinator, isDeepMarker } from "../context";
import { placeScopeAttributes } from "./placement";
import { isScopeContainer, isSelectorContainer } from "./direct";
import type {
  ExpandedScopedSelector,
  ScopePlacementKind,
  ScopedSelectorHelpers,
  SelectorContainerSelector,
} from "../types";

interface ScopeCarrier {
  kind: ScopeCarrierKind;
  selectors: SelectorList;
}

type ExpandedSelectorStates = ExpandedScopedSelector[];

export function canUseDirectScopeRewrite(selector: Selector): boolean {
  for (const component of selector) {
    if (isScopeCarrierSelector(component)) {
      return false;
    }

    if (isSelectorContainer(component)) {
      for (const nestedSelector of component.selectors) {
        if (!canUseDirectScopeRewrite(nestedSelector)) {
          return false;
        }
      }
    }
  }

  return true;
}

export function expandScopeCarriers(
  selector: Selector,
  helpers: ScopedSelectorHelpers,
): ExpandedScopedSelector[] {
  // This phase expands Vue-specific selector syntax into ordinary selector
  // states plus a few internal markers that the placement phase understands.
  //
  // A single input selector may fan out into many output states because carrier
  // pseudos such as `:deep(...)`, `:global(...)`, and `:slotted(...)` can each
  // contain selector lists.
  let results: ExpandedSelectorStates = [createExpandedSelectorState([], false, "direct")];

  for (const component of selector) {
    const carrier = getScopeCarrier(component);
    if (carrier) {
      if (carrier.kind === "global") {
        // `:global(...)` replaces the current selector branch rather than
        // extending it, so the outer prefix is intentionally discarded here.
        results = expandGlobalCarrier(carrier, helpers);
        continue;
      }

      if (carrier.kind === "slotted") {
        results = expandSlottedCarrier(results, carrier, helpers);
        continue;
      }

      results = expandDeepCarrier(results, carrier, helpers);
      continue;
    }

    if (isSelectorContainer(component)) {
      results = appendSelectorContainer(results, component, helpers);
      continue;
    }

    results = appendPlainComponent(results, component);
  }

  return results;
}

function expandGlobalCarrier(
  carrier: ScopeCarrier,
  helpers: ScopedSelectorHelpers,
): ExpandedSelectorStates {
  const expanded: ExpandedSelectorStates = [];
  for (const innerSelector of carrier.selectors) {
    const innerResults = expandScopeCarriers(innerSelector, helpers);
    for (const result of innerResults) {
      expanded.push(
        createExpandedSelectorState(
          prependNoInjectMarker(result.selector, helpers),
          result.deep,
          result.placementKind,
        ),
      );
    }
  }
  return expanded;
}

function expandSlottedCarrier(
  results: ExpandedSelectorStates,
  carrier: ScopeCarrier,
  helpers: ScopedSelectorHelpers,
): ExpandedSelectorStates {
  // Slotted selectors are the one place where expansion must eagerly apply slot
  // scope to the carrier payload before it is merged back into the outer
  // selector. The later placement phase should not scope the merged selector
  // again, so we prepend the no-inject marker afterward.
  const slotScopedInnerSelectors: ExpandedSelectorStates = [];
  for (const innerSelector of carrier.selectors) {
    const innerResults = expandScopeCarriers(innerSelector, helpers);
    for (const result of innerResults) {
      slotScopedInnerSelectors.push(...placeScopeAttributes(result, "slot", helpers));
    }
  }

  const expanded: ExpandedSelectorStates = [];
  for (const state of results) {
    for (const innerSelector of slotScopedInnerSelectors) {
      expanded.push(
        createExpandedSelectorState(
          prependNoInjectMarker([...state.selector, ...innerSelector.selector], helpers),
          state.deep || innerSelector.deep,
          state.placementKind,
        ),
      );
    }
  }

  return expanded;
}

function expandDeepCarrier(
  results: ExpandedSelectorStates,
  carrier: ScopeCarrier,
  helpers: ScopedSelectorHelpers,
): ExpandedSelectorStates {
  const expanded: ExpandedSelectorStates = [];
  for (const state of results) {
    for (const innerSelector of carrier.selectors) {
      const innerResults = expandScopeCarriers(innerSelector, helpers);
      for (const result of innerResults) {
        expanded.push(
          createExpandedSelectorState(
            appendDeepSelector(state.selector, result.selector, helpers),
            true,
            state.placementKind,
          ),
        );
      }
    }
  }
  return expanded;
}

function appendSelectorContainer(
  results: ExpandedSelectorStates,
  component: SelectorContainerSelector,
  helpers: ScopedSelectorHelpers,
): ExpandedSelectorStates {
  let nestedDeep = false;
  const nestedResults: ExpandedScopedSelector[] = [];
  const nestedSelectors: SelectorList = [];
  for (const nestedSelector of component.selectors) {
    const expandedResults = expandScopeCarriers(nestedSelector, helpers);
    for (const result of expandedResults) {
      nestedDeep ||= result.deep;
      nestedResults.push(result);
      nestedSelectors.push(result.selector);
    }
  }

  const nextComponent = extend({}, component, {
    selectors: nestedSelectors,
  }) as SelectorContainerSelector;

  for (const state of results) {
    if (isScopeContainer(component)) {
      state.deep ||= nestedDeep;
      state.placementKind = mergeScopePlacementKinds(
        state.placementKind,
        scopeContainerNeedsNormalizedPlacement(nestedResults) ? "normalized" : "direct",
      );
    }
    state.selector.push(nextComponent);
  }
  return results;
}

function appendPlainComponent(
  results: ExpandedSelectorStates,
  component: SelectorComponent,
): ExpandedSelectorStates {
  for (const state of results) {
    state.selector.push(component);
  }
  return results;
}

function getScopeCarrier(component: SelectorComponent): ScopeCarrier | null {
  if (!isScopeCarrierSelector(component)) {
    return null;
  }

  return {
    kind: component.name,
    selectors: Array.isArray(component.selectors)
      ? component.selectors
      : parseSelectorListFromTokens(component.arguments, scopeCarrierParserOptions),
  };
}

function appendDeepSelector(
  prefix: Selector,
  inner: Selector,
  helpers: ScopedSelectorHelpers,
): Selector {
  const selector = prefix.slice();
  selector.push(cloneAttribute(helpers.deepMarker));
  if (!prefix.length || !isCombinator(prefix[prefix.length - 1])) {
    selector.push(cloneCombinator(helpers.descendantCombinator));
  }
  selector.push(...inner);
  return selector;
}

function prependNoInjectMarker(selector: Selector, helpers: ScopedSelectorHelpers): Selector {
  return [cloneAttribute(helpers.noInjectMarker), ...selector];
}

function createExpandedSelectorState(
  selector: Selector,
  deep: boolean,
  placementKind: ScopePlacementKind,
): ExpandedScopedSelector {
  return {
    deep,
    placementKind,
    selector,
  };
}

function mergeScopePlacementKinds(
  left: ScopePlacementKind,
  right: ScopePlacementKind,
): ScopePlacementKind {
  return left === "normalized" || right === "normalized" ? "normalized" : "direct";
}

function scopeContainerNeedsNormalizedPlacement(results: ExpandedScopedSelector[]): boolean {
  return results.some(
    (result) =>
      result.placementKind === "normalized" || selectorStartsWithDeepBoundary(result.selector),
  );
}

function selectorStartsWithDeepBoundary(selector: Selector): boolean {
  return !!selector[0] && isDeepMarker(selector[0]);
}
