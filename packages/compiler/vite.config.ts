import path from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig(() => {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  return {
    define: {
      __ESM_BROWSER__: "false",
      __GLOBAL__: "false",
      __TEST__: JSON.stringify(isTest),
    },
    resolve: {
      alias: {
        "@lightning-vue/utils": path.resolve(__dirname, "../utils/src/index.ts"),
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
  };
});
