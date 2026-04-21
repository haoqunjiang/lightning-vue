import type { Selector } from "lightningcss";
import { parseSelectorListFromString, stringifySelector } from "@lightning-vue/utils";
import { scopeCarrierParserOptions } from "../src/style/lightningcss/scopeCarriers";
import {
  createScopedStyleTransformContext,
  isNoInjectMarker,
} from "../src/style/lightningcss/scoped/context";
import { rewriteScopedSelector } from "../src/style/lightningcss/scoped/rewrite";
import {
  rewriteDirectScopedSelector,
  stripLeadingUniversal,
} from "../src/style/lightningcss/scoped/selector/direct";
import {
  canUseDirectScopeRewrite,
  expandScopeCarriers,
} from "../src/style/lightningcss/scoped/selector/expansion";
import {
  cleanupScopedSelectorMarkers,
  placeScopeAttributes,
} from "../src/style/lightningcss/scoped/selector/placement";
import { removeNoInjectMarkers } from "../src/style/lightningcss/scoped/selector/placement/cleanup";
import { normalizeSelectorForPlacement } from "../src/style/lightningcss/scoped/selector/placement/structure";
import type {
  ExpandedScopedSelector,
  ScopeInjectMode,
  ScopedSelectorHelpers,
} from "../src/style/lightningcss/scoped/types";

/**
 * This harness traces the scoped-selector pipeline at the *conceptual* phase
 * boundaries we care about while refactoring:
 *
 * 1. direct path, or carrier expansion
 * 2. placement preparation
 * 3. scope placement
 * 4. marker cleanup
 * 5. final public rewrite result
 *
 * The goal is not to snapshot every helper call. It is to expose the state
 * transitions that should remain understandable even if the internal helper
 * layout changes again later.
 *
 * The harness intentionally records both the manual phase replay (`direct` or
 * `cleanup`) and the public `final` output from `rewriteScopedSelector(...)`.
 * Those should stay aligned. If they drift, the harness throws so the refactor
 * has to either update the conceptual trace or explain why the contract changed.
 */
export interface ScopedSelectorTraceCase {
  title: string;
  selector: string;
  injectMode?: ScopeInjectMode;
}

/**
 * Expanded selector state after carrier expansion or scope placement.
 *
 * `placementKind` answers whether the state can go through direct placement or
 * first needs structural preparation such as branch splitting.
 *
 * `needsNestedScopeRewrite` answers whether nested `:is()` / `:where()`
 * containers still need post-placement rewriting once an outer scope anchor has
 * been chosen.
 */
interface TracedExpandedState {
  deep: boolean;
  placementKind: string;
  needsNestedScopeRewrite: boolean;
  selector: string;
}

/**
 * Selector shape immediately before actual scope attributes are inserted.
 *
 * This is the easiest place to understand "what placement is about to act on"
 * without coupling the trace to the exact helper sequence used inside the
 * production code.
 */
interface TracedPlacementInput {
  effectiveMode: ScopeInjectMode;
  placementKind: string;
  selectors: string[];
}

/**
 * Snapshot-friendly view of the scoped-selector pipeline.
 *
 * `direct` and `cleanup` are the conceptual phase replay outputs.
 * `final` is the production result from `rewriteScopedSelector(...)`.
 * Keeping both makes orchestration drift visible after future refactors.
 */
export interface ScopedSelectorTrace {
  source: string;
  injectMode: ScopeInjectMode;
  path: "direct" | "expanded";
  direct?: string[];
  expansion?: TracedExpandedState[];
  placementInputs?: TracedPlacementInput[];
  placement?: TracedExpandedState[];
  cleanup?: string[];
  final: string[];
}

/**
 * These cases are intentionally curated around phase boundaries and tricky
 * scope-context transitions. They are not meant to be an exhaustive syntax
 * matrix; the broader compileStyle tests already cover that.
 */
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

