import path from "node:path";
import { fileURLToPath } from "node:url";

function normalizeBase(base: string | undefined): string {
  if (!base || base === "/") {
    return "/";
  }
  return `/${base.replace(/^\/+|\/+$/g, "")}/`;
}

export function resolveLightningVueAppBase(base = process.env.LV_APP_BASE): string {
  return normalizeBase(base);
}

export function resolveLightningVueAppOutDir(
  configUrl: string,
  fallbackOutDir = "dist",
  outDir = process.env.LV_APP_OUT_DIR,
): string {
  if (!outDir) {
    return fallbackOutDir;
  }

  if (path.isAbsolute(outDir)) {
    return outDir;
  }

  const configDir = path.dirname(fileURLToPath(configUrl));
  return path.resolve(configDir, outDir);
}

export function resolveLightningVueAppBuild(configUrl: string): {
  base: string;
  build: { emptyOutDir: false; outDir: string };
} {
  return {
    base: resolveLightningVueAppBase(),
    build: {
      emptyOutDir: false,
      outDir: resolveLightningVueAppOutDir(configUrl),
    },
  };
}
