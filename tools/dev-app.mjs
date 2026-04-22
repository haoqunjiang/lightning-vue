import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageBuilds = [
  {
    cwd: path.join(repoRoot, "packages/utils"),
    watchArgs: ["pack", "src/index.ts", "--format", "esm", "--format", "cjs", "--dts", "--watch"],
    readyFiles: ["dist/index.mjs", "dist/index.cjs"],
  },
  {
    cwd: path.join(repoRoot, "packages/compiler"),
    watchArgs: ["pack", "--watch"],
    readyFiles: [
      "dist/index.mjs",
      "dist/browser.mjs",
      "dist/debug.mjs",
      "dist/debug/nesting.mjs",
      "dist/debug/scopedSelector.mjs",
      "dist/debug/compileSession.mjs",
    ],
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

const watchedBuilds = packageBuilds.map((pkg) => {
  const watchedBuild = spawnWatchedBuild(pkg.cwd, pkg.watchArgs);

  return {
    child: watchedBuild.child,
    ready: waitForBuildArtifacts(
      watchedBuild.child,
      pkg.cwd,
      pkg.readyFiles,
      watchedBuild.startedAt,
    ),
  };
});

try {
  await Promise.all(watchedBuilds.map((watchedBuild) => watchedBuild.ready));
} catch (error) {
  for (const watchedBuild of watchedBuilds) {
    if (!watchedBuild.child.killed) {
      watchedBuild.child.kill("SIGTERM");
    }
  }
  throw error;
}

const children = [
  ...watchedBuilds.map((watchedBuild) => watchedBuild.child),
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

function spawnWatchedBuild(cwd, args) {
  const startedAt = Date.now();
  const child = spawn("vp", args, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
  });
  pipeOutput(child.stdout, process.stdout);
  pipeOutput(child.stderr, process.stderr);
  return {
    child,
    startedAt,
  };
}

function waitForBuildArtifacts(child, cwd, files, startedAt) {
  const ready = new Promise((resolve, reject) => {
    let settledTimer = null;
    let pollTimer = null;
    let resolved = false;
    let lastSignature = "";

    const finish = (callback) => {
      if (settledTimer) {
        clearTimeout(settledTimer);
      }
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      callback();
    };

    const poll = () => {
      if (resolved) {
        return;
      }

      const stats = files.map((file) => {
        const fullPath = path.join(cwd, file);

        if (!fs.existsSync(fullPath)) {
          return null;
        }

        const stat = fs.statSync(fullPath);

        if (stat.mtimeMs < startedAt) {
          return null;
        }

        return `${file}:${stat.size}:${stat.mtimeMs}`;
      });

      if (stats.some((stat) => stat === null)) {
        lastSignature = "";
        pollTimer = setTimeout(poll, 100);
        return;
      }

      const signature = stats.join("|");

      if (signature !== lastSignature) {
        lastSignature = signature;

        if (settledTimer) {
          clearTimeout(settledTimer);
        }

        settledTimer = setTimeout(() => {
          resolved = true;
          finish(resolve);
        }, 250);
      }

      pollTimer = setTimeout(poll, 100);
    };

    child.on("exit", (code, signal) => {
      if (resolved) {
        return;
      }

      if (signal) {
        finish(() => reject(new Error(`vp pack --watch exited with signal ${signal}`)));
        return;
      }

      if (code !== 0) {
        finish(() => reject(new Error(`vp pack --watch exited with code ${code ?? 1}`)));
        return;
      }
    });

    poll();
  });

  return ready;
}

function pipeOutput(stream, target) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    target.write(chunk);
  });
}
