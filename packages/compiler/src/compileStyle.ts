import type {
  SFCAsyncStyleCompileOptions,
  SFCStyleCompileOptions,
  SFCStyleCompileResults,
} from "@vue/compiler-sfc";
import type { RawSourceMap } from "@vue/compiler-core";
import { extend } from "@vue/shared";
import { createCompilerRequire } from "./nodeRequire";
import {
  type StylePreprocessor,
  type StylePreprocessorResults,
  processors,
} from "./style/preprocessors";
import {
  type CSSModulesOptions,
  type StyleCompileContext,
  type StyleCompileState,
  createStyleCompileContext,
  createStyleCompileSession,
  createStyleCompileState,
  finalizeStyleCompileFailure,
  finalizeStyleCompileSuccess,
  prepareStyleCompileSessionForTransform,
  transformPreparedStyleCompileSession,
} from "./styleCompile";

export type {
  SFCAsyncStyleCompileOptions,
  SFCStyleCompileOptions,
  SFCStyleCompileResults,
} from "@vue/compiler-sfc";

/**
 * Compiler-SFC-compatible style compiler backed by the Lightning CSS style
 * pipeline.
 *
 * Unsupported option shapes fail fast instead of silently falling back to the
 * PostCSS implementation.
 */
export function compileStyle(options: SFCStyleCompileOptions): SFCStyleCompileResults {
  assertSupportedLightningCssStyleOptions(options, false);
  return compileStyleWithLightningCssImpl(options);
}

/**
 * Async facade for tooling such as `@vitejs/plugin-vue`, which expects a
 * compiler module exposing `compileStyleAsync`.
 *
 * The Lightning CSS style pipeline is synchronous today, so the async entry
 * simply resolves the sync result. CSS modules stay async-only to match the
 * public `@vue/compiler-sfc` contract even though the underlying Lightning CSS
 * transform is synchronous. Unsupported option shapes reject immediately.
 */
export async function compileStyleAsync(
  options: SFCAsyncStyleCompileOptions,
): Promise<SFCStyleCompileResults> {
  assertSupportedLightningCssStyleOptions(options, true);
  return compileStyleWithLightningCssImpl(options);
}

export function compileStyleWithLightningCss(
  options: SFCStyleCompileOptions,
): SFCStyleCompileResults {
  assertSupportedLightningCssStyleOptions(options, false);
  return compileStyleWithLightningCssImpl(options);
}

function compileStyleWithLightningCssImpl(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
): SFCStyleCompileResults {
  if (__GLOBAL__ || __ESM_BROWSER__) {
    throw new Error(
      "[@lightning-vue/compiler] `compileStyle` is not supported in the browser build.",
    );
  }

  const context = createStyleCompileContext(options);
  const state = createInitialStyleCompileState(options, context);
  const session = createStyleCompileSession(context, state);
  if (!prepareStyleCompileSessionForTransform(session)) {
    return finalizeStyleCompileFailure(session);
  }

  try {
    const lightningcss = loadLightningCss(context.filename);
    const result = transformPreparedStyleCompileSession(lightningcss, session);
    return finalizeStyleCompileSuccess(result, session);
  } catch (e: any) {
    state.errors.push(e);
    return finalizeStyleCompileFailure(session);
  }
}

function createInitialStyleCompileState(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
  context: StyleCompileContext,
): StyleCompileState {
  const initialInputMap = options.inMap || options.map;
  const preprocessor = options.preprocessLang && processors[options.preprocessLang];
  const preProcessedSource = preprocessor && preprocess(options, preprocessor, context.sourceMap);
  const source = preProcessedSource ? preProcessedSource.code : options.source;

  const dependencies = new Set(preProcessedSource ? preProcessedSource.dependencies : []);
  dependencies.delete(context.filename);

  return createStyleCompileState(
    source,
    (preProcessedSource ? preProcessedSource.map : initialInputMap) as RawSourceMap | undefined,
    context,
    {
      dependencies,
      errors: preProcessedSource ? [...preProcessedSource.errors] : [],
    },
  );
}

