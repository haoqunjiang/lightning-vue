import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const compilerDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  define: {
    __ESM_BROWSER__: "false",
    __GLOBAL__: "false",
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/browser.ts",
      "src/debug.ts",
      "src/debug/nesting.ts",
      "src/debug/scopedSelector.ts",
      "src/debug/styleCompile.ts",
    ],
    format: ["esm", "cjs"],
    dts: true,
    define: {
      __ESM_BROWSER__: "false",
      __GLOBAL__: "false",
    },
  },
  resolve: {
    alias: {
      "@lightning-vue/utils": path.resolve(compilerDir, "../utils/src/index.ts"),
    },
  },
  test: {
    globals: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
