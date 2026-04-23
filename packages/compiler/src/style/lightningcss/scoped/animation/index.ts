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

interface AnimationRewritePattern {
  kind: PlannedAnimationReferenceRewriteKind;
  regex: RegExp;
  rewriteValue: (value: string, keyframes: Record<string, string>) => string | undefined;
}

// These regex scans run on Lightning CSS's normalized output, not raw authored
// source. At that stage, animation declarations are flattened into plain
// top-level declarations and explicit keyframe names are serialized into a
// predictable token shape, which makes this cheap text rewrite stable enough
// for the supported surface. Each pattern names the rewritten span as `value`,
// so the planner can recover the exact byte range from `match.indices`.
//
// These patterns target disjoint surfaces:
// - keyframe preludes
// - animation-name declarations
// - animation shorthand declarations
//
// The planned rewrite ranges stay non-overlapping, so the public compile path
// does not need another validation pass here.
const animationRewritePatterns: AnimationRewritePattern[] = [
  {
    kind: "keyframes-prelude",
    regex: /(^|})\s*@(?:-\w+-)?keyframes\s+(?<value>[^\s{;]+)/dgim,
    rewriteValue: rewriteRawAnimationIdentifier,
  },
  {
    kind: "animation-name-declaration",
    regex: /(^|[;{])\s*(?:-\w+-)?animation-name\s*:\s*(?<value>[^;}]*)/dgim,
    rewriteValue: (value, keyframes) =>
      rewriteNormalizedAnimationDeclarationValue(value, keyframes, rewriteAnimationNameValue),
  },
  {
    kind: "animation-shorthand-declaration",
    regex: /(^|[;{])\s*(?:-\w+-)?animation\s*:\s*(?<value>[^;}]*)/dgim,
    rewriteValue: (value, keyframes) =>
      rewriteNormalizedAnimationDeclarationValue(value, keyframes, rewriteAnimationShorthandValue),
  },
];

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
  if (!Object.keys(keyframes).length) {
    return [];
  }

  const rewrites: PlannedAnimationReferenceRewrite[] = [];
  for (const pattern of animationRewritePatterns) {
    collectPatternRewrites(source, pattern, keyframes, rewrites);
  }

  return rewrites.sort((left, right) => left.start - right.start);
}

function collectPatternRewrites(
  source: string,
  pattern: AnimationRewritePattern,
  keyframes: Record<string, string>,
  rewrites: PlannedAnimationReferenceRewrite[],
): void {
  pattern.regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.regex.exec(source))) {
    const valueRange = getNamedGroupRange(match, "value");
    if (!valueRange) {
      continue;
    }

    const rawValue = source.slice(valueRange[0], valueRange[1]);
    const rewrittenValue = pattern.rewriteValue(rawValue, keyframes);
    if (rewrittenValue === undefined || rewrittenValue === rawValue) {
      continue;
    }

    rewrites.push({
      start: valueRange[0],
      end: valueRange[1],
      kind: pattern.kind,
      rawText: rawValue,
      text: rewrittenValue,
    });
  }
}

export function applyPlannedAnimationReferenceRewrites(
  source: string,
  rewrites: PlannedAnimationReferenceRewrite[],
): string {
  let code = source;
  for (let index = rewrites.length - 1; index >= 0; index--) {
    const rewrite = rewrites[index];
    code = `${code.slice(0, rewrite.start)}${rewrite.text}${code.slice(rewrite.end)}`;
  }

  return code;
}

function applyPlannedAnimationReferenceRewritesToMagicString(
  s: MagicString,
  rewrites: PlannedAnimationReferenceRewrite[],
): void {
  for (const rewrite of rewrites) {
    s.overwrite(rewrite.start, rewrite.end, rewrite.text);
  }
}

function getNamedGroupRange(
  match: RegExpExecArray,
  groupName: string,
): [number, number] | undefined {
  const groupIndices = match.indices?.groups?.[groupName];
  return groupIndices ? [groupIndices[0], groupIndices[1]] : undefined;
}

function rewriteNormalizedAnimationDeclarationValue(
  rawValue: string,
  keyframes: Record<string, string>,
  rewriteValue: (value: string, keyframes: Record<string, string>) => string,
): string | undefined {
  const leadingMatch = rawValue.match(/^\s*/);
  const trailingMatch = rawValue.match(/\s*$/);
  const leading = leadingMatch ? leadingMatch[0] : "";
  const trailing = trailingMatch ? trailingMatch[0] : "";
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const rewrittenValue = rewriteValue(trimmedValue, keyframes);
  return rewrittenValue === trimmedValue ? undefined : `${leading}${rewrittenValue}${trailing}`;
}
