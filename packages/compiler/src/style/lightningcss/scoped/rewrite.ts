import type { Selector } from "lightningcss";
import { rewriteDirectScopedSelector } from "./selector/direct";
import { canUseDirectScopeRewrite, expandScopeCarriers } from "./selector/expansion";
import { appendPlacedScopeAttributes, cleanupScopedSelectorMarkers } from "./selector/placement";
import type {
  ExpandedScopedSelector,
  PlacedScopedSelector,
  ScopeInjectMode,
  ScopedSelectorHelpers,
  ScopedStyleTransformContext,
} from "./types";

export function rewriteScopedSelector(
  selector: Selector,
  context: ScopedStyleTransformContext,
): Selector | Selector[] {
  if (canUseDirectScopeRewrite(selector)) {
    return rewriteDirectScopedSelector(selector, context.helpers);
  }

  return rewriteExpandedScopedSelector(selector, "normal", context.helpers);
}

/**
 * Appends the scoped selector rewrite into `target`.
 *
 * This gives source-level callers a single-shape contract even though a scoped
 * rewrite may expand one selector into many. The visitor path keeps the
 * smaller `Selector | Selector[]` contract to avoid wrapping the direct path in
 * an extra array on the hot AST visitor path.
 */
export function appendRewrittenScopedSelectors(
  selector: Selector,
  context: ScopedStyleTransformContext,
  target: Selector[],
): void {
  if (canUseDirectScopeRewrite(selector)) {
    target.push(rewriteDirectScopedSelector(selector, context.helpers));
    return;
  }

  appendExpandedScopedSelectors(selector, "normal", context.helpers, target);
}

export function rewriteSimpleScopedSelector(
  selector: Selector,
  context: ScopedStyleTransformContext,
): Selector {
  return rewriteDirectScopedSelector(selector, context.helpers);
}

function rewriteExpandedScopedSelector(
  selector: Selector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): Selector[] {
  const rewrittenSelectors: Selector[] = [];
  appendExpandedScopedSelectors(selector, injectMode, helpers, rewrittenSelectors);
  return rewrittenSelectors;
}

function appendExpandedScopedSelectors(
  selector: Selector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
  target: Selector[],
): void {
  const expanded = expandScopedSelectorCarriers(selector, helpers);
  const placed: PlacedScopedSelector[] = [];
  appendPlacedScopeAttributesOnExpandedSelectors(expanded, injectMode, helpers, placed);
  appendCleanedScopedSelectorResults(placed, target);
}

function expandScopedSelectorCarriers(
  selector: Selector,
  helpers: ScopedSelectorHelpers,
): ExpandedScopedSelector[] {
  // Phase 1: expand Vue-specific carrier syntax into ordinary selector states
  // plus internal markers. `:slotted(...)` is the one special case that
  // eagerly materializes slot scope on its inner selectors before they are
  // merged back into the outer selector.
  return expandScopeCarriers(selector, helpers);
}

function appendPlacedScopeAttributesOnExpandedSelectors(
  expanded: ExpandedScopedSelector[],
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
  target: PlacedScopedSelector[],
): void {
  // Phase 2: interpret no-inject markers and place component or slot scope
  // attributes on the expanded selector states.
  for (const result of expanded) {
    appendPlacedScopeAttributes(result, injectMode, helpers, target);
  }
}

function appendCleanedScopedSelectorResults(
  rewritten: PlacedScopedSelector[],
  target: Selector[],
): void {
  // Phase 3: remove internal deep/no-inject markers once scope placement is
  // complete, recursively cleaning any selector containers.
  for (const result of rewritten) {
    target.push(cleanupScopedSelectorMarkers(result.selector));
  }
}
