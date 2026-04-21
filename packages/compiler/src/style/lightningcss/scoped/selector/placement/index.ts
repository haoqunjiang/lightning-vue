import type { Selector } from "lightningcss";
import { extend } from "@vue/shared";
import { cloneAttribute, isNoInjectMarker } from "../../context";
import { findInjectionAnchor, isSelectorContainer, stripLeadingUniversal } from "../direct";
import { compoundHasRelevantScopeAttribute, shouldInjectContainerScope } from "./compound";
import { cleanupScopedSelectorMarkers, removeNoInjectMarkers } from "./cleanup";
import { getNestedScopeContext, rewriteNestedScopeContainers } from "./nested";
import { getSelectorPlacementKind, normalizeSelectorForPlacement } from "./structure";
import type {
  ExpandedScopedSelector,
  ScopeInjectMode,
  ScopedSelectorHelpers,
  SelectorContainerSelector,
} from "../../types";

export { cleanupScopedSelectorMarkers };

export function placeScopeAttributes(
  result: ExpandedScopedSelector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): ExpandedScopedSelector[] {
  const effectiveMode = containsNoInjectMarker(result.selector) ? "none" : injectMode;
  const selector = removeNoInjectMarkers(result.selector);
  if (effectiveMode !== "none") {
    stripLeadingUniversal(selector);
  }

  const placementReadySelectors =
    result.placementKind === "normalized"
      ? normalizeSelectorForPlacement(selector, helpers)
      : [selector];

  return placementReadySelectors.map((placementReadySelector) =>
    placeScopeAttributesOnPlacementReadySelector(
      result.deep,
      placementReadySelector,
      effectiveMode,
      helpers,
    ),
  );
}

function placeScopeAttributesOnPlacementReadySelector(
  deep: boolean,
  selector: Selector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): ExpandedScopedSelector {
  const anchorIndex = findInjectionAnchor(selector);
  const nestedContext = getNestedScopeContext(injectMode);
  const rewriteLocalBranch = (nestedSelector: Selector) =>
    rewriteNestedLocalBranch(nestedSelector, helpers);

  if (
    injectMode !== "none" &&
    compoundHasRelevantScopeAttribute(selector, anchorIndex, injectMode, helpers)
  ) {
    return {
      deep,
      placementKind: "direct",
      selector: rewriteNestedScopeContainers(selector, nestedContext, helpers, rewriteLocalBranch),
    };
  }

  if (anchorIndex !== -1 && isSelectorContainer(selector[anchorIndex])) {
    return injectScopeIntoContainer(deep, selector, anchorIndex, injectMode, helpers);
  }

  if (injectMode !== "none") {
    const scopedAttribute =
      injectMode === "slot"
        ? cloneAttribute(helpers.slotScopeAttribute)
        : cloneAttribute(helpers.scopeAttribute);
    if (anchorIndex === -1) {
      selector.unshift(scopedAttribute);
    } else {
      selector.splice(anchorIndex + 1, 0, scopedAttribute);
    }
  }

  return {
    deep,
    placementKind: "direct",
    selector: rewriteNestedScopeContainers(selector, nestedContext, helpers, rewriteLocalBranch),
  };
}

function rewriteNestedLocalBranch(selector: Selector, helpers: ScopedSelectorHelpers): Selector {
  return placeSingleScopeResult(
    {
      deep: false,
      placementKind: getSelectorPlacementKind(selector),
      selector,
    },
    "normal",
    helpers,
    "nested local branch rewrite",
  );
}

function injectScopeIntoContainer(
  deep: boolean,
  selector: Selector,
  anchorIndex: number,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): ExpandedScopedSelector {
  let nestedDeep = deep;
  const container = selector[anchorIndex] as SelectorContainerSelector;
  const originalNestedSelectors = container.selectors;
  const nestedSelectors = container.selectors.flatMap((nestedSelector) =>
    placeScopeAttributes(
      {
        deep: false,
        placementKind: getSelectorPlacementKind(nestedSelector),
        selector: nestedSelector,
      },
      injectMode,
      helpers,
    ).map((nestedResult) => {
      nestedDeep ||= nestedResult.deep;
      return nestedResult.selector;
    }),
  );

  const rewrittenSelector = selector.slice();
  rewrittenSelector[anchorIndex] = extend({}, container, {
    selectors: nestedSelectors,
  }) as SelectorContainerSelector;

  if (
    injectMode !== "none" &&
    shouldInjectContainerScope(
      container,
      originalNestedSelectors,
      nestedSelectors,
      injectMode,
      helpers,
    )
  ) {
    const scopedAttribute =
      injectMode === "slot"
        ? cloneAttribute(helpers.slotScopeAttribute)
        : cloneAttribute(helpers.scopeAttribute);
    rewrittenSelector.splice(anchorIndex + 1, 0, scopedAttribute);
  }

  return {
    deep: nestedDeep,
    placementKind: "direct",
    selector: rewrittenSelector,
  };
}

function containsNoInjectMarker(selector: Selector): boolean {
  return selector.some(isNoInjectMarker);
}

function placeSingleScopeResult(
  result: ExpandedScopedSelector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
  context: string,
): Selector {
  const rewritten = placeScopeAttributes(result, injectMode, helpers);
  if (rewritten.length !== 1) {
    throw new Error(`Expected a single selector result while handling ${context}.`);
  }
  return rewritten[0].selector;
}
