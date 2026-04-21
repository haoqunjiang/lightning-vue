import type { Selector } from "lightningcss";
import { extend } from "@vue/shared";
import { cloneAttribute, isNoInjectMarker } from "../../context";
import { findInjectionAnchor, isSelectorContainer, stripLeadingUniversal } from "../direct";
import { compoundHasRelevantScopeAttribute, shouldInjectContainerScope } from "./compound";
import { cleanupScopedSelectorMarkers, removeNoInjectMarkers } from "./cleanup";
import { getNestedScopeContext, rewriteNestedScopeContainers } from "./nested";
import { classifySelectorForPlacement, normalizeSelectorForPlacement } from "./structure";
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
  const placedSelectors: ExpandedScopedSelector[] = [];
  appendPlacedScopeAttributes(result, injectMode, helpers, placedSelectors);
  return placedSelectors;
}

export function appendPlacedScopeAttributes(
  result: ExpandedScopedSelector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
  target: ExpandedScopedSelector[],
): void {
  const effectiveMode = containsNoInjectMarker(result.selector) ? "none" : injectMode;
  const selector = removeNoInjectMarkers(result.selector);
  if (effectiveMode !== "none") {
    stripLeadingUniversal(selector);
  }

  const placementReadySelectors =
    result.placementKind === "normalized"
      ? normalizeSelectorForPlacement(selector, helpers)
      : [selector];

  for (const placementReadySelector of placementReadySelectors) {
    target.push(
      placeScopeAttributesOnPlacementReadySelector(
        result,
        placementReadySelector,
        effectiveMode,
        helpers,
      ),
    );
  }
}

function placeScopeAttributesOnPlacementReadySelector(
  result: ExpandedScopedSelector,
  selector: Selector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): ExpandedScopedSelector {
  const anchorIndex = findInjectionAnchor(selector);
  const nestedContext = getNestedScopeContext(injectMode);
  const rewriteLocalBranch = (nestedSelector: Selector) =>
    rewriteNestedLocalBranch(nestedSelector, helpers);
  const rewriteNestedContainers = (currentSelector: Selector) =>
    result.needsNestedScopeRewrite
      ? rewriteNestedScopeContainers(currentSelector, nestedContext, helpers, rewriteLocalBranch)
      : currentSelector;

  if (
    injectMode !== "none" &&
    compoundHasRelevantScopeAttribute(selector, anchorIndex, injectMode, helpers)
  ) {
    return createPlacedSelectorResult(result.deep, rewriteNestedContainers(selector));
  }

  if (anchorIndex !== -1 && isSelectorContainer(selector[anchorIndex])) {
    return injectScopeIntoContainer(result.deep, selector, anchorIndex, injectMode, helpers);
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

  return createPlacedSelectorResult(result.deep, rewriteNestedContainers(selector));
}

function rewriteNestedLocalBranch(selector: Selector, helpers: ScopedSelectorHelpers): Selector {
  return placeSingleScopeResult(
    createExpandedPlacementState(selector),
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
  const nestedSelectors: Selector[] = [];

  for (const nestedSelector of container.selectors) {
    const nestedResults: ExpandedScopedSelector[] = [];
    appendPlacedScopeAttributes(
      createExpandedPlacementState(nestedSelector),
      injectMode,
      helpers,
      nestedResults,
    );

    for (const nestedResult of nestedResults) {
      nestedDeep ||= nestedResult.deep;
      nestedSelectors.push(nestedResult.selector);
    }
  }

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

  return createPlacedSelectorResult(nestedDeep, rewrittenSelector);
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
  const rewritten: ExpandedScopedSelector[] = [];
  appendPlacedScopeAttributes(result, injectMode, helpers, rewritten);
  if (rewritten.length !== 1) {
    throw new Error(`Expected a single selector result while handling ${context}.`);
  }
  return rewritten[0].selector;
}

function createExpandedPlacementState(selector: Selector): ExpandedScopedSelector {
  const classification = classifySelectorForPlacement(selector);
  return {
    deep: false,
    selector,
    ...classification,
  };
}

function createPlacedSelectorResult(deep: boolean, selector: Selector): ExpandedScopedSelector {
  return {
    deep,
    needsNestedScopeRewrite: false,
    placementKind: "direct",
    selector,
  };
}
