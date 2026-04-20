import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as compiler from "@lightning-vue/compiler";

export default defineConfig({
  plugins: [vue({ compiler })],
});
