import type { Selector } from "lightningcss";
import { extend } from "@vue/shared";
import { isDeepMarker, isNoInjectMarker } from "../../context";
import { removeNoInjectMarkers } from "./cleanup";
import { isScopeContainer } from "../direct";
import type {
  ScopeInjectMode,
  ScopedSelectorHelpers,
  SelectorContainerSelector,
} from "../../types";

// Tracks which scoping side nested container rewriting is currently on.
// Only `local` is allowed to place the normal component scope attribute.
export type NestedScopeContext = "local" | "after-deep" | "slotted" | "unscoped";

export function rewriteNestedScopeContainers(
  selector: Selector,
  context: NestedScopeContext,
  helpers: ScopedSelectorHelpers,
  rewriteLocalBranch: (selector: Selector) => Selector,
): Selector {
  let rewrittenSelector: Selector | undefined;
  let currentContext = context;

  for (let index = 0; index < selector.length; index++) {
    const component = selector[index];
    if (!isScopeContainer(component)) {
      if (rewrittenSelector) {
        rewrittenSelector.push(component);
      }
      if (currentContext === "local" && isDeepMarker(component)) {
        currentContext = "after-deep";
      }
      continue;
    }

    const rewrittenBranches = component.selectors.map((nestedSelector) =>
      rewriteNestedScopeContainerBranch(
        nestedSelector,
        currentContext,
        helpers,
        rewriteLocalBranch,
      ),
    );
    const branchesChanged = rewrittenBranches.some(
      (nestedSelector, nestedIndex) => nestedSelector !== component.selectors[nestedIndex],
    );

    if (!branchesChanged) {
      if (rewrittenSelector) {
        rewrittenSelector.push(component);
      }
      continue;
    }

    if (!rewrittenSelector) {
      rewrittenSelector = selector.slice(0, index);
    }

    rewrittenSelector.push(
      extend({}, component, {
        selectors: rewrittenBranches,
      }) as SelectorContainerSelector,
    );
  }

  return rewrittenSelector || selector;
}

function rewriteNestedScopeContainerBranch(
  selector: Selector,
  context: NestedScopeContext,
  helpers: ScopedSelectorHelpers,
  rewriteLocalBranch: (selector: Selector) => Selector,
): Selector {
  const effectiveContext = hasNoInjectMarker(selector) ? "unscoped" : context;
  const cleanedSelector = removeNoInjectMarkers(selector);

  if (effectiveContext !== "local") {
    return rewriteNestedScopeContainers(
      cleanedSelector,
      effectiveContext,
      helpers,
      rewriteLocalBranch,
    );
  }

  if (!branchNeedsLocalScopePlacement(cleanedSelector)) {
    return rewriteNestedScopeContainers(
      cleanedSelector,
      effectiveContext,
      helpers,
      rewriteLocalBranch,
    );
  }

  return rewriteLocalBranch(cleanedSelector);
}

export function getNestedScopeContext(injectMode: ScopeInjectMode): NestedScopeContext {
  if (injectMode === "slot") {
    return "slotted";
  }
  if (injectMode === "none") {
    return "unscoped";
  }
  return "local";
}

function hasNoInjectMarker(selector: Selector): boolean {
  return selector.some(isNoInjectMarker);
}

function branchNeedsLocalScopePlacement(selector: Selector): boolean {
  return selector.some((component) => isDeepMarker(component) || isNoInjectMarker(component));
}
