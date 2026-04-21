import { bench, describe } from "vitest";
import { createScopedSelectorBenchHarness } from "./scopedSelectorHarness";

const harness = createScopedSelectorBenchHarness();

describe("scoped selector clone baselines", () => {
  bench("clone direct selector corpus", () => {
    harness.cloneDirectSelectorCorpus();
  });

  bench("clone expanded carrier states", () => {
    harness.cloneExpandedCarrierStates();
  });

  bench("clone placed carrier states", () => {
    harness.clonePlacedCarrierStates();
  });
});

describe("scoped selector phase breakdown", () => {
  bench("expand carriers", () => {
    harness.expandCarrierSelectorCorpus();
  });

  bench("normalize structured selectors", () => {
    harness.normalizeStructuredSelectorCorpus();
  });

  bench("place scope attributes on expanded carriers", () => {
    harness.placeExpandedCarrierStates();
  });

  bench("cleanup placed carrier states", () => {
    harness.cleanupPlacedCarrierStates();
  });
});

describe("scoped selector end-to-end rewrite", () => {
  bench("rewrite direct selectors", () => {
    harness.rewriteDirectSelectorCorpus();
  });

  bench("rewrite carrier selectors", () => {
    harness.rewriteCarrierSelectorCorpus();
  });

  bench("rewrite structured selectors", () => {
    harness.rewriteStructuredSelectorCorpus();
  });
});
