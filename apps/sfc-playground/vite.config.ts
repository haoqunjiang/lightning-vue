import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import * as compiler from "@lightning-vue/compiler";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);
const base = normalizeBase(process.env.LV_APP_BASE);
const outDir = resolveOutDir(process.env.LV_APP_OUT_DIR);

const commit = spawnSync("git", ["rev-parse", "--short=7", "HEAD"], {
  cwd: new URL("../..", import.meta.url),
})
  .stdout.toString()
  .trim();

export default defineConfig({
  base,
  build: {
    emptyOutDir: false,
    outDir,
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

function normalizeBase(base: string | undefined): string {
  if (!base || base === "/") {
    return "/";
  }

  return `/${base.replace(/^\/+|\/+$/g, "")}/`;
}

function resolveOutDir(outDir: string | undefined): string {
  if (!outDir) {
    return "dist";
  }

  if (path.isAbsolute(outDir)) {
    return outDir;
  }

  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), outDir);
}

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
