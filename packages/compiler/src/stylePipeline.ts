import type {
  SFCAsyncStyleCompileOptions,
  SFCStyleCompileOptions,
  SFCStyleCompileResults,
} from "@vue/compiler-sfc";
import type { RawSourceMap } from "@vue/compiler-core";
import {
  hasCssVarsBinding,
  rewriteCssVarsInStyleSource,
  rewriteCssVarsInStyleSourceWithMap,
} from "./style/cssVars";
import { analyzeLightningCssStyle } from "./style/lightningcss/analysis";
import { normalizeNestedStyleBlocks } from "./style/lightningcss/nesting/normalize";
import {
  rewriteNormalizedAnimationDeclarations,
  rewriteNormalizedAnimationDeclarationsWithMap,
} from "./style/lightningcss/scoped/animation";
import {
  scopeLightningCssSource,
  scopeLightningCssSourceWithMap,
} from "./style/lightningcss/scoped/source";
import { createLightningCssStyleVisitor } from "./style/lightningcss/visitor";

export type CSSModulesOptions = NonNullable<SFCAsyncStyleCompileOptions["modulesOptions"]>;

export interface StyleCompileContext {
  filename: string;
  id: string;
  isProd: boolean;
  modules: boolean;
  modulesOptions: CSSModulesOptions;
  scoped: boolean;
  shortId: string;
  sourceMap: boolean;
}

export interface StyleCompileState {
  analysis: ReturnType<typeof analyzeLightningCssStyle>;
  dependencies: Set<string>;
  errors: Error[];
  inputMap: RawSourceMap | undefined;
  source: string;
}

export interface SourceScopingResult {
  scopedSource: string;
  selectorsScopedInSource: boolean;
}

export interface LightningCssRuntime {
  Features: { Nesting: number };
  transform: (options: any) => any;
}

export function shouldGenerateLightningCssSourceMap(
  postcssOptions: any,
  inputMap?: RawSourceMap,
): boolean {
  return !!(inputMap || (postcssOptions && postcssOptions.map));
}

export function createStyleCompileContext(
  options: SFCStyleCompileOptions | SFCAsyncStyleCompileOptions,
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

export function rewriteCssVarsInState(
  state: StyleCompileState,
  context: StyleCompileContext,
): void {
  if (!hasCssVarsBinding(state.source)) {
    return;
  }

  if (context.sourceMap) {
    const rewritten = rewriteCssVarsInStyleSourceWithMap(
      state.source,
      context.filename,
      context.shortId,
      context.isProd,
      state.inputMap,
    );
    state.source = rewritten.code;
    state.inputMap = rewritten.map;
  } else {
    state.source = rewriteCssVarsInStyleSource(state.source, context.shortId, context.isProd);
  }

  refreshStyleAnalysis(state, context);
}

export function normalizeNestedStylesInState(
  state: StyleCompileState,
  context: StyleCompileContext,
): void {
  if (!context.scoped || !state.analysis.hasNestedStyleRules) {
    return;
  }

  const normalizedSource = normalizeNestedStyleBlocks(
    state.source,
    context.filename,
    state.inputMap,
    context.sourceMap,
  );

  if (!normalizedSource.normalized) {
    return;
  }

  state.source = normalizedSource.code;
  state.inputMap = normalizedSource.map;
  refreshStyleAnalysis(state, context);
}

export function computeScopedSource(
  state: StyleCompileState,
  context: StyleCompileContext,
): SourceScopingResult {
  let selectorsScopedInSource = context.scoped && !context.modules;
  if (!selectorsScopedInSource) {
    return {
      scopedSource: state.source,
      selectorsScopedInSource,
    };
  }

  try {
    if (context.sourceMap) {
      const scopedResult = scopeLightningCssSourceWithMap(
        state.source,
        context.filename,
        context.id,
        state.analysis.hasScopedSelectorSpecials,
        state.inputMap,
      );
      state.inputMap = scopedResult.map;
      return {
        scopedSource: scopedResult.code,
        selectorsScopedInSource,
      };
    }

    return {
      scopedSource: scopeLightningCssSource(
        state.source,
        context.id,
        state.analysis.hasScopedSelectorSpecials,
      ),
      selectorsScopedInSource,
    };
  } catch {
    selectorsScopedInSource = false;
    return {
      scopedSource: state.source,
      selectorsScopedInSource,
    };
  }
}

export function createLightningCssTransformOptions(
  lightningcss: LightningCssRuntime,
  state: StyleCompileState,
  context: StyleCompileContext,
  sourceScoping: SourceScopingResult,
) {
  const cssModules = context.modules
    ? createLightningCssModulesConfig(context.modulesOptions)
    : undefined;

  return {
    filename: context.filename,
    code: encodeCode(sourceScoping.scopedSource),
    sourceMap: context.sourceMap,
    inputSourceMap: state.inputMap ? JSON.stringify(state.inputMap) : undefined,
    cssModules,
    nonStandard: {
      deepSelectorCombinator: true,
    },
    visitor: createLightningCssStyleVisitor({
      analysis: state.analysis,
      id: context.id,
      isProd: context.isProd,
      scoped: context.scoped,
      selectorsScopedInSource: sourceScoping.selectorsScopedInSource,
    }),
    ...(state.analysis.hasNestedStyleRules ? { include: lightningcss.Features.Nesting } : null),
  };
}

export function rewriteAnimationDeclarationsIfNeeded(
  code: string,
  map: RawSourceMap | undefined,
  analysis: ReturnType<typeof analyzeLightningCssStyle>,
  context: StyleCompileContext,
): { code: string; map: RawSourceMap | undefined } {
  if (
    !context.scoped ||
    !analysis.hasAnimationDeclarations ||
    !Object.keys(analysis.keyframes).length
  ) {
    return {
      code,
      map,
    };
  }

  if (context.sourceMap) {
    return rewriteNormalizedAnimationDeclarationsWithMap(
      code,
      context.filename,
      analysis.keyframes,
      map,
    );
  }

  return {
    code: rewriteNormalizedAnimationDeclarations(code, analysis.keyframes).code,
    map,
  };
}

export function finalizeStyleCompileFailure(state: StyleCompileState): SFCStyleCompileResults {
  return {
    code: "",
    map: undefined,
    rawResult: undefined,
    errors: state.errors,
    dependencies: state.dependencies,
  };
}

export function createLightningCssModulesConfig(options: CSSModulesOptions) {
  const { generateScopedName } = options;
  return typeof generateScopedName === "string" ? { pattern: generateScopedName } : {};
}

export function encodeCode(code: string) {
  return new TextEncoder().encode(code);
}

export function decodeCode(code: Uint8Array) {
  return new TextDecoder().decode(code);
}

function refreshStyleAnalysis(state: StyleCompileState, context: StyleCompileContext): void {
  state.analysis = analyzeLightningCssStyle(state.source, context.id);
}
