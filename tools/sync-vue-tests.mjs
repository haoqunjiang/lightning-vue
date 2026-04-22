#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const upstreamRootArg = process.argv[2];

if (!upstreamRootArg) {
  console.error("Usage: node tools/sync-vue-tests.mjs /path/to/vue-core-checkout");
  process.exit(1);
}

const upstreamRoot = path.resolve(process.cwd(), upstreamRootArg);
const upstreamSpecPath = path.join(
  upstreamRoot,
  "packages/compiler-sfc/__tests__/compileStyle.spec.ts",
);
const upstreamFixtureDir = path.join(upstreamRoot, "packages/compiler-sfc/__tests__/fixture");

assertExists(upstreamSpecPath);
assertExists(upstreamFixtureDir);

const upstreamSnapshotRoot = path.join(
  repoRoot,
  "packages/compiler/upstream/compiler-sfc/__tests__",
);
const generatedTestsRoot = path.join(repoRoot, "packages/compiler/__tests__");

fs.mkdirSync(upstreamSnapshotRoot, { recursive: true });
fs.mkdirSync(generatedTestsRoot, { recursive: true });

const upstreamSpecSnapshotPath = path.join(upstreamSnapshotRoot, "compileStyle.spec.ts");
const legacyUpstreamSharedSnapshotPath = path.join(upstreamSnapshotRoot, "compileStyle.shared.ts");
const upstreamFixtureSnapshotDir = path.join(upstreamSnapshotRoot, "fixture");
const generatedFixtureDir = path.join(generatedTestsRoot, "fixture");

fs.rmSync(legacyUpstreamSharedSnapshotPath, { force: true });
fs.copyFileSync(upstreamSpecPath, upstreamSpecSnapshotPath);
copyDir(upstreamFixtureDir, upstreamFixtureSnapshotDir);
copyDir(upstreamFixtureDir, generatedFixtureDir);
const upstreamSha = readGitHead(upstreamRoot);
console.log(
  `Synced compiler-sfc compileStyle.spec.ts${upstreamSha ? ` @ ${upstreamSha}` : ""} ` +
    `from ${upstreamRoot} into packages/compiler/upstream/compiler-sfc.`,
);

function assertExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing required upstream path: ${targetPath}`);
  }
}

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function readGitHead(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}
