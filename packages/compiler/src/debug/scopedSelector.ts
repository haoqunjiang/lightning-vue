import type { Selector } from "lightningcss";
import { parseSelectorListFromString, stringifySelector } from "@lightning-vue/utils";
import { scopeCarrierParserOptions } from "../style/lightningcss/scopeCarriers";
import {
  createScopedStyleTransformContext,
  isNoInjectMarker,
} from "../style/lightningcss/scoped/context";
import { rewriteScopedSelector } from "../style/lightningcss/scoped/rewrite";
import {
  rewriteDirectScopedSelector,
  stripLeadingUniversal,
} from "../style/lightningcss/scoped/selector/direct";
import {
  canUseDirectScopeRewrite,
  expandScopeCarriers,
} from "../style/lightningcss/scoped/selector/expansion";
import {
  cleanupScopedSelectorMarkers,
  placeScopeAttributes,
} from "../style/lightningcss/scoped/selector/placement";
import { removeNoInjectMarkers } from "../style/lightningcss/scoped/selector/placement/cleanup";
import { normalizeSelectorForPlacement } from "../style/lightningcss/scoped/selector/placement/structure";
import {
  placementPlanNeedsNestedRewrite,
  placementPlanNeedsNormalization,
} from "../style/lightningcss/scoped/types";
import type {
  ExpandedScopedSelector,
  PlacedScopedSelector,
  ScopeInjectMode,
  ScopedSelectorHelpers,
} from "../style/lightningcss/scoped/types";

export interface ScopedSelectorTraceCase {
  title: string;
  selector: string;
  injectMode?: ScopeInjectMode;
}

interface TracedExpandedState {
  deep: boolean;
  nestedRewrite: boolean;
  placement: string;
  selector: string;
}

interface TracedPlacementInput {
  effectiveMode: ScopeInjectMode;
  placement: string;
  selectors: string[];
}

interface TracedPlacedState {
  deep: boolean;
  selector: string;
}

export interface ScopedSelectorTrace {
  source: string;
  injectMode: ScopeInjectMode;
  path: "direct" | "expanded";
  direct?: string[];
  expansion?: TracedExpandedState[];
  placementInputs?: TracedPlacementInput[];
  placement?: TracedPlacedState[];
  cleanup?: string[];
  final: string[];
}

export const scopedSelectorTraceCases: ScopedSelectorTraceCase[] = [
  {
    title: "direct selector rewrite",
    selector: ".card .title:where(:hover) > .leaf",
  },
  {
    title: "deep-only :is branch lowers to a descendant",
    selector: ".a:is(:deep(.foo))",
  },
  {
    title: "local prefix before deep inside :is() stays on the same element",
    selector: ".a:is(.b :deep(.c))",
  },
  {
    title: "mixed same-element and descendant branches split before placement",
    selector: ".a:is(:where(:deep(.b)), .c)",
  },
  {
    title: "outer :deep() keeps nested containers on the unscoped side",
    selector: ".x:deep(.a:is(:deep(.b), .c))",
  },
  {
    title: "slotted selectors keep their slot-scoped inner branch unscoped afterward",
    selector: ":slotted(.a:is(.b))",
  },
];

export function traceScopedSelector(
  source: string,
  injectMode: ScopeInjectMode = "normal",
): ScopedSelectorTrace {
  const context = createScopedStyleTransformContext({
    id: "data-v-trace",
  });
  const selector = parseSingleSelector(source);

  if (canUseDirectScopeRewrite(selector)) {
    return traceDirectPath(source, selector, injectMode, context);
  }

  return traceExpandedPath(source, selector, injectMode, context);
}

export function formatScopedSelectorTrace(trace: ScopedSelectorTrace): string {
  const lines = [
    `source: ${trace.source}`,
    `injectMode: ${trace.injectMode}`,
    `path: ${trace.path}`,
  ];

  if (trace.direct?.length) {
    lines.push("", "direct:");
    for (const selector of trace.direct) {
      lines.push(`  - ${selector}`);
    }
  }

  if (trace.expansion?.length) {
    lines.push("", "expansion:");
    for (const [index, state] of trace.expansion.entries()) {
      lines.push(
        `  ${index + 1}. placement=${state.placement} deep=${state.deep} nestedRewrite=${state.nestedRewrite} ${state.selector}`,
      );
    }
  }

  if (trace.placementInputs?.length) {
    lines.push("", "placement input:");
    for (const [index, state] of trace.placementInputs.entries()) {
      lines.push(
        `  ${index + 1}. placement=${state.placement} effectiveMode=${state.effectiveMode}`,
      );
      for (const selector of state.selectors) {
        lines.push(`     - ${selector}`);
      }
    }
  }

  if (trace.placement?.length) {
    lines.push("", "placement:");
    for (const [index, state] of trace.placement.entries()) {
      lines.push(`  ${index + 1}. deep=${state.deep} ${state.selector}`);
    }
  }

  if (trace.cleanup?.length) {
    lines.push("", "cleanup:");
    for (const selector of trace.cleanup) {
      lines.push(`  - ${selector}`);
    }
  }

  lines.push("", "final:");
  for (const selector of trace.final) {
    lines.push(`  - ${selector}`);
  }

  return lines.join("\n");
}