function assertSupportedLightningCssStyleOptions(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
  isAsync: boolean,
): void {
  if (options.trim === false) {
    throw createUnsupportedStyleOptionError("`trim: false`");
  }

  if (options.postcssPlugins && options.postcssPlugins.length) {
    throw createUnsupportedStyleOptionError("`postcssPlugins`");
  }

  if (hasUnsupportedLightningCssPostcssOptions(options.postcssOptions)) {
    throw createUnsupportedStyleOptionError("`postcssOptions` keys other than `map`");
  }

  if ("modules" in options && options.modules) {
    if (!isAsync) {
      // This is a public API compatibility choice rather than an engine
      // limitation. Lightning CSS CSS-modules compilation is synchronous, but
      // `@vue/compiler-sfc` only exposes `modules` on `compileStyleAsync()`.
      throw createUnsupportedStyleOptionError("`modules` without `compileStyleAsync()`");
    }

    if (options.scoped) {
      throw createUnsupportedStyleOptionError("`modules` combined with `scoped`");
    }

    assertSupportedLightningCssModulesOptions(options.modulesOptions || {});
  }
}

function createUnsupportedStyleOptionError(option: string): Error {
  return new Error(
    `[@lightning-vue/compiler] ${option} is not supported by this package. ` +
      `Use @vue/compiler-sfc when you need the PostCSS-based style pipeline.`,
  );
}

function hasUnsupportedLightningCssPostcssOptions(postcssOptions: any): boolean {
  return !!(postcssOptions && Object.keys(postcssOptions).some((key) => key !== "map"));
}

function assertSupportedLightningCssModulesOptions(options: CSSModulesOptions): void {
  if (options.scopeBehaviour !== undefined && options.scopeBehaviour !== "local") {
    throw createUnsupportedStyleOptionError('`modulesOptions.scopeBehaviour` other than `"local"`');
  }

  if (options.generateScopedName !== undefined && typeof options.generateScopedName !== "string") {
    throw createUnsupportedStyleOptionError("`modulesOptions.generateScopedName` as a function");
  }

  if (
    typeof options.generateScopedName === "string" &&
    hasUnsupportedLightningCssModulePattern(options.generateScopedName)
  ) {
    throw createUnsupportedStyleOptionError(
      "`modulesOptions.generateScopedName` placeholders other than `[name]`, `[local]`, and `[hash]`",
    );
  }

  if (options.hashPrefix !== undefined) {
    throw createUnsupportedStyleOptionError("`modulesOptions.hashPrefix`");
  }

  if (options.exportGlobals) {
    throw createUnsupportedStyleOptionError("`modulesOptions.exportGlobals`");
  }

  if (options.globalModulePaths && options.globalModulePaths.length) {
    throw createUnsupportedStyleOptionError("`modulesOptions.globalModulePaths`");
  }
}

function hasUnsupportedLightningCssModulePattern(pattern: string): boolean {
  const placeholders = pattern.match(/\[[^\]]+\]/g);
  return !!(
    placeholders &&
    placeholders.some(
      (placeholder) =>
        placeholder !== "[name]" && placeholder !== "[local]" && placeholder !== "[hash]",
    )
  );
}

function preprocess(
  options: SFCStyleCompileOptions,
  preprocessor: StylePreprocessor,
  sourceMap: boolean,
): StylePreprocessorResults {
  if ((__ESM_BROWSER__ || __GLOBAL__) && !options.preprocessCustomRequire) {
    throw new Error(
      `[@lightning-vue/compiler] Style preprocessing in the browser build must ` +
        `provide the \`preprocessCustomRequire\` option to return the in-browser ` +
        `version of the preprocessor.`,
    );
  }

  return preprocessor(
    options.source,
    options.inMap || options.map,
    extend(
      {
        enableSourcemap: sourceMap,
        filename: options.filename,
      },
      options.preprocessOptions || null,
    ),
    options.preprocessCustomRequire,
  );
}

let _lightningcss:
  | {
      Features: { Nesting: number };
      transform: (options: any) => any;
    }
  | undefined;

function loadLightningCss(filename: string) {
  if (_lightningcss) {
    return _lightningcss;
  }

  try {
    return (_lightningcss = createCompilerRequire(filename)("lightningcss"));
  } catch (err: any) {
    const message = err && typeof err.message === "string" ? err.message : "";
    if (message && message.includes("Cannot find module")) {
      throw new Error(
        "[@lightning-vue/compiler] `compileStyle` requires the optional peer dependency `lightningcss` to be installed. Install it in the consuming project, for example with `pnpm add -D lightningcss`.",
      );
    }
    throw err;
  }
}
