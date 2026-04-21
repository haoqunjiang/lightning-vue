import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { compiler, lightningVueCompilerAliases } from "../../tools/lightningVueCompiler.ts";

export default defineConfig({
  resolve: {
    alias: lightningVueCompilerAliases,
  },
  plugins: [
    vue({
      compiler,
    }),
  ],
});
