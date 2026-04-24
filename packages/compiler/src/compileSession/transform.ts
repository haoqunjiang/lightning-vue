import {
  scopeLightningCssSource,
  scopeLightningCssSourceWithMap,
} from "../style/lightningcss/scoped/source";
import { hasNestedStructure } from "../style/lightningcss/analysis";
import { createLightningCssStyleVisitor } from "../style/lightningcss/visitor";
import { createLightningCssModulesConfig } from "./modules";
import type { CompileSession, LightningCssRuntime, TransformPlan } from "./types";

const textEncoder = new TextEncoder();

export function createTransformPlan(session: CompileSession): TransformPlan {
  const { context, state } = session;
  const basePlan = createBaseTransformPlan(session);
  let selectorsScopedInSource = context.scoped && !context.modules;
  if (!selectorsScopedInSource) {
    return {
      ...basePlan,
      code: state.source,
      selectorsScopedInSource,
    };
  }

  if (state.sourceScopeMode === "prepared-local") {
    return {
      ...basePlan,
      code: state.source,
      selectorsScopedInSource,
    };
  }

  try {
    if (context.sourceMap) {
      const scopedResult = scopeLightningCssSourceWithMap(
        state.source,
        context.filename,
        context.id,
        state.sourceScopeMode,
        state.inputMap,
      );
      state.inputMap = scopedResult.map;
      return {
        ...basePlan,
        code: scopedResult.code,
        inputSourceMap: state.inputMap ? JSON.stringify(state.inputMap) : undefined,
        selectorsScopedInSource,
      };
    }

    return {
      ...basePlan,
      code: scopeLightningCssSource(state.source, context.id, state.sourceScopeMode),
      selectorsScopedInSource,
    };
  } catch {
    selectorsScopedInSource = false;
    return {
      ...basePlan,
      code: state.source,
      selectorsScopedInSource,
    };
  }
}

function createBaseTransformPlan(
  session: CompileSession,
): Omit<TransformPlan, "code" | "selectorsScopedInSource"> {
  const { context, state } = session;

  return {
    cssModules: context.modules
      ? createLightningCssModulesConfig(context.modulesOptions)
      : undefined,
    includeNesting: hasNestedStructure(state.analysis.nested),
    inputSourceMap: state.inputMap ? JSON.stringify(state.inputMap) : undefined,
  };
}

function createLightningCssTransformOptions(
  lightningcss: LightningCssRuntime,
  session: CompileSession,
  plan: TransformPlan,
) {
  const { context, state } = session;

  return {
    filename: context.filename,
    code: textEncoder.encode(plan.code),
    sourceMap: context.sourceMap,
    inputSourceMap: plan.inputSourceMap,
    cssModules: plan.cssModules,
    nonStandard: {
      deepSelectorCombinator: true,
    },
    visitor: createLightningCssStyleVisitor({
      analysis: state.analysis,
      id: context.id,
      isProd: context.isProd,
      scoped: context.scoped,
      selectorsScopedInSource: plan.selectorsScopedInSource,
    }),
    ...(plan.includeNesting ? { include: lightningcss.Features.Nesting } : null),
  };
}

export function transformPreparedCompileSession(
  lightningcss: LightningCssRuntime,
  session: CompileSession,
) {
  const plan = createTransformPlan(session);
  return lightningcss.transform(createLightningCssTransformOptions(lightningcss, session, plan));
}
