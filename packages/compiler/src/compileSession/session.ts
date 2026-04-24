import type { RawSourceMap } from "@vue/compiler-core";
import { analyzeLightningCssStyle, deriveSourceScopeMode } from "../style/lightningcss/analysis";
import type { CompileContext, CompileOptions, CompileSession, CompileState } from "./types";

export function shouldGenerateLightningCssSourceMap(
  postcssOptions: any,
  inputMap?: RawSourceMap,
): boolean {
  return !!(inputMap || (postcssOptions && postcssOptions.map));
}

export function createCompileContext(
  options: CompileOptions,
  overrides?: Partial<Pick<CompileContext, "modules" | "modulesOptions" | "sourceMap">>,
): CompileContext {
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

export function createCompileState(
  source: string,
  inputMap: RawSourceMap | undefined,
  context: CompileContext,
  options?: {
    dependencies?: Iterable<string>;
    errors?: Error[];
  },
): CompileState {
  const analysis = analyzeLightningCssStyle(source, context.id);
  return {
    analysis,
    dependencies: new Set(options?.dependencies || []),
    errors: options?.errors ? [...options.errors] : [],
    inputMap,
    sourceScopeMode: deriveSourceScopeMode(analysis),
    source,
  };
}

export function createCompileSession(context: CompileContext, state: CompileState): CompileSession {
  return {
    context,
    state,
  };
}
