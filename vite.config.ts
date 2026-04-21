import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["packages/compiler/upstream/**"],
  },
  lint: {
    ignorePatterns: ["packages/compiler/upstream/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    cache: true,
  },
});
