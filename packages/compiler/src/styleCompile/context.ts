import type { RawSourceMap } from "@vue/compiler-core";
import { analyzeLightningCssStyle } from "../style/lightningcss/analysis";
import type {
  StyleCompileContext,
  StyleCompileOptions,
  StyleCompileSession,
  StyleCompileState,
} from "./types";

export function shouldGenerateLightningCssSourceMap(
  postcssOptions: any,
  inputMap?: RawSourceMap,
): boolean {
  return !!(inputMap || (postcssOptions && postcssOptions.map));
}

export function createStyleCompileContext(
  options: StyleCompileOptions,
  overrides?: Partial<Pick<StyleCompileContext, "modules" | "modulesOptions" | "sourceMap">>,
): StyleCompileContext {
  const initialInputMap = options.inMap || options.map;

  return {
    filename: options.filename,
    id: options.id,
    isProd: options.isProd ?? false,
    modules: overrides?.modules ?? !!("modules" in options && options.modules),
    modulesOptions:
      overrides?.modulesOptions ??
      ("modulesOptions" in options ? options.modulesOptions || {} : {}),
    scoped: options.scoped ?? false,
    shortId: options.id.replace(/^data-v-/, ""),
    sourceMap:
      overrides?.sourceMap ??
      shouldGenerateLightningCssSourceMap(
        options.postcssOptions,
        initialInputMap as RawSourceMap | undefined,
      ),
  };
}

export function createStyleCompileState(
  source: string,
  inputMap: RawSourceMap | undefined,
  context: StyleCompileContext,
  options?: {
    dependencies?: Iterable<string>;
    errors?: Error[];
  },
): StyleCompileState {
  return {
    analysis: analyzeLightningCssStyle(source, context.id),
    dependencies: new Set(options?.dependencies || []),
    errors: options?.errors ? [...options.errors] : [],
    inputMap,
    source,
  };
}

export function createStyleCompileSession(
  context: StyleCompileContext,
  state: StyleCompileState,
): StyleCompileSession {
  return {
    context,
    state,
  };
}
