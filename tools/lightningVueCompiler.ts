import path from "node:path";
import { fileURLToPath } from "node:url";
import * as compiler from "../packages/compiler/src/index.ts";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));

function repoPath(relativePath: string): string {
  return path.resolve(toolsDir, "..", relativePath);
}

export { compiler };

export const lightningVueCompilerAliases = [
  {
    find: "@lightning-vue/compiler/browser",
    replacement: repoPath("packages/compiler/src/browser.ts"),
  },
  {
    find: "@lightning-vue/compiler/debug/nesting",
    replacement: repoPath("packages/compiler/src/debug/nesting.ts"),
  },
  {
    find: "@lightning-vue/compiler/debug/scopedSelector",
    replacement: repoPath("packages/compiler/src/debug/scopedSelector.ts"),
  },
  {
    find: "@lightning-vue/compiler/debug/compileSession",
    replacement: repoPath("packages/compiler/src/debug/compileSession.ts"),
  },
  {
    find: "@lightning-vue/compiler/debug",
    replacement: repoPath("packages/compiler/src/debug.ts"),
  },
  {
    find: "@lightning-vue/compiler",
    replacement: repoPath("packages/compiler/src/index.ts"),
  },
];
