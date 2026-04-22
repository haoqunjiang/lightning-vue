import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageBuilds = [
  {
    cwd: path.join(repoRoot, "packages/utils"),
    buildArgs: ["pack", "src/index.ts", "--format", "esm", "--format", "cjs", "--dts"],
  },
  {
    cwd: path.join(repoRoot, "packages/compiler"),
    buildArgs: ["pack"],
  },
];

for (const pkg of packageBuilds) {
  await run(pkg.cwd, pkg.buildArgs);
}

function run(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("vp", args, {
      cwd,
      stdio: "inherit",
    });

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
