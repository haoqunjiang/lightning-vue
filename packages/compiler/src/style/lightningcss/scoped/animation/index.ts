import { findTrimmedCssRange } from "@lightning-vue/utils";
import type { RawSourceMap } from "@vue/compiler-core";
import MagicString from "magic-string";
import merge from "merge-source-map";
import { rewriteAnimationNameValue, rewriteRawAnimationIdentifier } from "./names";
import { rewriteAnimationShorthandValue } from "./shorthand";

export interface RewriteAnimationReferencesResult {
  code: string;
  map: RawSourceMap | undefined;
}

export type PlannedAnimationReferenceRewriteKind =
  | "keyframes-prelude"
  | "animation-name-declaration"
  | "animation-shorthand-declaration";

export interface PlannedAnimationReferenceRewrite {
  end: number;
  kind: PlannedAnimationReferenceRewriteKind;
  rawText: string;
  start: number;
  text: string;
}

const keyframesPreludePattern = String.raw`(^|})\s*@(?:-\w+-)?keyframes\s+([^\s{;]+)`;
const animationNameDeclarationPattern = String.raw`(^|[;{])\s*(?:-\w+-)?animation-name\s*:\s*([^;}]*)`;
const animationShorthandDeclarationPattern = String.raw`(^|[;{])\s*(?:-\w+-)?animation\s*:\s*([^;}]*)`;
const normalizedAnimationReferenceRE = new RegExp(
  [
    keyframesPreludePattern,
    animationNameDeclarationPattern,
    animationShorthandDeclarationPattern,
  ].join("|"),
  "gim",
);
const keyframesNameCapture = 2;
const animationNameValueCapture = 4;
const animationShorthandValueCapture = 6;

export function rewriteNormalizedAnimationReferences(
  source: string,
  keyframes: Record<string, string>,
): RewriteAnimationReferencesResult {
  const rewrites = planNormalizedAnimationReferenceRewrites(source, keyframes);
  if (!rewrites.length) {
    return {
      code: source,
      map: undefined,
    };
  }

  return {
    code: applyPlannedAnimationReferenceRewrites(source, rewrites),
    map: undefined,
  };
}

export function rewriteNormalizedAnimationReferencesWithMap(
  source: string,
  filename: string,
  keyframes: Record<string, string>,
  map?: RawSourceMap,
): RewriteAnimationReferencesResult {
  const rewrites = planNormalizedAnimationReferenceRewrites(source, keyframes);
  if (!rewrites.length) {
    return {
      code: source,
      map,
    };
  }

  const s = new MagicString(source);
  applyPlannedAnimationReferenceRewritesToMagicString(s, rewrites);
  const nextMap = s.generateMap({
    source: filename,
    includeContent: true,
    hires: true,
  });

  return {
    code: s.toString(),
    map: map
      ? (merge(map, nextMap) as RawSourceMap)
      : (JSON.parse(nextMap.toString()) as RawSourceMap),
  };
}

export function planNormalizedAnimationReferenceRewrites(
  source: string,
  keyframes: Record<string, string>,
): PlannedAnimationReferenceRewrite[] {
  if (!hasKeyframeRenames(keyframes)) {
    return [];
  }

  const rewrites: PlannedAnimationReferenceRewrite[] = [];
  collectNormalizedAnimationReferenceRewrites(source, keyframes, rewrites);
  return rewrites;
}

function collectNormalizedAnimationReferenceRewrites(
  source: string,
  keyframes: Record<string, string>,
  rewrites: PlannedAnimationReferenceRewrite[],
): void {
  normalizedAnimationReferenceRE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = normalizedAnimationReferenceRE.exec(source))) {
    const rewrite = resolveAnimationReferenceRewrite(match, keyframes);
    if (!rewrite) {
      continue;
    }

    const { kind, rawValue, rewrittenValue } = rewrite;
    // Each branch puts the rewritten value in the trailing capture, so the
    // source range can be recovered without the slower regexp indices flag.
    const valueEnd = match.index + match[0].length;
    const valueStart = valueEnd - rawValue.length;
    if (rewrittenValue === undefined || rewrittenValue === rawValue) {
      continue;
    }

    rewrites.push({
      start: valueStart,
      end: valueEnd,
      kind,
      rawText: rawValue,
      text: rewrittenValue,
    });
  }
}

function resolveAnimationReferenceRewrite(
  match: RegExpExecArray,
  keyframes: Record<string, string>,
):
  | {
      kind: PlannedAnimationReferenceRewriteKind;
      rawValue: string;
      rewrittenValue: string | undefined;
    }
  | undefined {
  if (match[keyframesNameCapture] !== undefined) {
    const rawValue = match[keyframesNameCapture];
    return {
      kind: "keyframes-prelude",
      rawValue,
      rewrittenValue: rewriteRawAnimationIdentifier(rawValue, keyframes),
    };
  }

  if (match[animationNameValueCapture] !== undefined) {
    const rawValue = match[animationNameValueCapture];
    return {
      kind: "animation-name-declaration",
      rawValue,
      rewrittenValue: rewriteNormalizedAnimationDeclarationValue(
        rawValue,
        keyframes,
        rewriteAnimationNameValue,
      ),
    };
  }

  if (match[animationShorthandValueCapture] !== undefined) {
    const rawValue = match[animationShorthandValueCapture];
    return {
      kind: "animation-shorthand-declaration",
      rawValue,
      rewrittenValue: rewriteNormalizedAnimationDeclarationValue(
        rawValue,
        keyframes,
        rewriteAnimationShorthandValue,
      ),
    };
  }

  return undefined;
}

export function applyPlannedAnimationReferenceRewrites(
  source: string,
  rewrites: PlannedAnimationReferenceRewrite[],
): string {
  let code = "";
  let lastEnd = 0;
  for (const rewrite of rewrites) {
    code += source.slice(lastEnd, rewrite.start) + rewrite.text;
    lastEnd = rewrite.end;
  }

  return code + source.slice(lastEnd);
}

function applyPlannedAnimationReferenceRewritesToMagicString(
  s: MagicString,
  rewrites: PlannedAnimationReferenceRewrite[],
): void {
  for (const rewrite of rewrites) {
    s.overwrite(rewrite.start, rewrite.end, rewrite.text);
  }
}

function hasKeyframeRenames(keyframes: Record<string, string>): boolean {
  for (const _name in keyframes) {
    return true;
  }

  return false;
}

function rewriteNormalizedAnimationDeclarationValue(
  rawValue: string,
  keyframes: Record<string, string>,
  rewriteValue: (value: string, keyframes: Record<string, string>) => string,
): string | undefined {
  const trimmedRange = findTrimmedCssRange(rawValue);
  if (!trimmedRange) {
    return undefined;
  }

  const leading = rawValue.slice(0, trimmedRange.start);
  const trailing = rawValue.slice(trimmedRange.end);
  const trimmedValue = rawValue.slice(trimmedRange.start, trimmedRange.end);
  if (!trimmedValue) {
    return undefined;
  }

  const rewrittenValue = rewriteValue(trimmedValue, keyframes);
  return rewrittenValue === trimmedValue ? undefined : `${leading}${rewrittenValue}${trailing}`;
}
