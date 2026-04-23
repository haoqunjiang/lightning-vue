import { bench, describe } from "vitest";
import {
  compileStyleWithLightningCss,
  compileWith,
  compileWithLightningCssUsingNormalizedNestedScoping,
  mixedRealisticScopedSource,
  nestedCarrierScopedSource,
  nestedScopedSource,
  simpleScopedSource,
  vueScopedFunctionSource,
  warmupCompileBenchSuite,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

describe("compileStyle internal: lightningcss end to end", () => {
  bench("lightningcss simple selectors", () => {
    compileWith(compileStyleWithLightningCss, simpleScopedSource);
  });

  bench("lightningcss vue selector functions", () => {
    compileWith(compileStyleWithLightningCss, vueScopedFunctionSource);
  });

  bench("lightningcss nested selectors", () => {
    compileWith(compileStyleWithLightningCss, nestedScopedSource);
  });

  bench("lightningcss nested carrier selectors", () => {
    compileWith(compileStyleWithLightningCss, nestedCarrierScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    compileWith(compileStyleWithLightningCss, mixedRealisticScopedSource);
  });
});

describe("compileStyle internal: normalized source path", () => {
  bench("lightningcss nested carrier selectors (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(nestedCarrierScopedSource);
  });

  bench("lightningcss mixed realistic styles (normalized source path)", () => {
    compileWithLightningCssUsingNormalizedNestedScoping(mixedRealisticScopedSource);
  });
});
