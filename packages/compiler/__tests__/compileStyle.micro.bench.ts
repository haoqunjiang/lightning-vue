import { bench, describe } from "vitest";
import { Features } from "lightningcss";
import { createLightningCssStyleVisitor } from "../src";
import { analyzeLightningCssStyle } from "../src/style/lightningcss/analysis";
import { normalizeNestedStyleBlocks } from "../src/style/lightningcss/nesting/normalize";
import { scopeLightningCssSource } from "../src/style/lightningcss/scoped/source";
import {
  loweredNormalizedNestedSource,
  mixedRealisticScopedSource,
  nestedCarrierScopedSource,
  nestedScopedSource,
  normalizedNestedSource,
  simpleScopedSource,
  transformWithLightningCss,
  vueScopedFunctionSource,
  warmupCompileBenchSuite,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

describe("lightningcss micro: transform breakdown", () => {
  bench("transform only simple selectors", () => {
    transformWithLightningCss(simpleScopedSource);
  });

  bench("transform + no-op visitor simple selectors", () => {
    transformWithLightningCss(simpleScopedSource, { visitor: {} });
  });

  bench("transform + scoped visitor simple selectors", () => {
    transformWithLightningCss(simpleScopedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(simpleScopedSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: source preparation", () => {
  bench("analyze style simple selectors", () => {
    analyzeLightningCssStyle(simpleScopedSource, "data-v-bench");
  });

  bench("scope source simple selectors", () => {
    scopeLightningCssSource(simpleScopedSource, "data-v-bench", false);
  });

  bench("analyze style vue selector functions", () => {
    analyzeLightningCssStyle(vueScopedFunctionSource, "data-v-bench");
  });

  bench("scope source vue selector functions", () => {
    scopeLightningCssSource(vueScopedFunctionSource, "data-v-bench", true);
  });
});

describe("lightningcss micro: transform breakdown with Vue selector functions", () => {
  bench("transform only vue selector functions", () => {
    transformWithLightningCss(vueScopedFunctionSource);
  });

  bench("transform + no-op visitor vue selector functions", () => {
    transformWithLightningCss(vueScopedFunctionSource, { visitor: {} });
  });

  bench("transform + scoped visitor vue selector functions", () => {
    transformWithLightningCss(vueScopedFunctionSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(vueScopedFunctionSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});

describe("lightningcss micro: transform breakdown with nested Vue carriers", () => {
  bench("transform only nested carrier selectors", () => {
    transformWithLightningCss(nestedCarrierScopedSource);
  });

  bench("transform + include nesting nested carrier selectors", () => {
    transformWithLightningCss(nestedCarrierScopedSource, {
      include: Features.Nesting,
    });
  });

  bench("transform + scoped visitor nested carrier selectors", () => {
    transformWithLightningCss(nestedCarrierScopedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(nestedCarrierScopedSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
      include: Features.Nesting,
    });
  });
});

describe("lightningcss micro: mixed realistic source path", () => {
  bench("analyze style mixed realistic styles", () => {
    analyzeLightningCssStyle(mixedRealisticScopedSource, "data-v-bench");
  });

  bench("normalize nested style blocks mixed realistic styles", () => {
    normalizeNestedStyleBlocks(mixedRealisticScopedSource, "bench.css");
  });

  bench("scope source mixed realistic styles", () => {
    scopeLightningCssSource(mixedRealisticScopedSource, "data-v-bench", true);
  });
});

describe("lightningcss micro: nesting normalization", () => {
  bench("transform only nested selectors", () => {
    transformWithLightningCss(nestedScopedSource);
  });

  bench("transform + no-op visitor nested selectors", () => {
    transformWithLightningCss(nestedScopedSource, { visitor: {} });
  });

  bench("transform + include nesting nested selectors", () => {
    transformWithLightningCss(nestedScopedSource, {
      include: Features.Nesting,
    });
  });

  bench("normalize nested style blocks", () => {
    normalizeNestedStyleBlocks(nestedScopedSource, "bench.css");
  });

  bench("scope source normalized nested selectors", () => {
    scopeLightningCssSource(normalizedNestedSource, "data-v-bench", true);
  });

  bench("transform + include nesting normalized nested selectors", () => {
    transformWithLightningCss(normalizedNestedSource, {
      include: Features.Nesting,
    });
  });

  bench("transform + scoped visitor normalized nested selectors", () => {
    transformWithLightningCss(normalizedNestedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(normalizedNestedSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
      include: Features.Nesting,
    });
  });

  bench("scope source lowered normalized nested selectors", () => {
    scopeLightningCssSource(loweredNormalizedNestedSource, "data-v-bench", true);
  });

  bench("transform + scoped visitor lowered normalized nested selectors", () => {
    transformWithLightningCss(loweredNormalizedNestedSource, {
      visitor: createLightningCssStyleVisitor({
        analysis: analyzeLightningCssStyle(loweredNormalizedNestedSource, "data-v-bench"),
        id: "data-v-bench",
        scoped: true,
      }),
    });
  });
});
