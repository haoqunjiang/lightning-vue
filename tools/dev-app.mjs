import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageBuilds = [
  {
    cwd: path.join(repoRoot, "packages/utils"),
    buildArgs: ["pack", "src/index.ts", "--format", "esm", "--format", "cjs", "--dts"],
    watchArgs: ["pack", "src/index.ts", "--format", "esm", "--format", "cjs", "--dts", "--watch"],
  },
  {
    cwd: path.join(repoRoot, "packages/compiler"),
    buildArgs: ["pack"],
    watchArgs: ["pack", "--watch"],
  },
];
const appDirs = {
  "divergence-playground": path.join(repoRoot, "apps/divergence-playground"),
  "ir-playground": path.join(repoRoot, "apps/ir-playground"),
  "sfc-playground": path.join(repoRoot, "apps/sfc-playground"),
  "vite-example": path.join(repoRoot, "apps/vite-app"),
};

const app = process.argv[2];

if (!app) {
  console.error("Usage: node tools/dev-app.mjs <app-package-name>");
  process.exit(1);
}

const appDir = appDirs[app];

if (!appDir) {
  console.error(`Unknown app package: ${app}`);
  process.exit(1);
}

for (const pkg of packageBuilds) {
  await run(pkg.cwd, pkg.buildArgs);
}

const children = [
  ...packageBuilds.map((pkg) => spawnVp(pkg.cwd, pkg.watchArgs)),
  spawnVp(appDir, ["dev"]),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
  }, 1_000).unref();

  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      shutdown(1);
      return;
    }

    shutdown(code ?? 0);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function spawnVp(cwd, args) {
  return spawn("vp", args, {
    cwd,
    stdio: "inherit",
  });
}

function run(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawnVp(cwd, args);

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`vp ${args.join(" ")} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`vp ${args.join(" ")} exited with code ${code ?? 1}`));
        return;
      }

      resolve();
    });
  });
}
