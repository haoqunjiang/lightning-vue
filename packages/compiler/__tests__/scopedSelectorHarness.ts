import type { Selector } from "lightningcss";
import { parseSelectorListFromString } from "@lightning-vue/utils";
import { scopeCarrierParserOptions } from "../src/style/lightningcss/scopeCarriers";
import { createScopedStyleTransformContext } from "../src/style/lightningcss/scoped/context";
import { rewriteScopedSelector } from "../src/style/lightningcss/scoped/rewrite";
import { expandScopeCarriers } from "../src/style/lightningcss/scoped/selector/expansion";
import {
  cleanupScopedSelectorMarkers,
  placeScopeAttributes,
} from "../src/style/lightningcss/scoped/selector/placement";
import { normalizeSelectorForPlacement } from "../src/style/lightningcss/scoped/selector/placement/structure";
export type { ScopedSelectorTrace, ScopedSelectorTraceCase } from "../src/debug/scopedSelector";
export {
  formatScopedSelectorTrace,
  scopedSelectorTraceCases,
  traceScopedSelector,
} from "../src/debug/scopedSelector";

export interface ScopedSelectorBenchHarness {
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
      `.card-${index} :is(.header-${index} :deep(.icon-${index}))`,
      `.card-${index} :is(:deep(.title-${index}), .copy-${index})`,
      `.shell-${index} :is(:where(:deep(.branch-${index})), .leaf-${index})`,
      `.outer-${index} :where(:deep(.target-${index})) > .copy-${index}`,
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