function traceDirectPath(
  source: string,
  selector: Selector,
  injectMode: ScopeInjectMode,
  context: ReturnType<typeof createScopedStyleTransformContext>,
): ScopedSelectorTrace {
  const direct = [
    stringifySelector(rewriteDirectScopedSelector(structuredClone(selector), context.helpers)),
  ];
  const final = traceFinalOutput(selector, context);
  assertTracePhaseMatchesFinal("direct scoped rewrite", direct, final, source);

  return {
    source,
    injectMode,
    path: "direct",
    direct,
    final,
  };
}

function traceExpandedPath(
  source: string,
  selector: Selector,
  injectMode: ScopeInjectMode,
  context: ReturnType<typeof createScopedStyleTransformContext>,
): ScopedSelectorTrace {
  const expanded = expandScopeCarriers(structuredClone(selector), context.helpers);
  const placementInputs = expanded.map((state) =>
    tracePlacementInput(state, injectMode, context.helpers),
  );
  const placed = expanded.flatMap((state) =>
    placeScopeAttributes(structuredClone(state), injectMode, context.helpers),
  );
  const cleaned = placed.map((state) =>
    cleanupScopedSelectorMarkers(structuredClone(state.selector)),
  );
  const final = traceFinalOutput(selector, context);
  const cleanup = cleaned.map((currentSelector) => stringifySelector(currentSelector));
  assertTracePhaseMatchesFinal("cleanup after expanded placement", cleanup, final, source);

  return {
    source,
    injectMode,
    path: "expanded",
    expansion: expanded.map(traceExpandedState),
    placementInputs,
    placement: placed.map(tracePlacedState),
    cleanup,
    final,
  };
}

function parseSingleSelector(source: string): Selector {
  const selectors = parseSelectorListFromString(source, scopeCarrierParserOptions);
  if (selectors.length !== 1) {
    throw new Error(`Expected a single selector for trace input: ${source}`);
  }
  return selectors[0];
}

function stringifySelectorList(selectors: Selector | Selector[]): string[] {
  return normalizeSelectors(selectors).map((selector) => stringifySelector(selector));
}

function normalizeSelectors(selectors: Selector | Selector[]): Selector[] {
  if (!selectors.length) {
    return [];
  }

  return isSelectorList(selectors) ? selectors : [selectors];
}

function isSelectorList(selectors: Selector | Selector[]): selectors is Selector[] {
  const first = selectors[0];
  return Array.isArray(first);
}

function traceExpandedState(result: ExpandedScopedSelector): TracedExpandedState {
  return {
    deep: result.deep,
    nestedRewrite: placementPlanNeedsNestedRewrite(result.placement),
    placement: result.placement,
    selector: stringifySelector(result.selector),
  };
}

function tracePlacedState(result: PlacedScopedSelector): TracedPlacedState {
  return {
    deep: result.deep,
    selector: stringifySelector(result.selector),
  };
}

function tracePlacementInput(
  result: ExpandedScopedSelector,
  injectMode: ScopeInjectMode,
  helpers: ScopedSelectorHelpers,
): TracedPlacementInput {
  const effectiveMode = result.selector.some(isNoInjectMarker) ? "none" : injectMode;
  const cleanedSelector = removeNoInjectMarkers(structuredClone(result.selector));
  if (effectiveMode !== "none") {
    stripLeadingUniversal(cleanedSelector);
  }

  const selectors = placementPlanNeedsNormalization(result.placement)
    ? normalizeSelectorForPlacement(cleanedSelector, helpers)
    : [cleanedSelector];

  return {
    effectiveMode,
    placement: result.placement,
    selectors: selectors.map((selector) => stringifySelector(selector)),
  };
}

function traceFinalOutput(
  selector: Selector,
  context: ReturnType<typeof createScopedStyleTransformContext>,
): string[] {
  return stringifySelectorList(rewriteScopedSelector(structuredClone(selector), context));
}

function assertTracePhaseMatchesFinal(
  phase: string,
  traced: string[],
  final: string[],
  source: string,
): void {
  if (!selectorListsMatch(traced, final)) {
    throw new Error(
      [
        `Scoped selector trace drifted from the public rewrite result after ${phase}.`,
        `Selector: ${source}`,
        `Traced: ${traced.join(" | ") || "(none)"}`,
        `Final: ${final.join(" | ") || "(none)"}`,
      ].join("\n"),
    );
  }
}

function selectorListsMatch(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((selector, index) => selector === right[index]);
}
