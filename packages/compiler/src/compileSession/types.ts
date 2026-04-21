import type { SFCAsyncStyleCompileOptions, SFCStyleCompileOptions } from "@vue/compiler-sfc";
import type { RawSourceMap } from "@vue/compiler-core";
import { analyzeLightningCssStyle } from "../style/lightningcss/analysis";

export type CSSModulesOptions = NonNullable<SFCAsyncStyleCompileOptions["modulesOptions"]>;

export interface CompileContext {
  filename: string;
  id: string;
  isProd: boolean;
  modules: boolean;
  modulesOptions: CSSModulesOptions;
  scoped: boolean;
  shortId: string;
  sourceMap: boolean;
}

export interface CompileState {
  analysis: ReturnType<typeof analyzeLightningCssStyle>;
  dependencies: Set<string>;
  errors: Error[];
  inputMap: RawSourceMap | undefined;
  source: string;
}

export interface CompileSession {
  context: CompileContext;
  state: CompileState;
}

export interface TransformPlan {
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

export type CompileOptions = SFCStyleCompileOptions | SFCAsyncStyleCompileOptions;
