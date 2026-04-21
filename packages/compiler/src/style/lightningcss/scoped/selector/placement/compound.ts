import type { Selector } from "lightningcss";
import { isNoInjectMarker } from "../../context";
import { isSelectorContainer } from "../direct";
import type {
  ScopeInjectMode,
  ScopedSelectorHelpers,
  SelectorContainerSelector,
} from "../../types";

export function compoundHasRelevantScopeAttribute(
  selector: Selector,
  anchorIndex: number,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): boolean {
  const start = findCompoundStart(selector, anchorIndex);
  const end = findCompoundEnd(selector, anchorIndex);

  for (let index = start; index <= end; index++) {
    const component = selector[index];
    if (
      component?.type === "attribute" &&
      isRelevantScopeAttributeName(component.name, injectMode, helpers)
    ) {
      return true;
    }
  }

  return false;
}

export function findCompoundStart(selector: Selector, anchorIndex: number): number {
  if (anchorIndex === -1) {
    return 0;
  }

  if (selector[anchorIndex]?.type === "combinator") {
    return anchorIndex + 1;
  }

  let start = anchorIndex;
  while (start > 0 && selector[start - 1]?.type !== "combinator") {
    start--;
  }
  return start;
}

export function findCompoundEnd(selector: Selector, anchorIndex: number): number {
  let end = anchorIndex === -1 ? 0 : anchorIndex;
  if (selector[end]?.type === "combinator") {
    end++;
  }

  while (end + 1 < selector.length && selector[end + 1]?.type !== "combinator") {
    end++;
  }
  return end;
}

function isRelevantScopeAttributeName(
  name: string,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): boolean {
  if (injectMode === "slot") {
    return name === helpers.slotScopeAttribute.name;
  }

  return name === helpers.scopeAttribute.name || name === helpers.slotScopeAttribute.name;
}

function selectorContainsScopeAttribute(selector: Selector, scopeAttributeName: string): boolean {
  return selector.some((component) => {
    if (component.type === "attribute") {
      return component.name === scopeAttributeName;
    }

    return (
      isSelectorContainer(component) &&
      component.selectors.some((nestedSelector) =>
        selectorContainsScopeAttribute(nestedSelector, scopeAttributeName),
      )
    );
  });
}

function selectorContainsNoInjectMarker(selector: Selector): boolean {
  return selector.some((component) => {
    if (isNoInjectMarker(component)) {
      return true;
    }

    return (
      isSelectorContainer(component) &&
      component.selectors.some((nestedSelector) => selectorContainsNoInjectMarker(nestedSelector))
    );
  });
}

function selectorSatisfiesContainerScope(
  selector: Selector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): boolean {
  if (injectMode === "slot") {
    return selectorContainsScopeAttribute(selector, helpers.slotScopeAttribute.name);
  }

  return (
    selectorContainsScopeAttribute(selector, helpers.scopeAttribute.name) ||
    selectorContainsScopeAttribute(selector, helpers.slotScopeAttribute.name)
  );
}

export function shouldInjectContainerScope(
  container: SelectorContainerSelector,
  originalNestedSelectors: Selector[],
  nestedSelectors: Selector[],
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): boolean {
  if (container.kind === "has" || container.kind === "not") {
    return true;
  }

  return nestedSelectors.some(
    (nestedSelector, index) =>
      !selectorSatisfiesContainerScope(nestedSelector, injectMode, helpers) &&
      !selectorContainsNoInjectMarker(originalNestedSelectors[index]),
  );
}
