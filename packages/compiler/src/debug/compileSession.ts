import { Features, transform } from "lightningcss";
import type { SFCAsyncStyleCompileOptions } from "@vue/compiler-sfc";
import {
  type CompileOptions,
  createCompileContext,
  createCompileSession,
  createCompileState,
  createTransformPlan,
  finalizeCompileFailure,
  finalizeCompileSuccess,
  prepareCompileSessionForTransform,
  transformPreparedCompileSession,
} from "../compileSession";

export interface CompileSessionTraceCase {
  options: Partial<SFCAsyncStyleCompileOptions> & Pick<SFCAsyncStyleCompileOptions, "source">;
  title: string;
}

export interface CompileSessionTrace {
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

export const compileSessionTraceCases: CompileSessionTraceCase[] = [
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
    title: "css vars with renamed keyframes",
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
 * Traces the shared compile-session flow at the stage boundaries we treat as
 * stable architecture:
 *
 * 1. context/session creation
 * 2. initial analyzed source state
 * 3. prepared source state
 * 4. transform plan
 * 5. final public compile result
 *
 * This trace does not mirror every helper call. It keeps the important phase
 * contracts observable so refactors can be judged against something more
 * concrete than “this still feels right”.
 */
export async function traceCompileSession(
  traceOptions: Partial<SFCAsyncStyleCompileOptions> & Pick<SFCAsyncStyleCompileOptions, "source">,
): Promise<CompileSessionTrace> {
  const options = resolveCompileSessionTraceOptions(traceOptions);
  const context = createCompileContext(options);
  const state = createCompileState(options.source, options.inMap || options.map, context);
  const session = createCompileSession(context, state);

  const trace: CompileSessionTrace = {
    source: options.source,
    context: formatCompileContext(context),
    initial: formatCompileState("initial", state),
    prepared: [],
    preparedSource: state.source,
    transform: [],
    transformCode: state.source,
    final: [],
    finalCode: "",
  };

  const prepared = prepareCompileSessionForTransform(session);
  trace.prepared = [`prepared=${prepared}`, ...formatCompileState("prepared", session.state)];
  trace.preparedSource = session.state.source;

  if (!prepared) {
    const failedResult = finalizeCompileFailure(session);
    trace.final = formatCompileResult(failedResult);
    trace.finalCode = failedResult.code;
    return trace;
  }

  const transformPlan = createTransformPlan(session);
  trace.transform = formatTransformPlan(transformPlan);
  trace.transformCode = transformPlan.code;

  const transformResult = transformPreparedCompileSession(lightningcss, session);
  const manualResult = finalizeCompileSuccess(transformResult, session);
  trace.final = formatCompileResult(manualResult);
  trace.finalCode = manualResult.code;
  return trace;
}

export function formatCompileSessionTrace(trace: CompileSessionTrace): string {
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

export function resolveCompileSessionTraceOptions(
  options: Partial<SFCAsyncStyleCompileOptions> & Pick<SFCAsyncStyleCompileOptions, "source">,
): CompileOptions {
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

function formatCompileContext(context: ReturnType<typeof createCompileContext>): string[] {
  return [
    `filename=${context.filename}`,
    `scoped=${context.scoped}`,
    `modules=${context.modules}`,
    `sourceMap=${context.sourceMap}`,
    `isProd=${context.isProd}`,
  ];
}

function formatCompileState(label: string, state: ReturnType<typeof createCompileState>): string[] {
  return [
    `${label}.source=${JSON.stringify(state.source)}`,
    `${label}.analysis=nested:${state.analysis.hasNestedStyleRules} specials:${state.analysis.hasScopedSelectorSpecials} animations:${state.analysis.hasAnimationDeclarations} keyframes:${Object.keys(state.analysis.keyframes).length}`,
    `${label}.inputMap=${!!state.inputMap}`,
    `${label}.errors=${state.errors.length}`,
    `${label}.dependencies=${state.dependencies.size}`,
  ];
}

function formatTransformPlan(plan: ReturnType<typeof createTransformPlan>): string[] {
  return [
    `code=${JSON.stringify(plan.code)}`,
    `selectorsScopedInSource=${plan.selectorsScopedInSource}`,
    `includeNesting=${plan.includeNesting}`,
    `inputSourceMap=${!!plan.inputSourceMap}`,
    `cssModules=${plan.cssModules ? JSON.stringify(plan.cssModules) : "undefined"}`,
  ];
}

function formatCompileResult(result: ReturnType<typeof finalizeCompileFailure>): string[] {
  return [
    `code=${JSON.stringify(result.code)}`,
    `map=${!!result.map}`,
    `errors=${result.errors.length}`,
    `dependencies=${result.dependencies.size}`,
    `modules=${result.modules ? JSON.stringify(result.modules) : "undefined"}`,
  ];
}
