import {
  type CssSelectorSourceRewriteOptions,
  rewriteCssSelectorSource,
  rewriteCssSelectorSourceWithMap,
  scopeSelectorPrelude,
} from "@lightning-vue/utils";
import type { RawSourceMap } from "@vue/compiler-core";
import merge from "merge-source-map";
import type { SourceScopeMode } from "../analysis";
import { scopeCarrierParserOptions } from "../scopeCarriers";
import { getShortScopeId } from "../../scopeId";
import { createScopedStyleTransformContext } from "./context";
import { appendRewrittenScopedSelectors } from "./rewrite";
import type { ScopedStyleTransformContext } from "./types";

export function scopeLightningCssSource(
  source: string,
  id: string,
  mode: SourceScopeMode = "parsed",
): string {
  return rewriteCssSelectorSource(source, createSourceRewriteOptions(id, mode));
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
  return rewriteCssSelectorSourceWithMap<RawSourceMap>(
    source,
    filename,
    createSourceRewriteOptions(id, mode),
    map,
    (currentMap, nextMap) => merge(currentMap, nextMap) as RawSourceMap,
  );
}

function createSourceRewriteOptions(
  id: string,
  mode: SourceScopeMode,
): CssSelectorSourceRewriteOptions {
  const scopeId = `data-v-${getShortScopeId(id)}`;
  let context: ScopedStyleTransformContext | undefined;
  const getContext = () => (context ??= createScopedStyleTransformContext({ id }));

  return {
    tryRewritePreludeDirect: createSourcePreludeDirectRewrite(mode, scopeId),
    parserOptions: scopeCarrierParserOptions,
    appendRewrittenSelectors: (selector, target) =>
      appendRewrittenScopedSelectors(selector, getContext(), target),
  };
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
