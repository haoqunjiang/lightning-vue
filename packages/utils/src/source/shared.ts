export type CssBlockKind = "at-rule" | "keyframes" | "style";

const keyframesPreludeRE = /^@(?:-\w+-)?keyframes\b/i;

export function getCssBlockKind(prelude: string): CssBlockKind {
  if (!prelude.startsWith("@")) {
    return "style";
  }

  if (keyframesPreludeRE.test(prelude)) {
    return "keyframes";
  }
  return "at-rule";
}

export function normalizeBlockPrelude(prelude: string): string {
  return stripCssComments(prelude).trim();
}

function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ");
}
