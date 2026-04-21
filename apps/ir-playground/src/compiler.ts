import { createBrowserCompiler } from "@lightning-vue/compiler/browser";
import initLightningCss, * as lightningcss from "lightningcss-wasm";

const SCOPED_ID = "data-v-ir";

let lightningReady: Promise<typeof lightningcss> | undefined;
let browserCompiler: ReturnType<typeof createBrowserCompiler> | undefined;

function normalizeCssOutput(code: string) {
  return code
    .replace(/\[([^\]=]+)="\1"\]/g, "[$1]")
    .replace(/\s+/g, " ")
    .trim();
}

function formatErrors(errors: unknown[]) {
  return errors
    .map((error) => String(error instanceof Error ? error.message : error))
    .join("\n")
    .trim();
}

async function loadLightningCss() {
  lightningReady ??= initLightningCss().then(() => lightningcss);
  return lightningReady;
}

async function getBrowserCompiler() {
  browserCompiler ??= createBrowserCompiler(loadLightningCss);
  await loadLightningCss();
  return browserCompiler;
}

export async function compileScopedStyle(
  source: string,
): Promise<{ code: string; hasError: boolean }> {
  const compiler = await getBrowserCompiler();
  const result = await compiler.compileStyleAsync({
    source,
    filename: "snippet.css",
    id: SCOPED_ID,
    scoped: true,
  });

  if (result.errors.length > 0) {
    return {
      code: formatErrors(result.errors),
      hasError: true,
    };
  }

  return {
    code: normalizeCssOutput(result.code),
    hasError: false,
  };
}
