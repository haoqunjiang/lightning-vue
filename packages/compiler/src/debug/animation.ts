import {
  applyPlannedAnimationReferenceRewrites,
  planNormalizedAnimationReferenceRewrites,
  type PlannedAnimationReferenceRewrite,
} from "../style/lightningcss/scoped/animation";

export interface AnimationRewriteTraceCase {
  keyframes: Record<string, string>;
  source: string;
  title: string;
}

export interface AnimationRewriteTrace {
  finalCode: string;
  keyframes: string[];
  rewrites: string[];
  source: string;
}

export const animationRewriteTraceCases: AnimationRewriteTraceCase[] = [
  {
    title: "animation shorthand and keyframes",
    source: `.card[data-v-trace]{animation:fade 1s;}
@keyframes fade{from{opacity:0}to{opacity:1}}`,
    keyframes: {
      fade: "fade-trace",
    },
  },
  {
    title: "animation-name declarations keep surrounding whitespace",
    source: `.card[data-v-trace]{
  animation-name:  fade;
  -webkit-animation-name: "fade";
}`,
    keyframes: {
      fade: "fade-trace",
    },
  },
];

export function traceAnimationRewrite(
  source: string,
  keyframes: Record<string, string>,
): AnimationRewriteTrace {
  const rewrites = planNormalizedAnimationReferenceRewrites(source, keyframes);
  return {
    source,
    keyframes: Object.entries(keyframes).map(([from, to]) => `${from} -> ${to}`),
    rewrites: rewrites.map(formatAnimationRewrite),
    finalCode: applyPlannedAnimationReferenceRewrites(source, rewrites),
  };
}

export function formatAnimationRewriteTrace(trace: AnimationRewriteTrace): string {
  return [
    `source: ${trace.source}`,
    "",
    "keyframes:",
    ...trace.keyframes.map((line) => `  - ${line}`),
    "",
    "rewrites:",
    ...trace.rewrites.map((line) => `  - ${line}`),
    "",
    `final: ${trace.finalCode}`,
  ].join("\n");
}

function formatAnimationRewrite(rewrite: PlannedAnimationReferenceRewrite): string {
  return `${rewrite.kind} [${rewrite.start}, ${rewrite.end}) ${JSON.stringify(rewrite.rawText)} -> ${JSON.stringify(rewrite.text)}`;
}
