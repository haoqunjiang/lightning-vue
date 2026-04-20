import { compileStyle as compileStyleWithPostcss } from "@vue/compiler-sfc";
import { createBrowserCompiler } from "@lightning-vue/compiler/browser";
import initLightningCss, * as lightningcss from "lightningcss-wasm";

export interface CompilePane {
  code: string;
  hasError: boolean;
}

export interface CompileComparison {
  source: CompilePane;
  postcss: CompilePane;
  lightning: CompilePane;
  different: boolean;
}

const SCOPED_ID = "data-v-compare";

let lightningReady: Promise<typeof lightningcss> | undefined;
let browserCompiler: ReturnType<typeof createBrowserCompiler> | undefined;

function normalizeCssOutput(code: string) {
  return code
    .replace(/\[([^\]=]+)="\1"\]/g, "[$1]")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeCssForComparison(code: string) {
  return normalizeCssOutput(code)
    .replace(/\s*,\s*/g, ", ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

function createPane(code: string, hasError = false): CompilePane {
  return {
    code: hasError ? code : normalizeCssOutput(code),
    hasError,
  };
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

export async function compareScopedStyle(source: string): Promise<CompileComparison> {
  const postcssResult = compileStyleWithPostcss({
    source,
    filename: "snippet.css",
    id: SCOPED_ID,
    scoped: true,
  });

  const lightningCompiler = await getBrowserCompiler();
  const lightningResult = await lightningCompiler.compileStyleAsync({
    source,
    filename: "snippet.css",
    id: SCOPED_ID,
    scoped: true,
  });

  const postcssPane = postcssResult.errors.length
    ? createPane(formatErrors(postcssResult.errors), true)
    : createPane(postcssResult.code);
  const lightningPane = lightningResult.errors.length
    ? createPane(formatErrors(lightningResult.errors), true)
    : createPane(lightningResult.code);

  const different =
    postcssPane.hasError !== lightningPane.hasError ||
    (postcssPane.hasError
      ? postcssPane.code !== lightningPane.code
      : canonicalizeCssForComparison(postcssPane.code) !==
        canonicalizeCssForComparison(lightningPane.code));

  return {
    source: createPane(source),
    postcss: postcssPane,
    lightning: lightningPane,
    different,
  };
}
