import { expect, test } from "vitest";
import {
  formatScopedSelectorTrace,
  scopedSelectorTraceCases,
  traceScopedSelector,
} from "./scopedSelectorHarness";

/**
 * These snapshots document the conceptual scoped-selector phases for a small
 * curated case set. They are intentionally narrower than the full compiler
 * tests: the goal here is to keep the pipeline explainable during refactors.
 */
test.each(scopedSelectorTraceCases)("$title", ({ selector, injectMode }) => {
  expect(formatScopedSelectorTrace(traceScopedSelector(selector, injectMode))).toMatchSnapshot();
});
