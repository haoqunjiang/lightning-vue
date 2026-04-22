import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import vue from "@vitejs/plugin-vue";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { resolveLightningVueAppBuild } from "../../tools/lightningVueAppBuild.ts";
import { compiler, lightningVueCompilerAliases } from "../../tools/lightningVueCompiler.ts";

const require = createRequire(import.meta.url);

const commit = spawnSync("git", ["rev-parse", "--short=7", "HEAD"], {
  cwd: new URL("../..", import.meta.url),
})
  .stdout.toString()
  .trim();

export default defineConfig({
  ...resolveLightningVueAppBuild(import.meta.url),
  resolve: {
    alias: lightningVueCompilerAliases,
  },
  plugins: [
    vue({
      compiler,
    }),
    copyVueRuntimePlugin(),
  ],
  optimizeDeps: {
    exclude: ["@vue/repl"],
  },
  define: {
    __COMMIT__: JSON.stringify(commit),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(true),
  },
});

function copyVueRuntimePlugin(): Plugin {
  return {
    name: "copy-vue-runtime",
    generateBundle() {
      const copyFile = (source: string, fileName = path.basename(source)) => {
        const filePath = require.resolve(source);
        this.emitFile({
          type: "asset",
          fileName,
          source: fs.readFileSync(filePath, "utf-8"),
        });
      };

      copyFile("vue/dist/vue.esm-browser.js");
      copyFile("vue/dist/vue.esm-browser.prod.js");
      copyFile("vue/dist/vue.runtime.esm-browser.js");
      copyFile("vue/dist/vue.runtime.esm-browser.prod.js");
      copyFile("@vue/server-renderer/dist/server-renderer.esm-browser.js");
    },
  };
}