interface ScopedSelectorBenchHarness {
  cloneDirectSelectorCorpus(): void;
  cloneExpandedCarrierStates(): void;
  clonePlacedCarrierStates(): void;
  expandCarrierSelectorCorpus(): void;
  normalizeStructuredSelectorCorpus(): void;
  placeExpandedCarrierStates(): void;
  cleanupPlacedCarrierStates(): void;
  rewriteDirectSelectorCorpus(): void;
  rewriteCarrierSelectorCorpus(): void;
  rewriteStructuredSelectorCorpus(): void;
}

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
    placement: placed.map(traceExpandedState),
    cleanup,
    final,
  };
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
        `  ${index + 1}. placement=${state.placementKind} deep=${state.deep} nestedRewrite=${state.needsNestedScopeRewrite} ${state.selector}`,
      );
    }
  }

  if (trace.placementInputs?.length) {
    lines.push("", "placement input:");
    for (const [index, state] of trace.placementInputs.entries()) {
      lines.push(
        `  ${index + 1}. placement=${state.placementKind} effectiveMode=${state.effectiveMode}`,
      );
      for (const selector of state.selectors) {
        lines.push(`     - ${selector}`);
      }
    }
  }

  if (trace.placement?.length) {
    lines.push("", "placement:");
    for (const [index, state] of trace.placement.entries()) {
      lines.push(
        `  ${index + 1}. placement=${state.placementKind} deep=${state.deep} nestedRewrite=${state.needsNestedScopeRewrite} ${state.selector}`,
      );
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

export function createScopedSelectorBenchHarness(): ScopedSelectorBenchHarness {
  const context = createScopedStyleTransformContext({
    id: "data-v-bench",
  });

  const directSelectors = parseSelectorCorpus(
    Array.from(
      { length: 60 },
      (_, index) => `.card-${index}.title-${index}:where(:hover) > .leaf-${index}`,
    ),
  );
  const carrierSelectors = parseSelectorCorpus(
    Array.from({ length: 40 }, (_, index) => [
      `.root-${index} :deep(.inner-${index} .copy-${index})`,
      `.root-${index} :global(.external-${index} .leaf-${index})`,
      `:is(.root-${index} :deep(.branch-${index}))`,
      `:slotted(.slot-${index} .leaf-${index})`,
    ]).flat(),
  );
  const structuredSelectors = parseSelectorCorpus(
    Array.from({ length: 30 }, (_, index) => [
      `.a-${index}:is(:deep(.b-${index}), .c-${index})`,
      `.shell-${index}:is(:where(:deep(.branch-${index})), .leaf-${index})`,
      `.outer-${index}:where(:deep(.target-${index})).copy-${index}`,
      `.outer-${index}:is(:deep(.target-${index})) > .copy-${index}`,
    ]).flat(),
  );

  const expandedCarrierStates = carrierSelectors.flatMap((selector) =>
    expandScopeCarriers(structuredClone(selector), context.helpers),
  );
  const placedCarrierStates = expandedCarrierStates.flatMap((state) =>
    placeScopeAttributes(structuredClone(state), "normal", context.helpers),
  );

  return {
    cloneDirectSelectorCorpus() {
      structuredClone(directSelectors);
    },
    cloneExpandedCarrierStates() {
      structuredClone(expandedCarrierStates);
    },
    clonePlacedCarrierStates() {
      structuredClone(placedCarrierStates);
    },
    expandCarrierSelectorCorpus() {
      for (const selector of carrierSelectors) {
        expandScopeCarriers(structuredClone(selector), context.helpers);
      }
    },
    normalizeStructuredSelectorCorpus() {
      for (const selector of structuredSelectors) {
        normalizeSelectorForPlacement(structuredClone(selector), context.helpers);
      }
    },
    placeExpandedCarrierStates() {
      for (const state of expandedCarrierStates) {
        placeScopeAttributes(structuredClone(state), "normal", context.helpers);
      }
    },
    cleanupPlacedCarrierStates() {
      for (const state of placedCarrierStates) {
        cleanupScopedSelectorMarkers(structuredClone(state.selector));
      }
    },
    rewriteDirectSelectorCorpus() {
      for (const selector of directSelectors) {
        rewriteScopedSelector(structuredClone(selector), context);
      }
    },
    rewriteCarrierSelectorCorpus() {
      for (const selector of carrierSelectors) {
        rewriteScopedSelector(structuredClone(selector), context);
      }
    },
    rewriteStructuredSelectorCorpus() {
      for (const selector of structuredSelectors) {
        rewriteScopedSelector(structuredClone(selector), context);
      }
    },
  };
}

function parseSingleSelector(source: string): Selector {
  const selectors = parseSelectorListFromString(source, scopeCarrierParserOptions);
  if (selectors.length !== 1) {
    throw new Error(`Expected a single selector for trace input: ${source}`);
  }
  return selectors[0];
}

function parseSelectorCorpus(sources: string[]): Selector[] {
  return sources.map(parseSingleSelector);
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
    needsNestedScopeRewrite: result.needsNestedScopeRewrite,
    placementKind: result.placementKind,
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

  const selectors =
    result.placementKind === "normalized"
      ? normalizeSelectorForPlacement(cleanedSelector, helpers)
      : [cleanedSelector];

  return {
    effectiveMode,
    placementKind: result.placementKind,
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
