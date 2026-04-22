import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as compiler from "@lightning-vue/compiler";

const base = normalizeBase(process.env.LV_APP_BASE);
const outDir = resolveOutDir(process.env.LV_APP_OUT_DIR);

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
  ],
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
