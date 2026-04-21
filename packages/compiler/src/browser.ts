import * as compilerSfc from "@vue/compiler-sfc";
import type {
  SFCAsyncStyleCompileOptions,
  SFCStyleCompileOptions,
  SFCStyleCompileResults,
} from "@vue/compiler-sfc";
import type { RawSourceMap } from "@vue/compiler-core";
import {
  type LightningCssRuntime,
  createStyleCompileContext,
  createStyleCompileSession,
  createStyleCompileState,
  finalizeStyleCompileFailure,
  finalizeStyleCompileSuccess,
  prepareStyleCompileSessionForTransform,
  transformPreparedStyleCompileSession,
} from "./styleCompile";

export type BrowserLightningCssLoader = () => LightningCssRuntime | Promise<LightningCssRuntime>;

export function createBrowserCompiler(
  loadLightningCss: BrowserLightningCssLoader,
): typeof compilerSfc {
  return {
    ...compilerSfc,
    async compileStyleAsync(options: SFCAsyncStyleCompileOptions): Promise<SFCStyleCompileResults> {
      return compileStyleWithLightningCssInBrowser(options, loadLightningCss);
    },
  };
}

async function compileStyleWithLightningCssInBrowser(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
  loadLightningCss: BrowserLightningCssLoader,
): Promise<SFCStyleCompileResults> {
  try {
    assertBrowserStyleOptions(options);
  } catch (error) {
    return createBrowserStyleCompileFailureResult(options, error as Error);
  }

  const context = createStyleCompileContext(options, {
    modules: false,
    modulesOptions: {},
  });
  const state = createStyleCompileState(
    options.source,
    (options.inMap || options.map) as RawSourceMap | undefined,
    context,
  );
  const session = createStyleCompileSession(context, state);
  if (!prepareStyleCompileSessionForTransform(session)) {
    return finalizeStyleCompileFailure(session);
  }

  try {
    const lightningcss = await loadLightningCss();
    return finalizeStyleCompileSuccess(
      transformPreparedStyleCompileSession(lightningcss, session),
      session,
    );
  } catch (error) {
    state.errors.push(error as Error);
    return finalizeStyleCompileFailure(session);
  }
}

function assertBrowserStyleOptions(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
): void {
  if (options.preprocessLang) {
    throw new Error(
      "[@lightning-vue/compiler] Browser style compilation does not support preprocessors.",
    );
  }

  if (options.trim === false) {
    throw new Error("[@lightning-vue/compiler] `trim: false` is not supported.");
  }

  if (options.postcssPlugins && options.postcssPlugins.length) {
    throw new Error("[@lightning-vue/compiler] `postcssPlugins` is not supported.");
  }

  if (options.postcssOptions && Object.keys(options.postcssOptions).some((key) => key !== "map")) {
    throw new Error(
      "[@lightning-vue/compiler] `postcssOptions` keys other than `map` are not supported.",
    );
  }

  if ("modules" in options && options.modules) {
    throw new Error("[@lightning-vue/compiler] CSS modules are not supported in the browser.");
  }
}

function createBrowserStyleCompileFailureResult(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
  error: Error,
): SFCStyleCompileResults {
  return {
    code: "",
    map: undefined,
    rawResult: undefined,
    errors: [error],
    dependencies: new Set(options.filename ? [options.filename] : []),
  };
}
