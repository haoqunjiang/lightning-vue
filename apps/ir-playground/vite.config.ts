import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolveLightningVueAppBuild } from "../../tools/lightningVueAppBuild.ts";
import { compiler, lightningVueCompilerAliases } from "../../tools/lightningVueCompiler.ts";

export default defineConfig({
  ...resolveLightningVueAppBuild(import.meta.url),
  resolve: {
    alias: lightningVueCompilerAliases,
  },
  plugins: [
    vue({
      compiler,
    }),
  ],
});
