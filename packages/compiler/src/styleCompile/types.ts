import type { SFCAsyncStyleCompileOptions, SFCStyleCompileOptions } from "@vue/compiler-sfc";
import type { RawSourceMap } from "@vue/compiler-core";
import { analyzeLightningCssStyle } from "../style/lightningcss/analysis";

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

export interface StyleCompileSession {
  context: StyleCompileContext;
  state: StyleCompileState;
}

export interface StyleTransformPlan {
  code: string;
  cssModules: { pattern: string } | {} | undefined;
  includeNesting: boolean;
  inputSourceMap: string | undefined;
  selectorsScopedInSource: boolean;
}

export interface LightningCssRuntime {
  Features: { Nesting: number };
  transform: (options: any) => any;
}

export type StyleCompileOptions = SFCStyleCompileOptions | SFCAsyncStyleCompileOptions;
