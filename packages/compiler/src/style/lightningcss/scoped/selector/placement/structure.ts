import type { Selector } from "lightningcss";
import { extend } from "@vue/shared";
import { cloneAttribute, cloneCombinator, isDeepMarker } from "../../context";
import { isScopeContainer, isSelectorContainer } from "../direct";
import type {
  SelectorPlacementClassification,
  ScopePlacementKind,
  ScopeContainerSelector,
  ScopedSelectorHelpers,
  SelectorContainerSelector,
} from "../../types";

export function normalizeSelectorForPlacement(
  selector: Selector,
  helpers: ScopedSelectorHelpers,
): Selector[] {
  let normalizedSelectors: Selector[] = [[]];

  for (const component of selector) {
    if (isScopeContainer(component)) {
      normalizedSelectors = appendStructuredScopeContainer(normalizedSelectors, component, helpers);
      continue;
    }

    if (isSelectorContainer(component)) {
      normalizedSelectors = appendStructuredSelectorContainer(
        normalizedSelectors,
        component,
        helpers,
      );
      continue;
    }

    normalizedSelectors = normalizedSelectors.map((currentSelector) => [
      ...currentSelector,
      component,
    ]);
  }

  return normalizedSelectors;
}

function appendStructuredSelectorContainer(
  selectors: Selector[],
  component: SelectorContainerSelector,
  helpers: ScopedSelectorHelpers,
): Selector[] {
  const structuredBranches = normalizeNestedBranches(component.selectors, helpers);
  const structuredContainer = extend({}, component, {
    selectors: structuredBranches,
  }) as SelectorContainerSelector;

  return selectors.map((currentSelector) => [...currentSelector, structuredContainer]);
}

function appendStructuredScopeContainer(
  selectors: Selector[],
  component: ScopeContainerSelector,
  helpers: ScopedSelectorHelpers,
): Selector[] {
  const structuredBranches = normalizeNestedBranches(component.selectors, helpers);
  const sameElementBranches = structuredBranches.filter(
    (branch) => !startsWithDeepBoundary(branch),
  );
  const descendantBranches = structuredBranches.filter(startsWithDeepBoundary);
  const nextSelectors: Selector[] = [];

  if (sameElementBranches.length) {
    const sameElementContainer = extend({}, component, {
      selectors: sameElementBranches,
    }) as ScopeContainerSelector;

    for (const currentSelector of selectors) {
      nextSelectors.push([...currentSelector, sameElementContainer]);
    }
  }

  if (descendantBranches.length) {
    const descendantSelector = buildDescendantScopeContainerSelector(
      component,
      descendantBranches,
      helpers,
    );

    for (const currentSelector of selectors) {
      nextSelectors.push([...currentSelector, ...descendantSelector]);
    }
  }

  return nextSelectors;
}

function normalizeNestedBranches(
  selectors: Selector[],
  helpers: ScopedSelectorHelpers,
): Selector[] {
  return selectors.flatMap((nestedSelector) =>
    classifySelectorForPlacement(nestedSelector).placementKind === "normalized"
      ? normalizeSelectorForPlacement(nestedSelector, helpers)
      : [nestedSelector],
  );
}

export function classifySelectorForPlacement(selector: Selector): SelectorPlacementClassification {
  let needsNestedScopeRewrite = false;
  let placementKind: ScopePlacementKind = "direct";

  for (const component of selector) {
    if (!isScopeContainer(component)) {
      continue;
    }

    needsNestedScopeRewrite = true;
    for (const nestedSelector of component.selectors) {
      const nestedClassification = classifySelectorForPlacement(nestedSelector);
      if (
        nestedClassification.placementKind === "normalized" ||
        startsWithDeepBoundary(nestedSelector)
      ) {
        placementKind = "normalized";
        break;
      }
    }

    if (placementKind === "normalized") {
      break;
    }
  }

  return {
    needsNestedScopeRewrite,
    placementKind,
  };
}

function buildDescendantScopeContainerSelector(
  component: ScopeContainerSelector,
  descendantBranches: Selector[],
  helpers: ScopedSelectorHelpers,
): Selector {
  if (component.kind === "is" && descendantBranches.length === 1) {
    return descendantBranches[0];
  }

  return prependDeepBoundary(
    [
      extend({}, component, {
        selectors: descendantBranches.map(stripLeadingDeepBoundary),
      }) as ScopeContainerSelector,
    ],
    helpers,
  );
}

function startsWithDeepBoundary(selector: Selector): boolean {
  return !!selector[0] && isDeepMarker(selector[0]);
}

function stripLeadingDeepBoundary(selector: Selector): Selector {
  const start =
    selector[0] && isDeepMarker(selector[0]) && selector[1]?.type === "combinator" ? 2 : 0;
  return selector.slice(start);
}

function prependDeepBoundary(selector: Selector, helpers: ScopedSelectorHelpers): Selector {
  return [
    cloneAttribute(helpers.deepMarker),
    cloneCombinator(helpers.descendantCombinator),
    ...selector,
  ];
}
