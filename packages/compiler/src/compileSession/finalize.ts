import type { SFCStyleCompileResults } from "@vue/compiler-sfc";
import type { RawSourceMap } from "@vue/compiler-core";
import {
  rewriteNormalizedAnimationDeclarations,
  rewriteNormalizedAnimationDeclarationsWithMap,
} from "../style/lightningcss/scoped/animation";
import { normalizeLightningCssModules } from "./modules";
import type { CompileSession } from "./types";

const textDecoder = new TextDecoder();

function rewriteAnimationDeclarationsIfNeeded(
  code: string,
  map: RawSourceMap | undefined,
  session: CompileSession,
): { code: string; map: RawSourceMap | undefined } {
  const { context, state } = session;
  const { analysis } = state;
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

export function finalizeCompileFailure(session: CompileSession): SFCStyleCompileResults {
  const { state } = session;
  return {
    code: "",
    map: undefined,
    rawResult: undefined,
    errors: state.errors,
    dependencies: state.dependencies,
  };
}

export function finalizeCompileSuccess(
  result: any,
  session: CompileSession,
): SFCStyleCompileResults {
  const { context, state } = session;
  const postTransform = rewriteAnimationDeclarationsIfNeeded(
    textDecoder.decode(result.code),
    result.map ? JSON.parse(textDecoder.decode(result.map)) : undefined,
    session,
  );

  return {
    code: postTransform.code,
    map: postTransform.map,
    rawResult: undefined,
    errors: state.errors,
    modules: context.modules
      ? normalizeLightningCssModules(result.exports, context.modulesOptions)
      : undefined,
    dependencies: state.dependencies,
  };
}
