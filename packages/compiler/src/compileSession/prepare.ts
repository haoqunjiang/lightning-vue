import { rewriteCssVarsInStyleSource, rewriteCssVarsInStyleSourceWithMap } from "../style/cssVars";
import {
  canPrepareLocalNestedSource,
  deriveNormalizedSourceScopeMode,
  deriveAnalysisAfterNestedNormalization,
  needsNestedStyleNormalization,
} from "../style/lightningcss/analysis";
import { normalizeNestedStyleBlocks } from "../style/lightningcss/nesting/normalize";
import { findLegacyVueScopedSyntaxError } from "../style/lightningcss/scoped/legacy";
import type { CompileSession } from "./types";

export function rewriteCssVarsInSession(session: CompileSession): void {
  const { context, state } = session;
  if (!state.analysis.hasVBind) {
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
}

export function normalizeNestedStylesInSession(session: CompileSession): void {
  const { context, state } = session;
  if (!context.scoped || !needsNestedStyleNormalization(state.analysis)) {
    return;
  }

  const normalizedSource = normalizeNestedStyleBlocks(
    state.source,
    context.filename,
    state.inputMap,
    context.sourceMap,
    canPrepareLocalNestedSource(state.analysis)
      ? {
          preparedLocalScopeId: context.id,
        }
      : undefined,
  );

  if (!normalizedSource.normalized) {
    return;
  }

  state.source = normalizedSource.code;
  state.inputMap = normalizedSource.map;
  if (normalizedSource.preparedLocalSource) {
    // This route already emitted the local scoped source for the normalized
    // nested tree. Keep the original analysis so later nesting/animation
    // decisions still reflect the authored structure.
    state.sourceScopeMode = "prepared-local";
    return;
  }

  const nextAnalysis = deriveAnalysisAfterNestedNormalization(state.analysis, {
    introducedScopedSelectorSpecials: normalizedSource.introducedScopedSelectorSpecials,
  });
  state.sourceScopeMode = deriveNormalizedSourceScopeMode(
    state.analysis,
    nextAnalysis,
    normalizedSource.introducedScopedSelectorSpecials,
  );
  state.analysis = nextAnalysis;
}

export function prepareCompileSessionForTransform(session: CompileSession): boolean {
  const { context, state } = session;
  const legacyScopedSyntaxError = context.scoped && findLegacyVueScopedSyntaxError(state.source);

  if (legacyScopedSyntaxError) {
    state.errors.push(legacyScopedSyntaxError);
    return false;
  }

  rewriteCssVarsInSession(session);
  normalizeNestedStylesInSession(session);
  return true;
}
