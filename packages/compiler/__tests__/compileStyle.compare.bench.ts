import { bench, describe } from "vitest";
import {
  compileStyle,
  compileStyleWithLightningCss,
  compileWith,
  mixedRealisticScopedSource,
  nestedCarrierScopedSource,
  nestedScopedSource,
  simpleScopedSource,
  vueScopedFunctionSource,
  warmupCompileBenchSuite,
} from "./compileStyleBenchShared";

warmupCompileBenchSuite();

describe("compileStyle comparison: simple selectors", () => {
  bench("postcss simple selectors", () => {
    compileWith(compileStyle, simpleScopedSource);
  });

  bench("lightningcss simple selectors", () => {
    compileWith(compileStyleWithLightningCss, simpleScopedSource);
  });
});

describe("compileStyle comparison: Vue selector functions", () => {
  bench("postcss vue selector functions", () => {
    compileWith(compileStyle, vueScopedFunctionSource);
  });

  bench("lightningcss vue selector functions", () => {
    compileWith(compileStyleWithLightningCss, vueScopedFunctionSource);
  });
});

describe("compileStyle comparison: nested rules", () => {
  bench("postcss nested selectors", () => {
    compileWith(compileStyle, nestedScopedSource);
  });

  bench("lightningcss nested selectors", () => {
    compileWith(compileStyleWithLightningCss, nestedScopedSource);
  });
});

describe("compileStyle comparison: nested Vue carriers", () => {
  bench("postcss nested carrier selectors", () => {
    compileWith(compileStyle, nestedCarrierScopedSource);
  });

  bench("lightningcss nested carrier selectors", () => {
    compileWith(compileStyleWithLightningCss, nestedCarrierScopedSource);
  });
});

describe("compileStyle comparison: mixed realistic styles", () => {
  bench("postcss mixed realistic styles", () => {
    compileWith(compileStyle, mixedRealisticScopedSource);
  });

  bench("lightningcss mixed realistic styles", () => {
    compileWith(compileStyleWithLightningCss, mixedRealisticScopedSource);
  });
});
