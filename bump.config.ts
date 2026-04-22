import { defineConfig } from "bumpp";

export default defineConfig({
  files: ["packages/utils/package.json", "packages/compiler/package.json"],
  commit: "release: v%s",
  tag: "v%s",
  push: false,
});
