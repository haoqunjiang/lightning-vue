import type { Selector } from "lightningcss";
import { extend } from "@vue/shared";
import { isDeepMarker, isDescendantCombinator, isNoInjectMarker } from "../../context";
import { isSelectorContainer } from "../direct";
import type { SelectorContainerSelector } from "../../types";

export function removeNoInjectMarkers(selector: Selector): Selector {
  let cleanedSelector: Selector | undefined;

  for (let index = 0; index < selector.length; index++) {
    const component = selector[index];
    if (!isNoInjectMarker(component)) {
      if (cleanedSelector) {
        cleanedSelector.push(component);
      }
      continue;
    }

    if (!cleanedSelector) {
      cleanedSelector = selector.slice(0, index);
    }
  }

  return cleanedSelector || selector;
}

export function cleanupScopedSelectorMarkers(selector: Selector): Selector {
  let cleanedComponents: Selector | undefined;

  for (let index = 0; index < selector.length; index++) {
    const component = selector[index];
    if (isDeepMarker(component) || isNoInjectMarker(component)) {
      if (!cleanedComponents) {
        cleanedComponents = selector.slice(0, index);
      }
      continue;
    }

    if (isSelectorContainer(component)) {
      const cleanedSelectors = component.selectors.map((nestedSelector) =>
        cleanupScopedSelectorMarkers(nestedSelector),
      );
      const selectorsChanged = cleanedSelectors.some(
        (nestedSelector, nestedIndex) => nestedSelector !== component.selectors[nestedIndex],
      );

      if (cleanedComponents) {
        cleanedComponents.push(
          selectorsChanged
            ? (extend({}, component, {
                selectors: cleanedSelectors,
              }) as SelectorContainerSelector)
            : component,
        );
      } else if (selectorsChanged) {
        cleanedComponents = selector.slice(0, index);
        cleanedComponents.push(
          extend({}, component, {
            selectors: cleanedSelectors,
          }) as SelectorContainerSelector,
        );
      }
      continue;
    }

    if (cleanedComponents) {
      cleanedComponents.push(component);
    }
  }

  const normalizedSelector = cleanedComponents || selector;
  let leadingDescendants = 0;
  while (isDescendantCombinator(normalizedSelector[leadingDescendants])) {
    leadingDescendants++;
  }

  if (!leadingDescendants) {
    return normalizedSelector;
  }

  return normalizedSelector.slice(leadingDescendants);
}
