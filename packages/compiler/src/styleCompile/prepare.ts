import { rewriteCssVarsInStyleSource, rewriteCssVarsInStyleSourceWithMap } from "../style/cssVars";
import { deriveAnalysisAfterNestedNormalization } from "../style/lightningcss/analysis";
import { normalizeNestedStyleBlocks } from "../style/lightningcss/nesting/normalize";
import { findLegacyVueScopedSyntaxError } from "../style/lightningcss/scoped/legacy";
import type { StyleCompileSession } from "./types";

export function rewriteCssVarsInSession(session: StyleCompileSession): void {
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

export function normalizeNestedStylesInSession(session: StyleCompileSession): void {
  const { context, state } = session;
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
  state.analysis = deriveAnalysisAfterNestedNormalization(state.analysis, {
    introducedScopedSelectorSpecials: normalizedSource.introducedScopedSelectorSpecials,
  });
}

export function prepareStyleCompileSessionForTransform(session: StyleCompileSession): boolean {
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
