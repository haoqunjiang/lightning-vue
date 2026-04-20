import { defineConfig } from "vite-plus";

export default defineConfig({
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
