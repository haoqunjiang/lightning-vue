import { Features, transform } from "lightningcss";
import type { SFCAsyncStyleCompileOptions } from "@vue/compiler-sfc";
import {
  type StyleCompileOptions,
  createStyleCompileContext,
  createStyleCompileSession,
  createStyleCompileState,
  createStyleTransformPlan,
  finalizeStyleCompileFailure,
  finalizeStyleCompileSuccess,
  prepareStyleCompileSessionForTransform,
  transformPreparedStyleCompileSession,
} from "../styleCompile";

export interface StyleCompileTraceCase {
  options: Partial<SFCAsyncStyleCompileOptions> & Pick<SFCAsyncStyleCompileOptions, "source">;
  title: string;
}

export interface StyleCompileTrace {
  context: string[];
  final: string[];
  finalCode: string;
  initial: string[];
  prepared: string[];
  preparedSource: string;
  source: string;
  transform: string[];
  transformCode: string;
}

const lightningcss = {
  Features,
  transform,
};

export const styleCompileTraceCases: StyleCompileTraceCase[] = [
  {
    title: "simple scoped source path",
    options: {
      scoped: true,
      source: `.card .title { color: red; }`,
    },
  },
  {
    title: "nested scoped source preparation",
    options: {
      scoped: true,
      source: `.card {
  color: red;
  .title { color: blue; }
}`,
    },
  },
  {
    title: "css vars and animation finalize pass",
    options: {
      scoped: true,
      source: `.card {
  color: v-bind(themeColor);
  animation: fade 1s;
}
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
    },
  },
  {
    title: "css modules transform plan",
    options: {
      modules: true,
      modulesOptions: {
        localsConvention: "camelCaseOnly",
      },
      source: `.foo-bar { color: red; }`,
    },
  },
];

/**
 * Traces the shared style-compile flow at the stage boundaries we treat as
 * stable architecture:
 *
 * 1. context/session creation
 * 2. initial analyzed source state
 * 3. prepared source state
 * 4. transform plan
 * 5. final public compile result
 *
 * The goal is not to mirror every helper call. It is to keep the important
 * phase contracts observable so refactors can be judged against something more
 * concrete than “this still feels right”.
 */
export async function traceStyleCompile(
  traceOptions: Partial<SFCAsyncStyleCompileOptions> & Pick<SFCAsyncStyleCompileOptions, "source">,
): Promise<StyleCompileTrace> {
  const options = resolveStyleCompileTraceOptions(traceOptions);
  const context = createStyleCompileContext(options);
  const state = createStyleCompileState(options.source, options.inMap || options.map, context);
  const session = createStyleCompileSession(context, state);

  const trace: StyleCompileTrace = {
    source: options.source,
    context: formatStyleCompileContext(context),
    initial: formatStyleCompileState("initial", state),
    prepared: [],
    preparedSource: state.source,
    transform: [],
    transformCode: state.source,
    final: [],
    finalCode: "",
  };

  const prepared = prepareStyleCompileSessionForTransform(session);
  trace.prepared = [`prepared=${prepared}`, ...formatStyleCompileState("prepared", session.state)];
  trace.preparedSource = session.state.source;

  if (!prepared) {
    const failedResult = finalizeStyleCompileFailure(session);
    trace.final = formatStyleCompileResult(failedResult);
    trace.finalCode = failedResult.code;
    return trace;
  }

  const transformPlan = createStyleTransformPlan(session);
  trace.transform = formatStyleTransformPlan(transformPlan);
  trace.transformCode = transformPlan.code;

  const transformResult = transformPreparedStyleCompileSession(lightningcss, session);
  const manualResult = finalizeStyleCompileSuccess(transformResult, session);
  trace.final = formatStyleCompileResult(manualResult);
  trace.finalCode = manualResult.code;
  return trace;
}

export function formatStyleCompileTrace(trace: StyleCompileTrace): string {
  return [
    `source: ${trace.source}`,
    "",
    "context:",
    ...trace.context.map((line) => `  - ${line}`),
    "",
    "initial:",
    ...trace.initial.map((line) => `  - ${line}`),
    "",
    "prepared:",
    ...trace.prepared.map((line) => `  - ${line}`),
    "",
    "transform:",
    ...trace.transform.map((line) => `  - ${line}`),
    "",
    "final:",
    ...trace.final.map((line) => `  - ${line}`),
  ].join("\n");
}

export function resolveStyleCompileTraceOptions(
  options: Partial<SFCAsyncStyleCompileOptions> & Pick<SFCAsyncStyleCompileOptions, "source">,
): StyleCompileOptions {
  return {
    filename: options.filename || "trace.css",
    id: options.id || "data-v-trace",
    isProd: options.isProd ?? false,
    postcssOptions: options.postcssOptions,
    postcssPlugins: options.postcssPlugins,
    preprocessCustomRequire: options.preprocessCustomRequire,
    preprocessLang: options.preprocessLang,
    preprocessOptions: options.preprocessOptions,
    scoped: options.scoped ?? false,
    source: options.source,
    trim: options.trim,
    inMap: options.inMap,
    map: options.map,
    modules: "modules" in options ? options.modules : undefined,
    modulesOptions: "modulesOptions" in options ? options.modulesOptions : undefined,
  };
}

function formatStyleCompileContext(
  context: ReturnType<typeof createStyleCompileContext>,
): string[] {
  return [
    `filename=${context.filename}`,
    `scoped=${context.scoped}`,
    `modules=${context.modules}`,
    `sourceMap=${context.sourceMap}`,
    `isProd=${context.isProd}`,
  ];
}

function formatStyleCompileState(
  label: string,
  state: ReturnType<typeof createStyleCompileState>,
): string[] {
  return [
    `${label}.source=${JSON.stringify(state.source)}`,
    `${label}.analysis=nested:${state.analysis.hasNestedStyleRules} specials:${state.analysis.hasScopedSelectorSpecials} animations:${state.analysis.hasAnimationDeclarations} keyframes:${Object.keys(state.analysis.keyframes).length}`,
    `${label}.inputMap=${!!state.inputMap}`,
    `${label}.errors=${state.errors.length}`,
    `${label}.dependencies=${state.dependencies.size}`,
  ];
}

function formatStyleTransformPlan(plan: ReturnType<typeof createStyleTransformPlan>): string[] {
  return [
    `code=${JSON.stringify(plan.code)}`,
    `selectorsScopedInSource=${plan.selectorsScopedInSource}`,
    `includeNesting=${plan.includeNesting}`,
    `inputSourceMap=${!!plan.inputSourceMap}`,
    `cssModules=${plan.cssModules ? JSON.stringify(plan.cssModules) : "undefined"}`,
  ];
}

function formatStyleCompileResult(
  result: ReturnType<typeof finalizeStyleCompileFailure>,
): string[] {
  return [
    `code=${JSON.stringify(result.code)}`,
    `map=${!!result.map}`,
    `errors=${result.errors.length}`,
    `dependencies=${result.dependencies.size}`,
    `modules=${result.modules ? JSON.stringify(result.modules) : "undefined"}`,
  ];
}
