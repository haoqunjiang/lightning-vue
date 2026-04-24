import {
  rewriteCssSelectorSource,
  rewriteCssSelectorSourceWithMap,
  scopeSelectorPrelude,
} from "@lightning-vue/utils";
import type { RawSourceMap } from "@vue/compiler-core";
import merge from "merge-source-map";
import type { SourceScopeMode } from "../analysis";
import { scopeCarrierParserOptions } from "../scopeCarriers";
import { createScopedStyleTransformContext } from "./context";
import { appendRewrittenScopedSelectors } from "./rewrite";

export function scopeLightningCssSource(
  source: string,
  id: string,
  mode: SourceScopeMode = "parsed",
): string {
  const context = createScopedStyleTransformContext({ id });

  return rewriteCssSelectorSource(source, {
    tryRewritePreludeDirect: createSourcePreludeDirectRewrite(mode, context.id),
    parserOptions: scopeCarrierParserOptions,
    appendRewrittenSelectors: (selector, target) =>
      appendRewrittenScopedSelectors(selector, context, target),
  });
}

export interface ScopeLightningCssSourceWithMapResult {
  code: string;
  map: RawSourceMap | undefined;
}

export function scopeLightningCssSourceWithMap(
  source: string,
  filename: string,
  id: string,
  mode: SourceScopeMode = "parsed",
  map?: RawSourceMap,
): ScopeLightningCssSourceWithMapResult {
  const context = createScopedStyleTransformContext({ id });
  return rewriteCssSelectorSourceWithMap<RawSourceMap>(
    source,
    filename,
    {
      tryRewritePreludeDirect: createSourcePreludeDirectRewrite(mode, context.id),
      parserOptions: scopeCarrierParserOptions,
      appendRewrittenSelectors: (selector, target) =>
        appendRewrittenScopedSelectors(selector, context, target),
    },
    map,
    (currentMap, nextMap) => merge(currentMap, nextMap) as RawSourceMap,
  );
}

function createSourcePreludeDirectRewrite(
  mode: SourceScopeMode,
  id: string,
): ((prelude: string) => string | undefined) | undefined {
  if (mode === "simple") {
    return (prelude) => scopeSelectorPrelude(prelude, id);
  }

  return undefined;
}
